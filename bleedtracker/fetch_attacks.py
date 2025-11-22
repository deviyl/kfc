import json
import requests
from pathlib import Path

ATTACKS_FILE = Path("bleedtracker/attacks.json")
API_URL = "https://api.torn.com/v2/faction/attacks?filters=incoming&limit=100&sort=DESC&key=Z5VkJsXZ4h25Pffx"

def load_existing():
    if not ATTACKS_FILE.exists():
        return []
    try:
        with ATTACKS_FILE.open("r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return data
            return []
    except Exception:
        return []

def save_attacks(arr):
    with ATTACKS_FILE.open("w", encoding="utf-8") as f:
        json.dump(arr, f, indent=2)

def main():
    existing = load_existing()
    existing_ids = {a["id"] for a in existing}

    response = requests.get(API_URL)
    response.raise_for_status()
    new_attacks = response.json().get("attacks", [])
    added = 0

    # prepend new unique attacks
    for attack in new_attacks:
        if attack["id"] not in existing_ids:
            existing.insert(0, attack)
            existing_ids.add(attack["id"])
            added += 1

    save_attacks(existing)
    print(f"Fetched {len(new_attacks)} attacks from API, added {added} new attack(s). Total now: {len(existing)}")

if __name__ == "__main__":
    main()
