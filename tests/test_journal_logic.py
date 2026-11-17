import unittest
from datetime import date, timedelta

from journal_logic import build_stats, summarize, validate_entry


TODAY = date(2026, 11, 17)


def make_entry(offset, sleep_hours, mood, routines=()):
    return {
        "date": (TODAY - timedelta(days=offset)).isoformat(),
        "sleepHours": sleep_hours,
        "mood": mood,
        "energy": 3,
        "stress": 3,
        "routines": list(routines),
        "notes": "",
    }


class JournalLogicTests(unittest.TestCase):
    def test_summarize_rounds_to_one_decimal_and_handles_empty_data(self):
        entries = [make_entry(0, 7.25, 4), make_entry(1, 8.0, 3)]
        result = summarize(entries)

        self.assertEqual(result["count"], 2)
        self.assertEqual(result["sleepHours"], 7.6)
        self.assertEqual(result["mood"], 3.5)
        self.assertIsNone(summarize([])["mood"])

    def test_stats_split_current_and_previous_period_and_build_insights(self):
        current = [
            make_entry(offset, 8, 4, ["exercise"])
            if offset < 3
            else make_entry(offset, 5, 2)
            for offset in range(7)
        ]
        previous = [make_entry(offset, 7, 3) for offset in range(7, 14)]

        stats = build_stats(current + previous, 7, TODAY)

        self.assertEqual(stats["current"]["count"], 7)
        self.assertEqual(stats["previous"]["count"], 7)
        self.assertEqual(stats["series"][0]["date"], (TODAY - timedelta(days=6)).isoformat())
        self.assertEqual(
            {insight["title"] for insight in stats["insights"]},
            {"Sleep and mood", "Exercise"},
        )
        self.assertIn("not a diagnosis", stats["note"])

    def test_insights_require_at_least_three_entries_in_each_group(self):
        entries = [
            make_entry(offset, 8 if offset < 2 else 5, 4 if offset < 2 else 2)
            for offset in range(7)
        ]

        self.assertEqual(build_stats(entries, 7, TODAY)["insights"], [])

    def test_validation_rejects_future_dates_and_out_of_range_values(self):
        errors = validate_entry(
            {
                "date": TODAY + timedelta(days=1),
                "sleepHours": 25,
                "mood": 6,
                "energy": 2.5,
                "stress": 3,
                "routines": ["unknown"],
                "notes": "x" * 1001,
            },
            TODAY,
        )

        self.assertEqual(
            set(errors),
            {"date", "sleepHours", "mood", "energy", "routines", "notes"},
        )


if __name__ == "__main__":
    unittest.main()
