"""
Listing Finder — Vercel Serverless API
======================================
Flask app deployed as a Vercel Python serverless function.
All requests to /api/* are routed here via vercel.json.

Environment variables (set in Vercel project settings):
  SERPAPI_KEY        — https://serpapi.com  (100 free searches on sign-up)
  GOOGLE_VISION_KEY  — https://console.cloud.google.com  (1 000 free/month)
"""

import os
import re
import json
import time
import requests
from urllib.parse import urlparse
from bs4 import BeautifulSoup
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ── Config ────────────────────────────────────────────────────────────────────

SERPAPI_KEY       = os.environ.get("SERPAPI_KEY", "")
GOOGLE_VISION_KEY = os.environ.get("GOOGLE_VISION_KEY", "")

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}
REQUEST_TIMEOUT = 10   # seconds — keep under Vercel's 30s function limit
THROTTLE_DELAY  = 0.3  # seconds between scrape requests

# ── PMS Platform Fingerprints ─────────────────────────────────────────────────

PMS_PLATFORMS = [
    {"name": "Lodgify",         "patterns": ["lodgify.com"]},
    {"name": "OwnerRez",        "patterns": ["ownerrez.com", "ownr.es"]},
    {"name": "Hostaway",        "patterns": ["hostaway.com"]},
    {"name": "Guesty",          "patterns": ["guesty.com"]},
    {"name": "Hostfully",       "patterns": ["hostfully.com"]},
    {"name": "Hospitable",      "patterns": ["hospitable.com"]},
    {"name": "Smoobu",          "patterns": ["smoobu.com"]},
    {"name": "iGMS",            "patterns": ["igms.com"]},
    {"name": "Tokeet",          "patterns": ["tokeet.com"]},
    {"name": "Uplisting",       "patterns": ["uplisting.io"]},
    {"name": "Supercontrol",    "patterns": ["supercontrol.co.uk", "supercontrol.com"]},
    {"name": "LiveRez",         "patterns": ["liverez.com"]},
    {"name": "Barefoot",        "patterns": ["barefoot.com", "barefootagent.com"]},
    {"name": "Streamline VRS",  "patterns": ["streamlinevrs.com"]},
    {"name": "Kigo",            "patterns": ["kigo.net"]},
    {"name": "Track HS",        "patterns": ["trackhs.com"]},
    {"name": "Avantio",         "patterns": ["avantio.com", "avantio.es"]},
    {"name": "Beds24",          "patterns": ["beds24.com"]},
    {"name": "Cloudbeds",       "patterns": ["cloudbeds.com"]},
    {"name": "Hostex",          "patterns": ["hostex.io"]},
    {"name": "Zeevou",          "patterns": ["zeevou.com"]},
    {"name": "MyVR",            "patterns": ["myvr.com"]},
    {"name": "RentalWise",      "patterns": ["rentalwise.com"]},
    {"name": "HolidayFuture",   "patterns": ["holidayfuture.com"]},
    {"name": "BookingWithEase", "patterns": ["bookingwithease.com"]},
    {"name": "Escapia",         "patterns": ["escapia.com"]},
    {"name": "Ciirus",          "patterns": ["ciirus.com"]},
    {"name": "Rezkit",          "patterns": ["rezkit.com"]},
    {"name": "Rentlio",         "patterns": ["rentlio.com"]},
    {"name": "iCal (generic)",  "patterns": [".ical.ics"]},
    # OTAs — tracked but contact info not scraped (include country variants)
    {"name": "VRBO",            "patterns": ["vrbo.com", "vrbo.ca", "homeaway.com", "homeaway.ca"]},
    {"name": "Booking.com",     "patterns": ["booking.com"]},
    {"name": "TripAdvisor",     "patterns": ["tripadvisor.com", "tripadvisor.ca", "tripadvisor.co.uk", "flipkey.com"]},
    {"name": "Vacasa",          "patterns": ["vacasa.com", "vacasa.ca"]},
    {"name": "Evolve",          "patterns": ["evolvevacationrental.com"]},
    {"name": "Expedia",         "patterns": ["expedia.com", "expedia.ca", "expedia.co.uk", "hotels.com"]},
    {"name": "Plum Guide",      "patterns": ["plumguide.com"]},
    {"name": "AvantStay",       "patterns": ["avantstay.com"]},
    {"name": "Kid & Coe",       "patterns": ["kidandcoe.com"]},
    {"name": "Sonder",          "patterns": ["sonder.com"]},
    {"name": "Mint House",      "patterns": ["minthouse.com"]},
    {"name": "Onefinestay",     "patterns": ["onefinestay.com"]},
]

