import json
from pathlib import Path
import requests

RANKEDWARS_FILE = Path("./rankedwars.json")
API_URL = (
    "https://api.torn.com/v2/faction/rankedwars?"
    "offset=0&limit=20&sort=DESC&key=Z5VkJsXZ4h25Pffx"
)

def load_existing():
    if RANKEDWARS_FILE.exists():
        try:
            with open(RANKEDWARS_FILE, "r", encoding="utf-8") as f:
                parsed = json.load(f)
            if not isinstance(parsed, list):
                return []
            return parsed
        except json.JSONDecodeError:
            return []
    return []

def save_rankedwars(arr):
    with open(RANKEDWARS_FILE, "w", encoding="utf-8") as f:
        json.dump(arr, f, indent=2)

def main():
    existing = load_existing()
    existing_ids = {war["id"] for war in existing}

    response = requests.get(API_URL)
    response.raise_for_status()
    new_wars = response.json().get("rankedwars", [])
    added = 0

    # prepend new unique wars
    for war in new_wars:
        if war["id"] not in existing_ids:
            existing.insert(0, war)
            existing_ids.add(war["id"])
            added += 1

    save_rankedwars(existing)
    print(f"Fetched {len(new_wars)} ranked wars from API, added {added} new war(s). Total now: {len(existing)}")

if __name__ == "__main__":
    main()
