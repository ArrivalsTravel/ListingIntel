"""
  SERPAPI_KEY        — https://serpapi.com  (100 free searches on sign-up)
  GOOGLE_VISION_KEY  — https://console.cloud.google.com  (1 000 free/month)
"""

import os, json,time,logging,requests, re
from bs4 import BeautifulSoup
from pathlib import Path
from urllib.parse import urlparse
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from scraper import scrape_contact



app = Flask(__name__, static_folder="../public", static_url_path="")
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
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

BASE_DIR = Path(__file__).resolve().parent

with open(BASE_DIR / "reference_data.json", "r", encoding="utf-8") as f:
    REF = json.load(f)
PMS_PLATFORMS = REF["pms_platforms"]
OTA_NAMES = set(REF["ota_names"])
SKIP_DOMAINS = set(REF["skip_domains"])


def detect_platform(url: str):
    lower = url.lower()
    for p in PMS_PLATFORMS:
        for pat in p["patterns"]:
            if pat in lower:
                return p["name"]
    return None


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
        for item in data.get("exact_matches", []):
            if item.get("link"):
                results.append({"url": item["link"], "title": item.get("title", ""), "match_type": "exact" })
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
    search_provider = None

    if is_demo:
        raw = demo_results()
        search_provider = "demo"
    else:
        raw = search_serpapi(image_url)
        if raw:
            search_provider = "serpapi"
        if not raw:
            raw = search_vision_api(image_url)
            if raw:
                search_provider = "vision"
        if not raw:
            return {
                "error": "Reverse image search returned no results. Check the API key, quota, or image accessibility.",
                "matches": [],
                "image_url": image_url,
                "trace": {
                    "input": {
                        "image_url": image_url,
                        "is_demo": is_demo,
                    },
                    "search": {
                        "provider": "none",
                        "raw_count": 0,
                        "raw_matches": [],
                    },
                    "filter": {
                        "shown_count": 0,
                        "hidden_count": 0,
                        "hidden_matches": [],
                    },
                    "scrape": {
                        "attempts": [],
                    },
                },
            }

    matches = []
    raw_matches = []
    hidden_matches = []
    scrape_attempts = []
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

        platform = detect_platform(url)
        is_ota = platform in OTA_NAMES if platform else False
        match_type = item.get("match_type", "unknown")
        source = item.get("source", search_provider or "unknown")

        raw_match = {
            "url": url,
            "domain": domain,
            "title": item.get("title", ""),
            "platform": platform,
            "is_ota": is_ota,
            "match_type": match_type,
            "source": source,
        }
        raw_matches.append(raw_match)

        if any(s in domain for s in SKIP_DOMAINS):
            hidden_matches.append({**raw_match, "hidden_reason": "skip_domain"})
            continue

        if domain in SKIP_DOMAINS:
            hidden_matches.append({**raw_match, "hidden_reason": "skip_domain"})
            continue

        is_direct = (not is_ota) and (platform is not None or match_type == "exact")

        should_scrape = (
            is_demo
            or (platform is not None and not is_ota)
            or match_type == "exact"
        )

        should_show = (
            is_demo
            or platform is not None
            or match_type == "exact"
        )

        if not should_show:
            hidden_matches.append({**raw_match, "hidden_reason": "low_signal_match"})
            continue

        match = {
            "url": url,
            "domain": domain,
            "platform": platform,
            "is_direct": is_direct,
            "is_ota": is_ota,
            "match_type": match_type,
            "source": source,
            "emails": [],
            "phones": [],
            "title": item.get("title", ""),
            "error": None,
            "scraped": False,
        }

        if should_scrape:
            contact = scrape_contact(url)
            match["emails"] = contact["emails"]
            match["phones"] = contact["phones"]
            match["title"] = contact["title"] or match["title"]
            match["error"] = contact["error"]
            match["scraped"] = True

            scrape_attempts.append({
                "url": url,
                "domain": domain,
                "platform": platform,
                "match_type": match_type,
                "title": match["title"],
                "emails": contact["emails"],
                "phones": contact["phones"],
                "error": contact["error"],
            })

            if is_direct:
                all_emails.extend(contact["emails"])
                all_phones.extend(contact["phones"])

            time.sleep(THROTTLE_DELAY)

        matches.append(match)

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
            "hidden_noise": len(hidden_matches),
            "emails": summary_emails,
            "phones": summary_phones,
        },
        "matches": matches,
        "trace": {
            "input": {
                "image_url": image_url,
                "is_demo": is_demo,
            },
            "search": {
                "provider": search_provider,
                "raw_count": len(raw_matches),
                "raw_matches": raw_matches,
            },
            "filter": {
                "shown_count": len(matches),
                "hidden_count": len(hidden_matches),
                "hidden_matches": hidden_matches,
            },
            "scrape": {
                "attempts": scrape_attempts,
            },
        },
    }

# ── Routes ────────────────────────────────────────────────────────────────────


@app.route("/")
def root():
    return send_from_directory("../public", "index.html")



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