OTA_NAMES = {
    "VRBO", "Booking.com", "TripAdvisor", "Vacasa", "Evolve",
    "Expedia", "Plum Guide", "AvantStay", "Kid & Coe",
    "Sonder", "Mint House", "Onefinestay",
}

SKIP_DOMAINS = {
    "airbnb.com", "airbnb.co.uk", "airbnb.com.au",
    "google.com", "facebook.com", "instagram.com",
    "twitter.com", "x.com", "youtube.com", "pinterest.com",
    "reddit.com", "yelp.com", "linkedin.com", "tiktok.com",
    # Real estate aggregators — almost always false positives
    "redfin.com", "realtor.com", "zillow.com", "trulia.com",
    "homes.com", "point2homes.com", "remax.com", "century21.com",
    "coldwellbanker.com", "compass.com", "movoto.com",
    # E-commerce / retail noise (furniture, decor, appliances that match image)
    "amazon.com", "amazon.ca", "wayfair.com", "ikea.com",
    "homedepot.com", "lowes.com", "ebay.com", "etsy.com",
    "walmart.com", "target.com", "alibaba.com", "aliexpress.com",
    "electricfireplacesdepot.com", "ignisproducts.com", "marxfireplaces.com",
    # Error tracking / analytics noise
    "sentry.io", "sentry.wixpress.com", "wixpress.com", "wix.com",
    "googleapis.com", "gstatic.com", "cloudflare.com",
    # Image hosts
    "imgur.com", "flickr.com", "500px.com", "unsplash.com",
}

# ── Helpers ───────────────────────────────────────────────────────────────────

_EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,7}\b")
_PHONE_RE = re.compile(
    r"(?:\+?1[\s.\-]?)?(?:\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}"
    r"|\+\d{1,3}[\s.\-]?(?:\(?\d{1,4}\)?[\s.\-])?\d{1,4}[\s.\-]\d{1,9})"
)
_JUNK_DOMAINS = {
    "example.com", "domain.com", "email.com", "test.com",
    "yoursite.com", "yourdomain.com", "sentry.io", "wixpress.com",
    "sentry.wixpress.com", "schema.org", "w3.org",
    # Amazon / AWS service emails
    "amazon.com", "amazonaws.com", "amazonses.com",
    # Real estate aggregator emails
    "redfin.com", "realtor.com", "zillow.com", "remax.com",
    "compass.com", "century21.com", "coldwellbanker.com",
    # Furniture / appliance retailers
    "electricfireplacesdepot.com", "ignisproducts.com", "marxfireplaces.com",
    "wayfair.com", "ikea.com", "homedepot.com", "lowes.com",
    # Email service noise
    "sendgrid.net", "mailchimp.com", "mailgun.org", "postmark.com",
    # OTA / aggregator emails (not the host)
    "avantstay.com", "vacasa.com", "evolvevacationrental.com",
    "booking.com", "airbnb.com", "vrbo.com", "expedia.com",
}

# Common webmail providers — accepted even when they don't match page domain,
# but only if the email isn't already a "noreply"/"support" style
_WEBMAIL_DOMAINS = {
    "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
    "icloud.com", "me.com", "live.com", "aol.com", "protonmail.com",
    "proton.me", "yahoo.ca", "hotmail.ca",
}

# Suspicious email local-parts that indicate junk/service accounts
_JUNK_LOCAL_PARTS = {
    "noreply", "no-reply", "donotreply", "do-not-reply", "admin",
    "webmaster", "postmaster", "api-services-support", "aws-support",
}


def detect_platform(url: str):
    lower = url.lower()
    for p in PMS_PLATFORMS:
        for pat in p["patterns"]:
            if pat in lower:
                return p["name"]
    return None


