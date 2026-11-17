from __future__ import annotations

import hmac
import os
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd
import streamlit as st
from bson import ObjectId
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError, PyMongoError

from journal_logic import PERIODS, ROUTINES, build_stats, validate_entry

APP_ROOT = Path(__file__).resolve().parent
load_dotenv(APP_ROOT / ".env")
load_dotenv(APP_ROOT.parent / ".env")


@st.cache_resource
def get_entries_collection():
    uri = os.environ.get("MONGODB_URI")
    if not uri:
        try:
            uri = st.secrets["MONGODB_URI"]
        except (KeyError, FileNotFoundError):
            raise RuntimeError(
                "Missing MONGODB_URI. Set it in Streamlit Cloud Secrets or your local environment."
            ) from None

    client = MongoClient(uri, serverSelectionTimeoutMS=8000)
    try:
        client.admin.command("ping")
        database = client.get_default_database(default="wellbeing_journal")
        collection = database["entries"]
        collection.create_index("date", unique=True)
    except PyMongoError as error:
        client.close()
        raise RuntimeError(
            "MongoDB connection failed. Check MONGODB_URI and your Atlas network access."
        ) from error
    return collection


def load_entries(collection) -> list[dict[str, Any]]:
    try:
        return list(collection.find().sort("date", -1).limit(1000))
    except PyMongoError as error:
        st.error(f"Could not load entries ({type(error).__name__}).")
        st.stop()


def require_authentication() -> None:
    password = os.environ.get("APP_PASSWORD")
    if not password:
        try:
            password = st.secrets["APP_PASSWORD"]
        except (KeyError, FileNotFoundError):
            st.error(
                "Missing APP_PASSWORD. Set a private password in Streamlit Cloud Secrets."
            )
            st.stop()

    if st.session_state.get("authenticated"):
        return

    with st.form("login-form"):
        submitted_password = st.text_input("Journal password", type="password")
        submitted = st.form_submit_button("Unlock journal", type="primary")
    if submitted:
        if hmac.compare_digest(submitted_password, str(password)):
            st.session_state["authenticated"] = True
            st.rerun()
        st.error("Incorrect password.")
    st.stop()


def format_date(value: str) -> str:
    return date.fromisoformat(value).strftime("%A, %d %B %Y")


def begin_edit(entry_id: str) -> None:
    st.session_state["edit_id"] = entry_id
    st.session_state["section"] = "Log"


def request_delete(entry_id: str) -> None:
    st.session_state["delete_id"] = entry_id


def render_log(collection, entries: list[dict[str, Any]]) -> None:
    edit_id = st.session_state.get("edit_id")
    editing = next((entry for entry in entries if str(entry["_id"]) == edit_id), None)
    if edit_id and editing is None:
        st.session_state.pop("edit_id", None)
        editing = None

    if editing:
        st.subheader(f"Edit entry · {editing['date']}")
        if st.button("Cancel edit"):
            st.session_state.pop("edit_id", None)
            st.rerun()
    else:
        st.subheader("How was your day?")

    with st.form(f"entry-form-{edit_id or 'new'}"):
        entry_date = st.date_input(
            "Date",
            value=(
                date.fromisoformat(editing["date"])
                if editing
                else date.today()
            ),
            max_value=date.today(),
            disabled=editing is not None,
        )
        sleep_hours = st.number_input(
            "Hours slept",
            min_value=0.0,
            max_value=24.0,
            value=float(editing.get("sleepHours", 0.0)) if editing else 0.0,
            step=0.5,
        )
        rating_columns = st.columns(3)
        ratings: dict[str, int] = {}
        for column, field, label in zip(
            rating_columns,
            ("mood", "energy", "stress"),
            ("Mood", "Energy", "Stress"),
        ):
            with column:
                ratings[field] = st.select_slider(
                    label,
                    options=[1, 2, 3, 4, 5],
                    value=int(editing.get(field, 3)) if editing else 3,
                )
        routines = st.multiselect(
            "Routines today",
            options=ROUTINES,
            default=editing.get("routines", []) if editing else [],
        )
        notes = st.text_area(
            "Notes (optional)",
            value=editing.get("notes", "") if editing else "",
            max_chars=1000,
            placeholder="Anything you want to remember about today...",
        )
        submitted = st.form_submit_button(
            "Update entry" if editing else "Save entry",
            type="primary",
        )

    if not submitted:
        return

    entry = {
        "date": entry_date,
        "sleepHours": sleep_hours,
        **ratings,
        "routines": list(dict.fromkeys(routines)),
        "notes": notes.strip(),
    }
    errors = validate_entry(entry, date.today())
    if errors:
        for message in errors.values():
            st.error(message)
        return

    document = {
        **entry,
        "date": entry_date.isoformat(),
        "updatedAt": datetime.now(timezone.utc),
    }
    query = {"date": document["date"]}
    if editing:
        query["_id"] = {"$ne": editing["_id"]}
    try:
        if collection.find_one(query, {"_id": 1}):
            st.error("You already have an entry for this date.")
            return
        if editing:
            result = collection.update_one(
                {"_id": editing["_id"]},
                {"$set": document},
            )
            if result.matched_count == 0:
                st.error("Entry not found. Refresh and try again.")
                return
        else:
            document["createdAt"] = document["updatedAt"]
            collection.insert_one(document)
    except DuplicateKeyError:
        st.error("You already have an entry for this date.")
        return
    except PyMongoError as error:
        st.error(f"Could not save the entry ({type(error).__name__}).")
        return

    st.session_state.pop("edit_id", None)
    st.session_state["flash"] = "Entry saved."
    st.rerun()


