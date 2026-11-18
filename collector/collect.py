"""Collect public Cisco AI and security items into data/inbox drafts.

Drafts stay at status=inbox until a PM fills the project fields and promotes
them. Published search never reads the inbox.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import ssl
import urllib.request
from html import unescape
from pathlib import Path
from urllib.error import HTTPError, URLError
from xml.etree import ElementTree
import datetime as dt


ROOT = Path(__file__).resolve().parents[1]


def strip_html(value: str) -> str:
    text = re.sub(r"(?is)<script.*?>.*?</script>", " ", value or "")
    text = re.sub(r"(?is)<style.*?>.*?</style>", " ", text)
    text = re.sub(r"(?s)<[^>]+>", " ", text)
    return unescape(re.sub(r"\s+", " ", text)).strip()


def canonical_url(url: str) -> str:
    raw = (url or "").strip()
    raw = raw.split("#", 1)[0]
    raw = raw.split("?", 1)[0]
    if raw.endswith("/"):
        raw = raw[:-1]
    return raw.lower()


def local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def child_text(node: ElementTree.Element, names: set[str]) -> str:
    for child in list(node):
        if local(child.tag) in names:
            return "".join(child.itertext()).strip()
    return ""


def link_of(node: ElementTree.Element) -> str:
    for child in list(node):
        if local(child.tag) != "link":
            continue
        href = child.attrib.get("href")
        if href:
            return href.strip()
        if child.text and child.text.strip():
            return child.text.strip()
    return ""


def parse_feed(xml_text: str, source_name: str) -> list[dict]:
    cleaned = re.sub(r'\sxmlns(:\w+)?="[^"]*"', "", xml_text)
    root = ElementTree.fromstring(cleaned)
    nodes = [node for node in root.iter() if local(node.tag) in {"item", "entry"}]
    items = []
    for node in nodes:
        title = strip_html(child_text(node, {"title"}))
        url = link_of(node)
        summary = strip_html(child_text(node, {"description", "summary", "content"}))
        published = child_text(node, {"pubDate", "published", "updated", "date"})
        if not title or not url.startswith("http"):
            continue
        items.append(
            {
                "title": title[:240],
                "url": url.strip(),
                "summary": summary[:1500],
                "published": published[:40],
                "source": source_name,
            }
        )
    return items


def matches_keywords(item: dict, keywords: list[str]) -> bool:
    haystack = f"{item['title']}\n{item['summary']}".lower()
    return any(keyword.lower() in haystack for keyword in keywords)


def guess_solutions(item: dict) -> list[str]:
    haystack = f"{item['title']} {item['summary']}".lower()
    found = []
    pairs = [
        ("hypershield", "Cisco Hypershield"),
        ("ai defense", "Cisco AI Defense"),
        ("silicon one", "Cisco Silicon One"),
        ("hyperfabric", "Nexus Hyperfabric AI"),
        ("xdr", "Cisco XDR"),
        ("webex", "Cisco Webex"),
        ("nvidia", "NVIDIA"),
        ("spectrum-x", "NVIDIA Spectrum-X"),
    ]
    for needle, label in pairs:
        if needle in haystack and label not in found:
            found.append(label)
    return found or ["미분류 — PM 검토"]


def slugify(title: str, url: str) -> str:
    digest = hashlib.sha1(canonical_url(url).encode("utf-8")).hexdigest()[:8]
    words = re.findall(r"[a-z0-9]+", title.lower())[:6]
    stem = "-".join(words) or "item"
    return f"{stem}-{digest}"[:80]


def draft_from_item(item: dict) -> dict:
    today = dt.date.today().isoformat()
    published = item["published"][:10] if re.match(r"\d{4}-\d{2}-\d{2}", item["published"]) else None
    return {
        "caseCode": f"INBOX-{hashlib.sha1(canonical_url(item['url']).encode()).hexdigest()[:10].upper()}",
        "slug": slugify(item["title"], item["url"]),
        "title": item["title"],
        "titleEn": item["title"],
        "recordType": "public_announcement",
        "fidelity": "primary_source",
        "fidelityNote": "수집 봇이 공개 피드에서 가져온 초안입니다. PM이 검토하기 전에는 검색 인덱스에 들어가지 않습니다.",
        "status": "inbox",
        "confidentiality": "public",
        "executiveSummary": item["summary"] or item["title"],
        "problemStatement": "",
        "opportunity": "",
        "strategicAlignment": "",
        "businessValue": "",
        "industry": "cross_industry",
        "industryLabel": "검토 필요",
        "customerSegment": "",
        "customerSegmentLabel": "",
        "region": "",
        "regulatoryContext": [],
        "companySizeBand": "",
        "deploymentModel": "",
        "deploymentModelLabel": "",
        "architecturePattern": "",
        "complexity": "medium",
        "planningBandNote": "피드 초안에는 금액과 기간을 채우지 않습니다. 공개 숫자는 출처 문장으로만 옮기고, 추정 실적은 만들지 마세요.",
        "dealSizeLowUsd": None,
        "dealSizeHighUsd": None,
        "dealSizeBand": None,
        "leadTimeWeeksLow": None,
        "leadTimeWeeksHigh": None,
        "durationWeeksLow": None,
        "durationWeeksHigh": None,
        "ciscoSolutions": guess_solutions(item),
        "partnerTechnologies": [],
        "aiCapabilities": [],
        "securityCapabilities": [],
        "aliases": [],
        "scopeIn": [],
        "scopeOut": [],
        "assumptions": [],
        "constraints": [],
        "successCriteria": [],
        "outcomeType": "published",
        "outcomes": [],
        "sourceUrls": [
            {
                "title": item["title"],
                "url": item["url"],
                "publisher": item["source"],
                "publishedOn": published,
            }
        ],
        "videoUrl": None,
        "videoTitle": None,
        "publishedOn": published or today,
        "collectedFamily": guess_solutions(item)[0],
        "reviewChecklist": [
            "제목과 본문이 시스코 AI·보안·인프라 사례인지 확인한다.",
            "공개된 수치와 계획 밴드를 구분한다. 없는 고객 실적을 만들지 않는다.",
            "산업, RACI, WBS, 리스크, KPI를 채운 뒤 status를 reviewed로 바꾼다.",
        ],
        "stakeholders": [],
        "requirements": [],
        "raci": [],
        "wbs": [],
        "milestones": [],
        "risks": [],
        "issues": [],
        "kpis": [],
        "costs": [],
        "qualityGates": [],
        "communications": [],
        "procurement": [],
        "decisions": [],
        "lessons": [],
        "benefits": [],
        "narrative": [],
    }


def known_urls(*directories: Path) -> set[str]:
    found = set()
    for directory in directories:
        if not directory.exists():
            continue
        for path in directory.rglob("*.json"):
            try:
                payload = json.loads(path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                continue
            records = payload if isinstance(payload, list) else [payload]
            for record in records:
                for source in record.get("sourceUrls") or []:
                    if isinstance(source, dict) and source.get("url"):
                        found.add(canonical_url(source["url"]))
                if record.get("videoUrl"):
                    found.add(canonical_url(record["videoUrl"]))
    return found


def select_new(items: list[dict], known: set[str], keywords: list[str], limit: int) -> list[dict]:
    chosen = []
    seen = set()
    for item in items:
        url = canonical_url(item["url"])
        if not url or url in known or url in seen:
            continue
        if not matches_keywords(item, keywords):
            continue
        seen.add(url)
        chosen.append(item)
        if len(chosen) >= limit:
            break
    return chosen


def fetch_text(url: str, user_agent: str, timeout: int) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": user_agent, "Accept": "application/rss+xml, application/atom+xml, text/xml, */*"})
    context = ssl.create_default_context()
    with urllib.request.urlopen(request, timeout=timeout, context=context) as response:
        raw = response.read(2_000_000)
        charset = response.headers.get_content_charset() or "utf-8"
    return raw.decode(charset, errors="replace")


def load_sources(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def collect(sources: dict, known: set[str], fixtures: list[tuple[str, str]] | None = None) -> tuple[list[dict], list[str]]:
    notes = []
    items = []
    if fixtures is not None:
        for name, xml_text in fixtures:
            items.extend(parse_feed(xml_text, name))
    else:
        for feed in sources["feeds"]:
            try:
                xml_text = fetch_text(feed["url"], sources["userAgent"], int(sources["timeoutSeconds"]))
                parsed = parse_feed(xml_text, feed["name"])
                items.extend(parsed)
                notes.append(f"{feed['name']}: {len(parsed)}")
            except (HTTPError, URLError, TimeoutError, ElementTree.ParseError, OSError) as exc:
                notes.append(f"{feed['name']}: skipped ({type(exc).__name__})")
    chosen = select_new(items, known, sources["keywords"], int(sources["maxNewPerRun"]))
    return [draft_from_item(item) for item in chosen], notes


def write_drafts(drafts: list[dict], inbox: Path) -> list[Path]:
    inbox.mkdir(parents=True, exist_ok=True)
    written = []
    for draft in drafts:
        target = inbox / f"{draft['slug']}.json"
        target.write_text(json.dumps(draft, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        written.append(target)
    return written


def main() -> int:
    parser = argparse.ArgumentParser(description="Collect public AI solution items into inbox drafts.")
    parser.add_argument("--sources", default=str(ROOT / "collector" / "sources.json"))
    parser.add_argument("--cases", default=str(ROOT / "data" / "cases"))
    parser.add_argument("--inbox", default=str(ROOT / "data" / "inbox"))
    parser.add_argument("--fixture", action="append", default=[], help="Offline XML feed. Repeat for several files.")
    args = parser.parse_args()
    sources = load_sources(Path(args.sources))
    known = known_urls(Path(args.cases), Path(args.inbox))
    fixtures = None
    if args.fixture:
        fixtures = [(Path(path).stem, Path(path).read_text(encoding="utf-8")) for path in args.fixture]
    drafts, notes = collect(sources, known, fixtures)
    written = write_drafts(drafts, Path(args.inbox))
    print(json.dumps({"new": len(written), "notes": notes, "files": [path.name for path in written]}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