def clean_emails(raw, page_domain: str = ""):
    """
    Filter emails aggressively to remove false positives.

    Rules:
      1. Drop unicode-escape artifacts (u003e, \\u003c, etc.)
      2. Drop long hex strings (Sentry IDs, tracking beacons)
      3. Drop known junk domains (retailers, aggregators, error tracking)
      4. Drop junk local parts (noreply, api-services-support, etc.)
      5. Keep only emails that EITHER:
         - match the page's own domain (strong signal host owns it), OR
         - use a major webmail provider (gmail, outlook, etc.) — these are
           usually real contact emails hosts publish
    """
    out = []
    page_root = _root_domain(page_domain)

    for e in raw:
        e = e.strip().lower()

        # Length check
        if len(e) > 80 or len(e) < 6:
            continue

        # Filter unicode-escape artifacts like "u003esales@..."
        if re.match(r"^u00[0-9a-f]{2}", e):
            continue
        if "\\u" in e or "u003" in e.split("@")[0]:
            continue

        # Filter out emails with obviously-invalid characters
        if re.search(r"[^a-z0-9._%+\-@]", e):
            continue

        local, _, domain = e.partition("@")

        # Filter long hex strings (Sentry event IDs, tracking beacons)
        if len(local) >= 24 and re.fullmatch(r"[a-f0-9]+", local):
            continue

        # Filter asset file extensions
        if re.search(r"\.(png|jpg|jpeg|gif|svg|webp|css|js|woff2?)$", e, re.I):
            continue

        # Domain blocklist
        if domain in _JUNK_DOMAINS:
            continue
        # Subdomain check against junk domains (e.g., *.sentry.io)
        if any(domain.endswith("." + jd) for jd in _JUNK_DOMAINS):
            continue

        # Junk local parts
        if local in _JUNK_LOCAL_PARTS:
            continue

        # Domain-match OR webmail requirement — the core filter that kills
        # cross-site noise (Amazon support scripts, third-party trackers)
        root = _root_domain(domain)
        is_page_match = page_root and (root == page_root)
        is_webmail = domain in _WEBMAIL_DOMAINS
        if not (is_page_match or is_webmail):
            continue

        out.append(e)

    return list(dict.fromkeys(out))[:3]  # max 3 per page


def _root_domain(host: str) -> str:
    """Return the registrable root domain for comparison (example.co.uk → co.uk
    isn't perfect, but good enough: drops the leftmost subdomain)."""
    if not host:
        return ""
    host = host.lower().lstrip("www.")
    parts = host.split(".")
    if len(parts) <= 2:
        return host
    # crude — keep last 2 labels, good enough for our purpose
    return ".".join(parts[-2:])


def clean_phones(raw):
    out = []
    for p in raw:
        digits = re.sub(r"\D", "", p)
        if 10 <= len(digits) <= 15:
            out.append(p.strip())
    return list(dict.fromkeys(out))[:8]


def _decode_unicode_escapes(s: str) -> str:
    """Decode JSON-style \\u003e escapes and HTML entities so regex matching
    works on the actual text. Fixes the 'u003esales@...' bug."""
    if not s:
        return s
    # JSON unicode escapes (common in Next.js / JSON-LD blobs)
    try:
        s = re.sub(r"\\u([0-9a-fA-F]{4})", lambda m: chr(int(m.group(1), 16)), s)
    except Exception:
        pass
    # HTML entities (&amp; &gt; etc.)
    try:
        import html as _html
        s = _html.unescape(s)
    except Exception:
        pass
    return s


def scrape_contact(url: str) -> dict:
    result = {"emails": [], "phones": [], "title": "", "error": None}
    parsed = urlparse(url)
    base = f"{parsed.scheme}://{parsed.netloc}"
    page_domain = parsed.netloc

    def fetch(target):
        try:
            r = requests.get(target, headers=HEADERS, timeout=REQUEST_TIMEOUT, allow_redirects=True)
            if r.status_code == 200:
                # Decode unicode escapes BEFORE parsing / regex
                html_decoded = _decode_unicode_escapes(r.text)
                soup = BeautifulSoup(html_decoded, "html.parser")
                return soup, html_decoded, soup.get_text(" ")
        except Exception:
            pass
        return None, None, None

    soup, html, text = fetch(url)
    if html is None:
        result["error"] = "Could not fetch"
        return result

    result["title"] = soup.title.string.strip() if soup.title and soup.title.string else ""

    emails = clean_emails(set(_EMAIL_RE.findall(html)), page_domain=page_domain)
    phones = clean_phones(_PHONE_RE.findall(text))

    # Schema.org structured data (trusted source — bypass domain match)
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "{}")
            if isinstance(data, dict):
                if "telephone" in data:
                    phones.append(str(data["telephone"]))
                if "email" in data:
                    emails.append(str(data["email"]).lower())
        except Exception:
            pass

    # If nothing found, try /contact subpage
    if not emails and not phones:
        for subpath in ["/contact", "/contact-us", "/about"]:
            _, s_html, s_text = fetch(base + subpath)
            if s_html:
                e2 = clean_emails(set(_EMAIL_RE.findall(s_html)), page_domain=page_domain)
                p2 = clean_phones(_PHONE_RE.findall(s_text))
                emails += e2
                phones += p2
                if emails or phones:
                    break

    # Final clean on the combined list, with domain match enforced
    result["emails"] = clean_emails(set(emails), page_domain=page_domain)
    result["phones"] = clean_phones(phones)
    return result