def render_history(collection, entries: list[dict[str, Any]]) -> None:
    if not entries:
        st.info("No entries yet. Add your first one in the Log section.")
        return

    for entry in entries:
        entry_id = str(entry["_id"])
        with st.container(border=True):
            header, edit_column, delete_column = st.columns([5, 1, 1])
            header.markdown(f"### {format_date(entry['date'])}")
            edit_column.button(
                "Edit",
                key=f"edit-{entry_id}",
                on_click=begin_edit,
                args=(entry_id,),
            )
            delete_column.button(
                "Delete",
                key=f"delete-{entry_id}",
                on_click=request_delete,
                args=(entry_id,),
            )

            metrics = st.columns(4)
            metrics[0].metric("Sleep", f"{entry['sleepHours']} h")
            metrics[1].metric("Mood", f"{entry['mood']}/5")
            metrics[2].metric("Energy", f"{entry['energy']}/5")
            metrics[3].metric("Stress", f"{entry['stress']}/5")
            if entry.get("routines"):
                st.caption("Routines: " + ", ".join(entry["routines"]))
            if entry.get("notes"):
                st.write(entry["notes"])

            if st.session_state.get("delete_id") == entry_id:
                st.warning(f"Delete the entry for {entry['date']}?")
                confirm_column, cancel_column = st.columns(2)
                if confirm_column.button(
                    "Confirm delete",
                    key=f"confirm-delete-{entry_id}",
                    type="primary",
                ):
                    try:
                        collection.delete_one({"_id": entry["_id"]})
                    except PyMongoError as error:
                        st.error(f"Could not delete the entry ({type(error).__name__}).")
                        return
                    st.session_state.pop("delete_id", None)
                    st.session_state["flash"] = "Entry deleted."
                    st.rerun()
                if cancel_column.button("Cancel", key=f"cancel-delete-{entry_id}"):
                    st.session_state.pop("delete_id", None)
                    st.rerun()


def render_trends(entries: list[dict[str, Any]]) -> None:
    days = st.radio(
        "Time range",
        options=PERIODS,
        format_func=lambda value: f"{value} days",
        horizontal=True,
    )
    stats = build_stats(entries, days, date.today())
    current = stats["current"]
    previous = stats["previous"]
    if current["count"] == 0:
        st.info(f"No entries in the last {days} days. Log a few days to see trends.")
        return

    labels = (
        ("Average mood", "mood", "/5"),
        ("Average energy", "energy", "/5"),
        ("Average stress", "stress", "/5"),
        ("Average sleep", "sleepHours", " h"),
    )
    metric_columns = st.columns(4)
    for column, (label, key, unit) in zip(metric_columns, labels):
        value = current[key]
        prior = previous[key]
        delta = (
            f"{value - prior:+.1f} vs previous"
            if value is not None and prior is not None
            else None
        )
        column.metric(
            label,
            f"{value}{unit}" if value is not None else "No data",
            delta,
            delta_color="inverse" if key == "stress" else "normal",
        )

    chart_data = pd.DataFrame(stats["series"]).set_index("date")
    st.subheader("Mood, energy and stress")
    st.line_chart(chart_data[["mood", "energy", "stress"]], y_label="Rating")
    st.subheader("Hours of sleep")
    st.bar_chart(chart_data[["sleepHours"]], y_label="Hours")

    st.subheader("Patterns in your entries")
    if stats["insights"]:
        for insight in stats["insights"]:
            st.markdown(f"**{insight['title']}**  \n{insight['text']}")
    else:
        st.caption(
            "Not enough data yet. Comparisons need at least 3 days in each group."
        )
    st.caption(stats["note"])


def main() -> None:
    st.set_page_config(page_title="Wellbeing Journal", page_icon="🌿", layout="wide")
    st.title("Wellbeing Journal")
    st.caption("A private place to notice your own patterns.")
    require_authentication()

    try:
        collection = get_entries_collection()
    except RuntimeError as error:
        st.error(str(error))
        st.stop()
    except PyMongoError as error:
        st.error(f"MongoDB setup failed ({type(error).__name__}).")
        st.stop()

    entries = load_entries(collection)
    if flash := st.session_state.pop("flash", None):
        st.success(flash)

    section = st.radio(
        "Section",
        options=("Log", "Trends", "History"),
        horizontal=True,
        key="section",
        label_visibility="collapsed",
    )
    if section == "Log":
        render_log(collection, entries)
    elif section == "Trends":
        render_trends(entries)
    else:
        render_history(collection, entries)

    st.divider()
    st.caption(
        "This journal shows patterns in what you enter. It does not diagnose or "
        "treat any condition. If you are struggling, consider talking to a doctor, "
        "counsellor or someone you trust."
    )


if __name__ == "__main__":
    main()
