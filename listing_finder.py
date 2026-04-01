#!/usr/bin/env python3
"""
Listing Finder — Micro SaaS Proof of Concept
=============================================
Takes an Airbnb listing hero image and finds every other place that
property lives online — with a focus on PMS/direct-booking pages
that expose the host's contact information (email, phone).

Pipeline:
  1. Extract hero image from an Airbnb URL  (or accept image URL directly)
  2. Run reverse image search               (SerpApi Google Lens OR Google Vision API)
  3. Detect PMS/booking platform per result
  4. Scrape contact info from direct-booking hits
  5. Return a structured JSON report

Usage:
  python listing_finder.py --url   "https://www.airbnb.com/rooms/12345"
  python listing_finder.py --image "https://example.com/hero.jpg"
  python listing_finder.py --demo                   # works with no API keys

API keys (set below or via environment variables):
  SERPAPI_KEY          — https://serpapi.com  (100 free searches on sign-up)
  GOOGLE_VISION_KEY    — https://console.cloud.google.com/apis/credentials
                         (1 000 images free per month)

Either key enables the live search; the script falls back gracefully to
demo mode if neither is present.
"""

import os
import re
import sys
import json
import time
import argparse
import textwrap
import requests
from urllib.parse import urlparse
from bs4 import BeautifulSoup
from dataclasses import dataclass, field, asdict
from typing import Optional
from datetime import datetime

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION  (override with environment variables or edit directly)
# ─────────────────────────────────────────────────────────────────────────────

SERPAPI_KEY       = os.getenv("SERPAPI_KEY", "")
GOOGLE_VISION_KEY = os.getenv("GOOGLE_VISION_KEY", "")

# A publicly-reachable vacation-rental photo used in --demo mode
DEMO_IMAGE_URL = (
    "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2"
    "?w=1280&q=80"
)

REQUEST_TIMEOUT = 12   # seconds per HTTP request
THROTTLE_DELAY  = 0.6  # seconds between outbound scrape requests (be polite)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

# ─────────────────────────────────────────────────────────────────────────────
# PMS / BOOKING-ENGINE PLATFORM FINGERPRINTS
# Each entry: name → list of URL substrings that identify the platform.
# Order matters only for readability; all patterns are checked per URL.
# ─────────────────────────────────────────────────────────────────────────────

