import json
import tempfile
import unittest
from pathlib import Path

from collector.collect import canonical_url, collect, known_urls, load_sources, parse_feed, select_new


FIXTURE = Path(__file__).resolve().parent / "fixtures" / "feed.xml"
SOURCES = Path(__file__).resolve().parent / "sources.json"


class CollectTests(unittest.TestCase):
    def test_parse_and_select_only_new_ai_items(self):
        items = parse_feed(FIXTURE.read_text(encoding="utf-8"), "Fixture")
        self.assertEqual(len(items), 3)
        self.assertIn("Hypershield", items[0]["title"])
        sources = load_sources(SOURCES)
        chosen = select_new(items, {canonical_url("https://example.com/known-webex")}, sources["keywords"], 10)
        self.assertEqual([item["url"] for item in chosen], ["https://example.com/hypershield-update"])

    def test_draft_is_inbox_and_skips_known_case_urls(self):
        sources = load_sources(SOURCES)
        with tempfile.TemporaryDirectory() as tmp:
            case_dir = Path(tmp)
            (case_dir / "known.json").write_text(
                json.dumps(
                    {
                        "sourceUrls": [
                            {"url": "https://example.com/hypershield-update"},
                            {"url": "https://example.com/known-webex"},
                        ]
                    }
                ),
                encoding="utf-8",
            )
            known = known_urls(case_dir)
            drafts, notes = collect(sources, known, [("Fixture", FIXTURE.read_text(encoding="utf-8"))])
            self.assertEqual(drafts, [])
            self.assertEqual(notes, [])

    def test_new_draft_has_no_invented_deal(self):
        sources = load_sources(SOURCES)
        drafts, _notes = collect(sources, set(), [("Fixture", FIXTURE.read_text(encoding="utf-8"))])
        self.assertGreaterEqual(len(drafts), 1)
        for draft in drafts:
            self.assertEqual(draft["status"], "inbox")
            self.assertIsNone(draft["dealSizeLowUsd"])
            self.assertTrue(draft["reviewChecklist"])
            self.assertTrue(draft["sourceUrls"][0]["url"].startswith("https://"))


if __name__ == "__main__":
    unittest.main()
