from __future__ import annotations

from datetime import date, timedelta
from math import floor, isfinite
from typing import Any, Iterable

ROUTINES = (
    "exercise",
    "meditation",
    "outdoors",
    "reading",
    "social time",
    "screen-free evening",
    "healthy meals",
    "caffeine after 3pm",
)
PERIODS = (7, 14, 30, 90)
RATING_FIELDS = ("mood", "energy", "stress")


def average(values: Iterable[float]) -> float | None:
    numbers = list(values)
    if not numbers:
        return None
    return floor(sum(numbers) / len(numbers) * 10 + 0.5) / 10


def summarize(entries: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "count": len(entries),
        "sleepHours": average(entry["sleepHours"] for entry in entries),
        "mood": average(entry["mood"] for entry in entries),
        "energy": average(entry["energy"] for entry in entries),
        "stress": average(entry["stress"] for entry in entries),
    }


def validate_entry(entry: dict[str, Any], today: date) -> dict[str, str]:
    errors: dict[str, str] = {}
    entry_date = entry.get("date")
    if not isinstance(entry_date, date):
        errors["date"] = "Choose a valid date."
    elif entry_date > today:
        errors["date"] = "Date cannot be in the future."

    sleep_hours = entry.get("sleepHours")
    if (
        isinstance(sleep_hours, bool)
        or not isinstance(sleep_hours, (int, float))
        or not isfinite(sleep_hours)
        or not 0 <= sleep_hours <= 24
    ):
        errors["sleepHours"] = "Enter sleep hours between 0 and 24."

    for field in RATING_FIELDS:
        value = entry.get(field)
        if isinstance(value, bool) or not isinstance(value, int) or not 1 <= value <= 5:
            errors[field] = f"{field.capitalize()} must be a whole number from 1 to 5."

    routines = entry.get("routines", [])
    if not isinstance(routines, list) or any(routine not in ROUTINES for routine in routines):
        errors["routines"] = "Choose only routines from the list."

    notes = entry.get("notes", "")
    if not isinstance(notes, str) or len(notes) > 1000:
        errors["notes"] = "Notes can be at most 1000 characters."
    return errors


def build_stats(
    entries: list[dict[str, Any]], days: int, today: date
) -> dict[str, Any]:
    if days not in PERIODS:
        raise ValueError(f"days must be one of {PERIODS}")

    current_start = today - timedelta(days=days - 1)
    previous_start = today - timedelta(days=days * 2 - 1)
    ordered = sorted(entries, key=lambda entry: entry["date"])
    current = [
        entry
        for entry in ordered
        if current_start.isoformat() <= entry["date"] <= today.isoformat()
    ]
    previous = [
        entry
        for entry in ordered
        if previous_start.isoformat() <= entry["date"] < current_start.isoformat()
    ]
    insights: list[dict[str, str]] = []

    long_sleep = [entry for entry in current if entry["sleepHours"] >= 7]
    short_sleep = [entry for entry in current if entry["sleepHours"] < 7]
    if len(long_sleep) >= 3 and len(short_sleep) >= 3:
        insights.append(
            {
                "title": "Sleep and mood",
                "text": (
                    f"On days after 7+ hours of sleep your mood averaged "
                    f"{average(entry['mood'] for entry in long_sleep)}, compared with "
                    f"{average(entry['mood'] for entry in short_sleep)} after less "
                    "than 7 hours."
                ),
            }
        )

    routines = dict.fromkeys(
        routine
        for entry in current
        for routine in entry.get("routines", [])
    )
    for routine in routines:
        with_routine = [
            entry for entry in current if routine in entry.get("routines", [])
        ]
        without_routine = [
            entry for entry in current if routine not in entry.get("routines", [])
        ]
        if len(with_routine) < 3 or len(without_routine) < 3:
            continue

        mood_with = average(entry["mood"] for entry in with_routine)
        mood_without = average(entry["mood"] for entry in without_routine)
        stress_with = average(entry["stress"] for entry in with_routine)
        stress_without = average(entry["stress"] for entry in without_routine)
        if (
            abs(mood_with - mood_without) >= 0.3
            or abs(stress_with - stress_without) >= 0.3
        ):
            insights.append(
                {
                    "title": routine.capitalize(),
                    "text": (
                        f'On {len(with_routine)} days you logged "{routine}": mood '
                        f"averaged {mood_with} (vs {mood_without} otherwise) and "
                        f"stress {stress_with} (vs {stress_without})."
                    ),
                }
            )

    return {
        "days": days,
        "current": summarize(current),
        "previous": summarize(previous),
        "series": [
            {
                key: entry[key]
                for key in ("date", "sleepHours", "mood", "energy", "stress")
            }
            for entry in current
        ],
        "insights": insights,
        "note": (
            "These are simple comparisons of your own entries. They show patterns, "
            "not causes, and are not a diagnosis."
        ),
    }