PMS_PLATFORMS: list[dict] = [
    # ── Fully-hosted booking engines / PMS white-label sites ──────────────
    {"name": "Lodgify",          "patterns": ["lodgify.com"]},
    {"name": "OwnerRez",         "patterns": ["ownerrez.com", "ownr.es"]},
    {"name": "Hostaway",         "patterns": ["hostaway.com"]},
    {"name": "Guesty",           "patterns": ["guesty.com"]},
    {"name": "Hostfully",        "patterns": ["hostfully.com"]},
    {"name": "Hospitable",       "patterns": ["hospitable.com"]},
    {"name": "Smoobu",           "patterns": ["smoobu.com"]},
    {"name": "iGMS",             "patterns": ["igms.com"]},
    {"name": "Tokeet",           "patterns": ["tokeet.com"]},
    {"name": "Uplisting",        "patterns": ["uplisting.io"]},
    {"name": "Supercontrol",     "patterns": ["supercontrol.co.uk", "supercontrol.com"]},
    {"name": "LiveRez",          "patterns": ["liverez.com"]},
    {"name": "Barefoot",         "patterns": ["barefoot.com", "barefootagent.com"]},
    {"name": "Streamline VRS",   "patterns": ["streamlinevrs.com", "streamlinevacationrentals.com"]},
    {"name": "Kigo",             "patterns": ["kigo.net"]},
    {"name": "Track HS",         "patterns": ["trackhs.com"]},
    {"name": "Avantio",          "patterns": ["avantio.com", "avantio.es"]},
    {"name": "BookingSync",      "patterns": ["bookingsync.com"]},
    {"name": "Escapia",          "patterns": ["escapia.com"]},
    {"name": "Rentlio",          "patterns": ["rentl.io", "rentlio.com"]},
    {"name": "Rentals United",   "patterns": ["rentalsunited.com"]},
    {"name": "MyVR",             "patterns": ["myvr.com"]},
    {"name": "Beds24",           "patterns": ["beds24.com"]},
    {"name": "Cloudbeds",        "patterns": ["cloudbeds.com"]},
    {"name": "Hostex",           "patterns": ["hostex.io"]},
    {"name": "Zeevou",           "patterns": ["zeevou.com"]},
    {"name": "RentalWise",       "patterns": ["rentalwise.com"]},
    # ── OTA competitors (useful intelligence, but NOT direct booking) ──────
    {"name": "VRBO / HomeAway",  "patterns": ["vrbo.com", "homeaway.com"]},
    {"name": "Booking.com",      "patterns": ["booking.com"]},
    {"name": "TripAdvisor",      "patterns": ["tripadvisor.com", "flipkey.com"]},
    {"name": "Vacasa",           "patterns": ["vacasa.com"]},
    {"name": "TurnKey",          "patterns": ["turnkeyvr.com"]},
    {"name": "Evolve",           "patterns": ["evolvevacationrental.com"]},
    {"name": "Plum Guide",       "patterns": ["plumguide.com"]},
    {"name": "Expedia",          "patterns": ["expedia.com", "hotels.com"]},
    # ── Query-string hints (embedded widgets on custom domains) ───────────
    {"name": "Direct Widget",    "patterns": ["?checkin=", "?check_in=", "?booking_id=",
                                               "?availability=", "/book-now", "/reserve"]},
]

# Names of OTA platforms — we track them but flag differently from direct
OTA_NAMES: set[str] = {
    "VRBO / HomeAway", "Booking.com", "TripAdvisor",
    "Vacasa", "TurnKey", "Evolve", "Plum Guide", "Expedia",
}

# Domains to skip entirely
SKIP_DOMAINS: set[str] = {
    "airbnb.com", "airbnb.co.uk", "airbnb.com.au",
    "google.com", "facebook.com", "instagram.com",
    "twitter.com", "x.com", "youtube.com", "pinterest.com",
    "reddit.com", "yelp.com", "linkedin.com",
}

# ─────────────────────────────────────────────────────────────────────────────
# DATA STRUCTURES
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class ListingMatch:
    url:              str
    domain:           str
    platform:         Optional[str]
    is_direct:        bool          # True = direct booking or PMS (not OTA)
    page_title:       str  = ""
    emails:           list = field(default_factory=list)
    phones:           list = field(default_factory=list)
    error:            Optional[str] = None


@dataclass
class Report:
    image_url:           str
    timestamp:           str
    total_pages_found:   int
    direct_booking_hits: int
    ota_hits:            int
    unknown_hits:        int
    contact_summary:     dict = field(default_factory=dict)
    matches:             list = field(default_factory=list)


# ─────────────────────────────────────────────────────────────────────────────
# STEP 1 — EXTRACT HERO IMAGE FROM AIRBNB LISTING
# ─────────────────────────────────────────────────────────────────────────────

