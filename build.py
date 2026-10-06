#!/usr/bin/env python3
"""Regenerate shops.json from ../area_shops.csv for the Moot Shops directory."""

from __future__ import annotations

import csv
import json
import re
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
CSV_PATH = ROOT.parent / "area_shops.csv"
OUT_PATH = ROOT / "shops.json"

IMAGE_EXT_RE = re.compile(
    r"\.(jpe?g|png|webp|gif|svg)(\?.*)?$", re.IGNORECASE
)

# Obvious public CDN / direct-asset hosts (still require a path that looks like a file)
CDN_HINTS = (
    "wp-content/uploads",
    "cloudinary.com",
    "imgur.com",
    "googleusercontent.com",
    "fbcdn.net",
    "cdn.",
)


def is_hotlinkable_image(url: str) -> bool:
    """Only treat as <img src> when it clearly looks like a direct image URL."""
    if not url or not url.startswith(("http://", "https://")):
        return False
    path = urlparse(url).path
    if IMAGE_EXT_RE.search(path):
        return True
    # Extension in query-less path already handled; avoid page URLs
    lower = url.lower()
    if any(h in lower for h in ("facebook.com", "fb.com", "instagram.com")):
        return False
    # Bare site roots / directories are never images
    if path in ("", "/"):
        return False
    if lower.rstrip("/").endswith(
        ("store-directory", "stores", "home", "about", "contact")
    ):
        return False
    # Rare: CDN path without extension but with uploads segment — still require ext
    return False


def suburb_group(suburb: str) -> str:
    s = (suburb or "").strip()
    low = s.lower()
    if "queenswood" in low:
        return "Queenswood"
    if "waverley plaza" in low or "waverley border" in low or "/ waverley" in low:
        # Plaza & border sit on Hertzog / marketed as Waverley
        return "Waverley"
    if low.startswith("waverley") or low == "waverley":
        return "Waverley"
    if "villieria" in low:
        return "Villieria"
    # Fallback: first token
    return s.split("(")[0].split("/")[0].strip() or "Other"


def category_group(category: str) -> str:
    c = (category or "").lower()
    if any(
        k in c
        for k in (
            "butchery",
            "biltong",
            "meat",
            "chicken",
            "poultry",
            "purveyor",
        )
    ):
        return "Butchery & meat"
    if any(
        k in c
        for k in (
            "bakery",
            "cake",
            "home industry",
            "baked",
            "rusk",
            "tuisnywerheid",
        )
    ):
        return "Bakery & home industry"
    if any(
        k in c
        for k in (
            "restaurant",
            "takeaway",
            "cafe",
            "coffee",
            "bubble tea",
            "trattoria",
        )
    ):
        return "Food & drink"
    if any(
        k in c
        for k in (
            "gift",
            "craft",
            "antique",
            "vintage",
            "decor",
            "embroidery",
            "glass",
            "haberdashery",
            "fabric",
        )
    ):
        return "Gifts, craft & decor"
    if any(
        k in c
        for k in (
            "clothing",
            "tailor",
            "jewellery",
            "jeweller",
            "school",
            "boutique",
            "denim",
            "haberdashery",
        )
    ):
        return "Clothing & jewellery"
    if any(
        k in c
        for k in (
            "fruit",
            "veg",
            "grocer",
            "deli",
            "supermarket",
            "corner shop",
            "discount grocer",
        )
    ):
        return "Grocery & deli"
    if "pet" in c:
        return "Pets"
    if any(
        k in c
        for k in ("hardware", "building", "gas", "camping", "paint", "sand")
    ):
        return "Hardware & gas"
    if "pharmac" in c:
        return "Pharmacy"
    if any(k in c for k in ("garden", "florist", "flower")):
        return "Garden & florist"
    return "Other"


# Soft icon emoji for category placeholders (decorative; alt text carries meaning)
CATEGORY_ICON = {
    "Butchery & meat": "🥩",
    "Bakery & home industry": "🥖",
    "Food & drink": "🍽️",
    "Gifts, craft & decor": "🎁",
    "Clothing & jewellery": "👗",
    "Grocery & deli": "🥬",
    "Pets": "🐾",
    "Hardware & gas": "🔧",
    "Pharmacy": "💊",
    "Garden & florist": "🌸",
    "Other": "🏪",
}


def short_description(text: str, max_len: int = 140) -> str:
    t = (text or "").strip()
    if len(t) <= max_len:
        return t
    cut = t[: max_len - 1]
    if " " in cut:
        cut = cut.rsplit(" ", 1)[0]
    return cut.rstrip(",.;:") + "…"


def build() -> dict:
    if not CSV_PATH.is_file():
        raise SystemExit(f"CSV not found: {CSV_PATH}")

    shops = []
    with CSV_PATH.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader, start=1):
            name = (row.get("name") or "").strip()
            if not name:
                continue
            status = (row.get("status_notes") or "").strip()
            uncertain = "UNCERTAIN" in status.upper()
            raw_image = (row.get("image_source") or "").strip()
            has_direct = is_hotlinkable_image(raw_image)
            cat = (row.get("category") or "").strip()
            cgroup = category_group(cat)
            suburb = (row.get("suburb") or "").strip()
            sgroup = suburb_group(suburb)

            shops.append(
                {
                    "id": f"shop-{i:03d}",
                    "name": name,
                    "category": cat,
                    "category_group": cgroup,
                    "category_icon": CATEGORY_ICON.get(cgroup, "🏪"),
                    "suburb": suburb,
                    "suburb_group": sgroup,
                    "centre_or_cluster": (row.get("centre_or_cluster") or "").strip(),
                    "address": (row.get("street_address") or "").strip(),
                    "google_maps_link": (row.get("google_maps_link") or "").strip(),
                    "phone": (row.get("phone") or "").strip(),
                    "description": short_description(row.get("description") or ""),
                    "description_full": (row.get("description") or "").strip(),
                    "image_url": raw_image if has_direct else None,
                    "has_photo": has_direct,
                    "uncertain": uncertain,
                    "status_notes": status,
                }
            )

    data = {
        "title": "Moot Shops",
        "subtitle": "Villieria · Queenswood · Waverley",
        "generated_from": str(CSV_PATH.name),
        "count": len(shops),
        "uncertain_count": sum(1 for s in shops if s["uncertain"]),
        "suburb_groups": ["Villieria", "Queenswood", "Waverley"],
        "category_groups": sorted({s["category_group"] for s in shops}),
        "shops": shops,
    }
    OUT_PATH.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        f"Wrote {OUT_PATH} — {data['count']} shops "
        f"({data['uncertain_count']} marked uncertain)"
    )
    return data


if __name__ == "__main__":
    build()