# ── Image Extraction ──────────────────────────────────────────────────────────

def get_hero_image_from_airbnb(airbnb_url: str):
    m = re.search(r"/rooms/(\d+)", airbnb_url)
    if not m:
        return None, "Could not parse listing ID from URL"

    try:
        r = requests.get(airbnb_url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        soup = BeautifulSoup(r.text, "html.parser")

        og = soup.find("meta", property="og:image")
        if og and og.get("content"):
            return og["content"], None

        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string or "{}")
                imgs = data.get("image", [])
                if isinstance(imgs, str):
                    imgs = [imgs]
                if imgs:
                    return imgs[0], None
            except Exception:
                pass
    except Exception as e:
        return None, str(e)

    return None, "Could not extract hero image from this listing"


# ── Reverse Image Search ──────────────────────────────────────────────────────

def search_serpapi(image_url: str) -> list:
    """Call SerpApi Google Lens. Tag each result with its match type so we can
    prefer exact matches (higher confidence the image is the same property)
    over visual matches (could be any visually-similar photo)."""
    if not SERPAPI_KEY:
        return []
    try:
        r = requests.get(
            "https://serpapi.com/search",
            params={"engine": "google_lens", "url": image_url, "api_key": SERPAPI_KEY},
            timeout=25,
        )
        data = r.json()
        results = []
        # Exact matches first — these are highest confidence
        for item in data.get("exact_matches", []):
            if item.get("link"):
                results.append({
                    "url": item["link"],
                    "title": item.get("title", ""),
                    "match_type": "exact",
                })
        for item in data.get("visual_matches", []):
            if item.get("link"):
                results.append({
                    "url": item["link"],
                    "title": item.get("title", ""),
                    "match_type": "visual",
                })
        return results
    except Exception:
        return []


def search_vision_api(image_url: str) -> list:
    if not GOOGLE_VISION_KEY:
        return []
    try:
        r = requests.post(
            f"https://vision.googleapis.com/v1/images:annotate?key={GOOGLE_VISION_KEY}",
            json={"requests": [{"image": {"source": {"imageUri": image_url}},
                                "features": [{"type": "WEB_DETECTION", "maxResults": 40}]}]},
            timeout=20,
        )
        web = r.json().get("responses", [{}])[0].get("webDetection", {})
        return [{"url": p["url"], "title": p.get("pageTitle", "")}
                for p in web.get("pagesWithMatchingImages", []) if p.get("url")]
    except Exception:
        return []


def demo_results():
    return [
        {"url": "https://bluewavecottage.lodgify.com/", "title": "Blue Wave Cottage — Book Direct"},
        {"url": "https://book.ownerrez.com/ro/bluewavecottage", "title": "Blue Wave Cottage | OwnerRez"},
        {"url": "https://www.vrbo.com/1234567", "title": "Blue Wave Cottage | VRBO"},
        {"url": "https://www.booking.com/hotel/us/blue-wave-cottage.html", "title": "Blue Wave Cottage | Booking.com"},
        {"url": "https://bluewavecottage.com/book", "title": "Blue Wave Cottage — Direct"},
        {"url": "https://www.tripadvisor.com/VacationRentalReview-d12345", "title": "Blue Wave Cottage | TripAdvisor"},
        {"url": "https://bluewavecottage.hostaway.com/", "title": "Blue Wave Cottage | Hostaway"},
    ]


# ── Core Pipeline ─────────────────────────────────────────────────────────────