def get_airbnb_hero_image(airbnb_url: str) -> Optional[str]:
    """
    Try several strategies to pull the main listing photo URL.
    Returns the image URL string, or None on failure.

    Note: Airbnb is heavily JS-rendered; og:image is the most reliable
    approach without a headless browser.
    """
    listing_id_match = re.search(r"/rooms/(\d+)", airbnb_url)
    if not listing_id_match:
        _warn("Could not parse a listing ID from that URL")
        return None

    listing_id = listing_id_match.group(1)
    _info(f"Airbnb listing ID → {listing_id}")

    # ── Strategy A: og:image meta tag (works without JS) ─────────────────
    try:
        resp = requests.get(airbnb_url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        soup = BeautifulSoup(resp.text, "html.parser")

        og = soup.find("meta", property="og:image")
        if og and og.get("content"):
            _ok(f"Hero image via og:image → {og['content'][:80]}")
            return og["content"]

        # ── Strategy B: JSON-LD schema ────────────────────────────────────
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string or "{}")
                imgs = data.get("image", [])
                if isinstance(imgs, str):
                    imgs = [imgs]
                if imgs:
                    _ok(f"Hero image via schema.org → {imgs[0][:80]}")
                    return imgs[0]
            except Exception:
                pass

    except Exception as e:
        _warn(f"HTML fetch failed: {e}")

    # ── Strategy C: Unofficial Airbnb API (may break without warning) ─────
    api_url = (
        f"https://www.airbnb.com/api/v2/listings/{listing_id}"
        "?_format=for_rooms_show&key=d306zoyjsyarp7ifhu67rjxn52tv0t20"
    )
    try:
        resp = requests.get(api_url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        photos = resp.json().get("listing", {}).get("photos", [])
        if photos:
            url = photos[0].get("xl_picture_url") or photos[0].get("picture_url", "")
            if url:
                _ok(f"Hero image via Airbnb API → {url[:80]}")
                return url
    except Exception as e:
        _warn(f"Airbnb API fallback failed: {e}")

    _warn("Could not extract a hero image from this listing URL.")
    return None


# ─────────────────────────────────────────────────────────────────────────────
# STEP 2 — REVERSE IMAGE SEARCH
# ─────────────────────────────────────────────────────────────────────────────

def reverse_search_serpapi(image_url: str) -> list[dict]:
    """
    Use SerpApi's Google Lens endpoint.
    Docs: https://serpapi.com/google-lens-api
    Pricing: $50/mo for 5 000 searches; 100 free on sign-up.
    """
    if not SERPAPI_KEY:
        _warn("SERPAPI_KEY not set — skipping SerpApi search")
        return []

    _info("Running SerpApi Google Lens reverse image search…")
    try:
        params = {"engine": "google_lens", "url": image_url, "api_key": SERPAPI_KEY}
        resp = requests.get("https://serpapi.com/search", params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        _warn(f"SerpApi request failed: {e}")
        return []

    results = []
    for item in data.get("visual_matches", []):
        if item.get("link"):
            results.append({"url": item["link"], "title": item.get("title", ""), "source": "visual"})

    for item in data.get("exact_matches", []):
        if item.get("link"):
            results.append({"url": item["link"], "title": item.get("title", ""), "source": "exact"})

    _ok(f"SerpApi → {len(results)} results")
    return results


def reverse_search_vision_api(image_url: str) -> list[dict]:
    """
    Use Google Cloud Vision webDetection.
    Docs: https://cloud.google.com/vision/docs/detecting-web
    Pricing: first 1 000 units/month free, then $1.50 / 1 000.
    """
    if not GOOGLE_VISION_KEY:
        _warn("GOOGLE_VISION_KEY not set — skipping Vision API search")
        return []

    _info("Running Google Vision webDetection…")
    endpoint = f"https://vision.googleapis.com/v1/images:annotate?key={GOOGLE_VISION_KEY}"
    payload = {
        "requests": [{
            "image": {"source": {"imageUri": image_url}},
            "features": [{"type": "WEB_DETECTION", "maxResults": 50}],
        }]
    }
    try:
        resp = requests.post(endpoint, json=payload, timeout=30)
        resp.raise_for_status()
        web = resp.json().get("responses", [{}])[0].get("webDetection", {})
    except Exception as e:
        _warn(f"Vision API request failed: {e}")
        return []

    results = []
    for page in web.get("pagesWithMatchingImages", []):
        if page.get("url"):
            results.append({"url": page["url"], "title": page.get("pageTitle", ""), "source": "vision"})

    _ok(f"Vision API → {len(results)} results")
    return results


# ─────────────────────────────────────────────────────────────────────────────
# STEP 3 — PLATFORM DETECTION
# ─────────────────────────────────────────────────────────────────────────────

def detect_platform(url: str) -> Optional[str]:
    """Return the name of the matched PMS/OTA platform, or None."""
    lower = url.lower()
    for platform in PMS_PLATFORMS:
        for pattern in platform["patterns"]:
            if pattern in lower:
                return platform["name"]
    return None


def is_direct_booking(platform: Optional[str]) -> bool:
    """True if the platform is a PMS/direct-booking engine (not an OTA)."""
    if platform is None:
        return True   # unknown = could be a custom direct-booking site
    return platform not in OTA_NAMES


# ─────────────────────────────────────────────────────────────────────────────
# STEP 4 — CONTACT INFO EXTRACTION
# ─────────────────────────────────────────────────────────────────────────────

_EMAIL_RE = re.compile(
    r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,7}\b"
)
_PHONE_RE = re.compile(
    r"(?:"
    r"\+?1[\s.\-]?"              # optional US country code
    r")?(?:\(?\d{3}\)?[\s.\-]?"  # area code
    r"\d{3}[\s.\-]?\d{4}"        # 7-digit local
    r"|\+\d{1,3}[\s.\-]?"        # international prefix
    r"(?:\(?\d{1,4}\)?[\s.\-])?" # optional group
    r"\d{1,4}[\s.\-]\d{1,4}"     # number body
    r"(?:[\s.\-]\d{1,9})?"       # optional extension
    r")"
)

_JUNK_EMAIL_DOMAINS = {
    "example.com", "domain.com", "email.com", "test.com",
    "yoursite.com", "yourdomain.com", "sentry.io", "wixpress.com",
    "schema.org", "w3.org",
}

_CONTACT_SUBPATHS = ["/contact", "/contact-us", "/about", "/about-us", "/reach-us"]


def _clean_emails(raw: set[str]) -> list[str]:
    out = []
    for e in raw:
        e = e.strip()
        if len(e) > 80:
            continue
        domain = e.split("@")[-1].lower()
        if domain in _JUNK_EMAIL_DOMAINS:
            continue
        if re.search(r"\.(png|jpg|jpeg|gif|svg|webp)$", e, re.I):
            continue
        out.append(e)
    return sorted(set(out))


def _clean_phones(raw: list[str]) -> list[str]:
    out = []
    for p in raw:
        digits = re.sub(r"\D", "", p)
        if len(digits) < 10 or len(digits) > 15:
            continue
        out.append(p.strip())
    return list(dict.fromkeys(out))[:10]


def _extract_from_html(html: str, text: str) -> tuple[list[str], list[str]]:
    emails = _clean_emails(set(_EMAIL_RE.findall(html)))
    phones = _clean_phones(_PHONE_RE.findall(text))
    return emails, phones


def _extract_schema_contacts(soup: BeautifulSoup) -> tuple[list[str], list[str]]:
    emails, phones = [], []
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "{}")
            if isinstance(data, dict):
                if "telephone" in data:
                    phones.append(str(data["telephone"]))
                if "email" in data:
                    emails.append(str(data["email"]))
        except Exception:
            pass
    return emails, phones


