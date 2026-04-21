import json
import re
from pathlib import Path
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup


HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}
REQUEST_TIMEOUT = 10

_EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,7}\b")
_PHONE_RE = re.compile(
    r"(?:\+?1[\s.\-]?)?(?:\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}"
    r"|\+\d{1,3}[\s.\-]?(?:\(?\d{1,4}\)?[\s.\-])?\d{1,4}[\s.\-]\d{1,9})"
)

BASE_DIR = Path(__file__).resolve().parent

with open(BASE_DIR / "reference_data.json", "r", encoding="utf-8") as f:
    REF = json.load(f)

_JUNK_DOMAINS = set(REF["junk_domains"])
_WEBMAIL_DOMAINS = set(REF["webmail_domains"])
_JUNK_LOCAL_PARTS = set(REF["junk_local_parts"])


def _root_domain(host: str) -> str:
    if not host:
        return ""
    host = host.lower().lstrip("www.")
    parts = host.split(".")
    if len(parts) <= 2:
        return host
    return ".".join(parts[-2:])


def clean_emails(raw, page_domain: str = ""):
    out = []
    page_root = _root_domain(page_domain)

    for e in raw:
        e = e.strip().lower()

        if len(e) > 80 or len(e) < 6:
            continue
        if re.match(r"^u00[0-9a-f]{2}", e):
            continue
        if "\\u" in e or "u003" in e.split("@")[0]:
            continue
        if re.search(r"[^a-z0-9._%+\-@]", e):
            continue

        local, _, domain = e.partition("@")

        if len(local) >= 24 and re.fullmatch(r"[a-f0-9]+", local):
            continue
        if re.search(r"\.(png|jpg|jpeg|gif|svg|webp|css|js|woff2?)$", e, re.I):
            continue
        if domain in _JUNK_DOMAINS:
            continue
        if any(domain.endswith("." + jd) for jd in _JUNK_DOMAINS):
            continue
        if local in _JUNK_LOCAL_PARTS:
            continue

        root = _root_domain(domain)
        is_page_match = page_root and (root == page_root)
        is_webmail = domain in _WEBMAIL_DOMAINS
        if not (is_page_match or is_webmail):
            continue

        out.append(e)

    return list(dict.fromkeys(out))[:3]


def clean_phones(raw):
    out = []
    for p in raw:
        digits = re.sub(r"\D", "", p)
        if 10 <= len(digits) <= 15:
            out.append(p.strip())
    return list(dict.fromkeys(out))[:8]


def _decode_unicode_escapes(s: str) -> str:
    if not s:
        return s
    try:
        s = re.sub(r"\\u([0-9a-fA-F]{4})", lambda m: chr(int(m.group(1), 16)), s)
    except Exception:
        pass
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

    if not emails and not phones:
        for subpath in ["/contact", "/contact-us", "/about"]:
            _, s_html, s_text = fetch(base + subpath)
            if s_html:
                emails += clean_emails(set(_EMAIL_RE.findall(s_html)), page_domain=page_domain)
                phones += clean_phones(_PHONE_RE.findall(s_text))
                if emails or phones:
                    break

    result["emails"] = clean_emails(set(emails), page_domain=page_domain)
    result["phones"] = clean_phones(phones)
    return result