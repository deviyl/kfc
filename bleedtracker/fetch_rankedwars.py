import json
from pathlib import Path
import requests

# File always in bleedtracker folder
WARS_FILE = Path("bleedtracker/rankedwars.json")
API_URL = "https://api.torn.com/v2/faction/rankedwars?offset=0&limit=20&sort=DESC&key=Z5VkJsXZ4h25Pffx"

def load_existing():
    try:
        with open(WARS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if not isinstance(data, list):
                return []
            return data
    except FileNotFoundError:
        return []

def save_wars(wars):
    with open(WARS_FILE, "w", encoding="utf-8") as f:
        json.dump(wars, f, indent=2)

def main():
    existing = load_existing()
    existing_ids = {w["id"] for w in existing}

    response = requests.get(API_URL)
    response.raise_for_status()
    api_wars = response.json().get("rankedwars", [])

    # Combine existing with new unique wars
    combined = existing + [w for w in api_wars if w["id"] not in existing_ids]

    # Sort newest → oldest based on 'start'
    combined.sort(key=lambda x: x["start"], reverse=True)

    save_wars(combined)
    print(
        f"Fetched {len(api_wars)} wars from API, "
        f"added {len(combined) - len(existing)} new war(s). Total now: {len(combined)}"
    )

if __name__ == "__main__":
    main()
