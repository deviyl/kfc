import json
from pathlib import Path
import requests

# File always in bleedtracker folder
ATTACKS_FILE = Path("bleedtracker/attacks.json")
API_URL = "https://api.torn.com/v2/faction/attacks?filters=incoming&limit=100&sort=DESC&key=Z5VkJsXZ4h25Pffx"

def load_existing():
    try:
        with open(ATTACKS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if not isinstance(data, list):
                return []
            return data
    except FileNotFoundError:
        return []

def save_attacks(attacks):
    with open(ATTACKS_FILE, "w", encoding="utf-8") as f:
        json.dump(attacks, f, indent=2)

def main():
    existing = load_existing()
    existing_ids = {a["id"] for a in existing}

    response = requests.get(API_URL)
    response.raise_for_status()
    api_attacks = response.json().get("attacks", [])

    # Combine existing with new unique attacks
    combined = existing + [a for a in api_attacks if a["id"] not in existing_ids]

    # Sort by 'started' descending to ensure newest attacks are first
    combined.sort(key=lambda x: x["started"], reverse=True)

    save_attacks(combined)
    print(f"Fetched {len(api_attacks)} attacks from API, added {len(combined) - len(existing)} new attack(s). Total now: {len(combined)}")

if __name__ == "__main__":
    main()