def scrape_contact_info(url: str) -> dict:
    """
    Fetch a page (and optionally its /contact sub-page) and extract
    email addresses and phone numbers.
    """
    result: dict = {"emails": [], "phones": [], "title": "", "error": None}

    def _fetch_and_parse(target_url: str) -> Optional[tuple[BeautifulSoup, str, str]]:
        try:
            r = requests.get(target_url, headers=HEADERS,
                             timeout=REQUEST_TIMEOUT, allow_redirects=True)
            if r.status_code != 200:
                return None
            soup = BeautifulSoup(r.text, "html.parser")
            return soup, r.text, soup.get_text(separator=" ")
        except Exception:
            return None

    parsed = urlparse(url)
    base = f"{parsed.scheme}://{parsed.netloc}"

    fetched = _fetch_and_parse(url)
    if fetched is None:
        result["error"] = "Could not fetch page"
        return result

    soup, html, text = fetched
    result["title"] = soup.title.string.strip() if soup.title else ""

    emails, phones = _extract_from_html(html, text)
    se, sp = _extract_schema_contacts(soup)
    emails += se
    phones += sp

    # If we found nothing, try contact sub-pages
    if not emails and not phones:
        for subpath in _CONTACT_SUBPATHS:
            sub = _fetch_and_parse(base + subpath)
            if sub is None:
                continue
            s_soup, s_html, s_text = sub
            e2, p2 = _extract_from_html(s_html, s_text)
            se2, sp2 = _extract_schema_contacts(s_soup)
            emails += e2 + se2
            phones += p2 + sp2
            if emails or phones:
                break

    result["emails"] = _clean_emails(set(emails))
    result["phones"] = _clean_phones(phones)
    return result