def run_pipeline(image_url: str, is_demo: bool = False) -> dict:
    raw = []
    if is_demo:
        raw = demo_results()
    else:
        raw = search_serpapi(image_url)
        if not raw:
            raw = search_vision_api(image_url)
        if not raw:
            return {"error": "No API key configured. Add SERPAPI_KEY or GOOGLE_VISION_KEY in Vercel environment variables.", "matches": []}

    matches = []
    hidden_count = 0      # pages we filtered as low-signal noise
    seen = set()
    all_emails, all_phones = [], []

    for item in raw:
        url = (item.get("url") or "").strip()
        if not url.startswith("http"):
            continue

        domain = urlparse(url).netloc.lstrip("www.")
        if domain in seen:
            continue
        seen.add(domain)
        if any(s in domain for s in SKIP_DOMAINS):
            continue
        # Also skip if any parent domain is blocklisted
        root = _root_domain(domain)
        if root in SKIP_DOMAINS:
            continue

        platform    = detect_platform(url)
        is_ota      = platform in OTA_NAMES if platform else False
        match_type  = item.get("match_type", "unknown")

        # A page is "direct" (contributes to host contact summary) if:
        #   - It's a known PMS platform (not OTA), OR
        #   - It's an EXACT image match from SerpApi (same image = very likely
        #     the same property, even if we don't recognize the platform)
        is_direct   = (not is_ota) and (platform is not None or match_type == "exact")

        # Scrape only pages we have strong signal for:
        #   - A known PMS platform match (Lodgify, Hostaway, etc.), OR
        #   - An EXACT image match from SerpApi (same image, not just similar), OR
        #   - Demo mode
        #
        # This kills the biggest noise source: visually-similar photos on
        # furniture sites, realtor aggregators, and unrelated listings.
        should_scrape = (
            is_demo
            or (platform is not None and not is_ota)
            or match_type == "exact"
        )

        # A page is worth SHOWING in the results list if it's one of:
        #   - A known PMS / direct booking platform
        #   - A known OTA (competitive intel — Airbnb, VRBO, Booking, etc.)
        #   - An exact image match (same image = very likely same property)
        #
        # Everything else is Google Lens visual-similarity noise — unrelated
        # pages that just happen to contain similar-looking furniture, rooms,
        # or architectural features. Hide them from the results entirely.
        should_show = (
            is_demo
            or platform is not None      # any PMS or OTA
            or match_type == "exact"
        )
        if not should_show:
            hidden_count += 1
            continue

        match = {
            "url": url,
            "domain": domain,
            "platform": platform,
            "is_direct": is_direct,
            "is_ota": is_ota,
            "match_type": match_type,
            "emails": [],
            "phones": [],
            "title": item.get("title", ""),
            "error": None,
        }

        if should_scrape:
            contact = scrape_contact(url)
            match["emails"]  = contact["emails"]
            match["phones"]  = contact["phones"]
            match["title"]   = contact["title"] or match["title"]
            match["error"]   = contact["error"]

            # Only feed the top-level summary with emails from HIGH-CONFIDENCE
            # sources: a known PMS direct-booking platform. This keeps the
            # summary banner clean and relevant.
            if is_direct:
                all_emails.extend(contact["emails"])
                all_phones.extend(contact["phones"])
            time.sleep(THROTTLE_DELAY)

        matches.append(match)

    # Deduplicate and cap summary
    summary_emails = list(dict.fromkeys(all_emails))[:10]
    summary_phones = list(dict.fromkeys(all_phones))[:10]

    return {
        "image_url": image_url,
        "timestamp": datetime.now().isoformat(),
        "is_demo": is_demo,
        "summary": {
            "total": len(matches),
            "direct": sum(1 for m in matches if m["is_direct"]),
            "ota": sum(1 for m in matches if m["is_ota"]),
            "unknown": sum(1 for m in matches if not m["platform"]),
            "hidden_noise": hidden_count,    # low-signal visual matches we filtered out
            "emails": summary_emails,
            "phones": summary_phones,
        },
        "matches": matches,
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@app.route("/api/search", methods=["POST"])
def search():
    data = request.get_json(silent=True) or {}
    airbnb_url  = (data.get("airbnb_url") or "").strip()
    image_url   = (data.get("image_url") or "").strip()
    is_demo     = bool(data.get("demo"))

    if is_demo:
        result = run_pipeline("demo", is_demo=True)
        return jsonify(result)

    if airbnb_url:
        img, err = get_hero_image_from_airbnb(airbnb_url)
        if err or not img:
            return jsonify({"error": err or "Could not extract image from Airbnb URL"}), 400
        image_url = img

    if not image_url:
        return jsonify({"error": "Provide airbnb_url or image_url"}), 400

    result = run_pipeline(image_url)
    return jsonify(result)


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "serpapi": bool(SERPAPI_KEY),
        "vision": bool(GOOGLE_VISION_KEY),
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)
