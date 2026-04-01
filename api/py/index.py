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
    # OTAs — tracked but contact info not scraped
    {"name": "VRBO",            "patterns": ["vrbo.com", "homeaway.com"]},
    {"name": "Booking.com",     "patterns": ["booking.com"]},
    {"name": "TripAdvisor",     "patterns": ["tripadvisor.com", "flipkey.com"]},
    {"name": "Vacasa",          "patterns": ["vacasa.com"]},
    {"name": "Evolve",          "patterns": ["evolvevacationrental.com"]},
    {"name": "Expedia",         "patterns": ["expedia.com", "hotels.com"]},
    {"name": "Plum Guide",      "patterns": ["plumguide.com"]},
]

OTA_NAMES = {"VRBO", "Booking.com", "TripAdvisor", "Vacasa", "Evolve", "Expedia", "Plum Guide"}

SKIP_DOMAINS = {
    "airbnb.com", "airbnb.co.uk", "airbnb.com.au",
    "google.com", "facebook.com", "instagram.com",
    "twitter.com", "x.com", "youtube.com", "pinterest.com",
    "reddit.com", "yelp.com", "linkedin.com", "tiktok.com",
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
    "schema.org", "w3.org",
}


def detect_platform(url: str):
    lower = url.lower()
    for p in PMS_PLATFORMS:
        for pat in p["patterns"]:
            if pat in lower:
                return p["name"]
    return None


def clean_emails(raw):
    out = []
    for e in raw:
        e = e.strip()
        if len(e) > 80:
            continue
        domain = e.split("@")[-1].lower()
        if domain in _JUNK_DOMAINS:
            continue
        if re.search(r"\.(png|jpg|jpeg|gif|svg|webp|css|js)$", e, re.I):
            continue
        out.append(e)
    return list(dict.fromkeys(out))


def clean_phones(raw):
    out = []
    for p in raw:
        digits = re.sub(r"\D", "", p)
        if 10 <= len(digits) <= 15:
            out.append(p.strip())
    return list(dict.fromkeys(out))[:8]


def scrape_contact(url: str) -> dict:
    result = {"emails": [], "phones": [], "title": "", "error": None}
    parsed = urlparse(url)
    base = f"{parsed.scheme}://{parsed.netloc}"

    def fetch(target):
        try:
            r = requests.get(target, headers=HEADERS, timeout=REQUEST_TIMEOUT, allow_redirects=True)
            if r.status_code == 200:
                soup = BeautifulSoup(r.text, "html.parser")
                return soup, r.text, soup.get_text(" ")
        except Exception:
            pass
        return None, None, None

    soup, html, text = fetch(url)
    if html is None:
        result["error"] = "Could not fetch"
        return result

    result["title"] = soup.title.string.strip() if soup.title and soup.title.string else ""

    emails = clean_emails(set(_EMAIL_RE.findall(html)))
    phones = clean_phones(_PHONE_RE.findall(text))

    # Schema.org structured data
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

    # If nothing found, try /contact subpage
    if not emails and not phones:
        for subpath in ["/contact", "/contact-us", "/about"]:
            _, s_html, s_text = fetch(base + subpath)
            if s_html:
                e2 = clean_emails(set(_EMAIL_RE.findall(s_html)))
                p2 = clean_phones(_PHONE_RE.findall(s_text))
                emails += e2
                phones += p2
                if emails or phones:
                    break

    result["emails"] = clean_emails(set(emails))
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
        for item in data.get("visual_matches", []) + data.get("exact_matches", []):
            if item.get("link"):
                results.append({"url": item["link"], "title": item.get("title", "")})
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

        platform = detect_platform(url)
        is_direct = platform not in OTA_NAMES if platform else True

        match = {
            "url": url,
            "domain": domain,
            "platform": platform,
            "is_direct": is_direct,
            "is_ota": platform in OTA_NAMES if platform else False,
            "emails": [],
            "phones": [],
            "title": item.get("title", ""),
            "error": None,
        }

        # Only scrape direct / unknown pages (skip OTAs)
        if not match["is_ota"]:
            contact = scrape_contact(url)
            match["emails"]  = contact["emails"]
            match["phones"]  = contact["phones"]
            match["title"]   = contact["title"] or match["title"]
            match["error"]   = contact["error"]
            if is_direct:
                all_emails.extend(contact["emails"])
                all_phones.extend(contact["phones"])
            time.sleep(THROTTLE_DELAY)

        matches.append(match)

    return {
        "image_url": image_url,
        "timestamp": datetime.now().isoformat(),
        "is_demo": is_demo,
        "summary": {
            "total": len(matches),
            "direct": sum(1 for m in matches if m["is_direct"] and m["platform"] and not m["is_ota"]),
            "ota": sum(1 for m in matches if m["is_ota"]),
            "unknown": sum(1 for m in matches if not m["platform"]),
            "emails": list(dict.fromkeys(all_emails)),
            "phones": list(dict.fromkeys(all_phones)),
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