# ─────────────────────────────────────────────────────────────────────────────
# STEP 5 — ORCHESTRATION & REPORT
# ─────────────────────────────────────────────────────────────────────────────

def run_pipeline(image_url: str, output_path: str = "report.json") -> Report:
    _header("LISTING FINDER — Reverse Image Pipeline")
    _info(f"Image URL: {image_url[:90]}…")

    # ── Reverse image search ──────────────────────────────────────────────
    raw: list[dict] = []
    raw += reverse_search_serpapi(image_url)
    if not raw:
        raw += reverse_search_vision_api(image_url)
    if not raw:
        _warn("No API key active — running in DEMO mode with sample results")
        raw = _demo_results()

    _info(f"Processing {len(raw)} candidate URLs…\n")

    matches: list[ListingMatch] = []
    seen_domains: set[str] = set()

    for item in raw:
        url = (item.get("url") or "").strip()
        if not url.startswith("http"):
            continue

        parsed   = urlparse(url)
        domain   = parsed.netloc.lstrip("www.")

        # Deduplicate by domain
        if domain in seen_domains:
            continue
        seen_domains.add(domain)

        # Skip noise
        if any(skip in domain for skip in SKIP_DOMAINS):
            continue

        platform = detect_platform(url)
        direct   = is_direct_booking(platform)

        tag = "✅ DIRECT" if (direct and platform) else ("🔁 OTA" if platform in OTA_NAMES else "❓ UNKNOWN")
        print(f"  {tag}  {domain[:45]:<45}  {platform or '—'}")

        # Scrape contact info (only for non-OTA pages)
        contact = {"emails": [], "phones": [], "title": "", "error": None}
        if direct or platform is None:
            contact = scrape_contact_info(url)
            time.sleep(THROTTLE_DELAY)

        matches.append(ListingMatch(
            url=url,
            domain=domain,
            platform=platform,
            is_direct=direct,
            page_title=contact["title"],
            emails=contact["emails"],
            phones=contact["phones"],
            error=contact["error"],
        ))

    # ── Build report ──────────────────────────────────────────────────────
    all_emails: list[str] = []
    all_phones: list[str] = []
    for m in matches:
        if m.is_direct:
            all_emails.extend(m.emails)
            all_phones.extend(m.phones)

    report = Report(
        image_url=image_url,
        timestamp=datetime.now().isoformat(),
        total_pages_found=len(matches),
        direct_booking_hits=sum(1 for m in matches if m.is_direct and m.platform and m.platform not in OTA_NAMES),
        ota_hits=sum(1 for m in matches if m.platform in OTA_NAMES),
        unknown_hits=sum(1 for m in matches if not m.platform),
        contact_summary={
            "emails": list(dict.fromkeys(all_emails)),
            "phones": list(dict.fromkeys(all_phones)),
        },
        matches=[asdict(m) for m in matches],
    )

    # ── Print summary ─────────────────────────────────────────────────────
    print()
    _header("RESULTS SUMMARY")
    print(f"  Total pages found    : {report.total_pages_found}")
    print(f"  Direct booking hits  : {report.direct_booking_hits}")
    print(f"  OTA listings         : {report.ota_hits}")
    print(f"  Unknown sources      : {report.unknown_hits}")
    print()
    print("  HOST CONTACT INFO (from direct-booking pages):")
    if report.contact_summary["emails"]:
        for e in report.contact_summary["emails"]:
            print(f"    📧  {e}")
    else:
        print("    — no emails found —")
    if report.contact_summary["phones"]:
        for p in report.contact_summary["phones"]:
            print(f"    📞  {p}")
    else:
        print("    — no phone numbers found —")

    # ── Save JSON report ──────────────────────────────────────────────────
    with open(output_path, "w") as f:
        json.dump(asdict(report), f, indent=2)
    _ok(f"Full report saved → {output_path}")

    return report


# ─────────────────────────────────────────────────────────────────────────────
# DEMO DATA  (returned when no API key is configured)
# ─────────────────────────────────────────────────────────────────────────────

def _demo_results() -> list[dict]:
    """
    Simulates what Google Lens / Vision API would return for a vacation-rental
    image that appears across multiple platforms.
    """
    return [
        {"url": "https://bluewavecottage.lodgify.com/",                      "title": "Blue Wave Cottage — Book Direct"},
        {"url": "https://book.ownerrez.com/ro/bluewavecottage",               "title": "Blue Wave Cottage | OwnerRez"},
        {"url": "https://www.vrbo.com/1234567",                               "title": "Blue Wave Cottage | VRBO"},
        {"url": "https://www.booking.com/hotel/us/blue-wave-cottage.html",    "title": "Blue Wave Cottage on Booking.com"},
        {"url": "https://bluewavecottage.com/book",                           "title": "Blue Wave Cottage — Direct Reservations"},
        {"url": "https://www.tripadvisor.com/VacationRentalReview-d12345",    "title": "Blue Wave Cottage | TripAdvisor"},
        {"url": "https://bluewavecottage.hostaway.com/",                      "title": "Blue Wave Cottage | Hostaway"},
    ]


# ─────────────────────────────────────────────────────────────────────────────
# LOGGING HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _header(msg: str) -> None:
    print(f"\n{'─'*62}\n  {msg}\n{'─'*62}")

def _info(msg: str) -> None:
    print(f"  [·] {msg}")

def _ok(msg: str) -> None:
    print(f"  [✓] {msg}")

def _warn(msg: str) -> None:
    print(f"  [!] {msg}", file=sys.stderr)


# ─────────────────────────────────────────────────────────────────────────────
# CLI ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        prog="listing_finder",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        description=textwrap.dedent("""\
            Listing Finder — find every platform where a property appears.

            Examples:
              python listing_finder.py --url   "https://www.airbnb.com/rooms/12345"
              python listing_finder.py --image "https://cdn.example.com/hero.jpg"
              python listing_finder.py --demo
        """),
    )
    parser.add_argument("--url",    help="Airbnb listing URL")
    parser.add_argument("--image",  help="Direct image URL (skips Airbnb extraction)")
    parser.add_argument("--demo",   action="store_true", help="Run with demo data (no API key needed)")
    parser.add_argument("--output", default="report.json", metavar="FILE",
                        help="Path to write the JSON report (default: report.json)")
    args = parser.parse_args()

    image_url: Optional[str] = None

    if args.demo:
        image_url = DEMO_IMAGE_URL
        _info(f"[DEMO MODE] Using built-in test image")
    elif args.image:
        image_url = args.image
    elif args.url:
        _info("Extracting hero image from Airbnb listing…")
        image_url = get_airbnb_hero_image(args.url)
        if not image_url:
            sys.exit("Could not extract hero image. Try --image <url> directly.")
    else:
        parser.print_help()
        sys.exit(0)

    run_pipeline(image_url, output_path=args.output)


if __name__ == "__main__":
    main()
