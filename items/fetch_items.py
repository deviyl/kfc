#!/usr/bin/env python3
"""
Fetch item data from the Torn API for item IDs 0–2000.
Runs at 1 request per 2 seconds to stay within rate limits.
Stops early if 10 consecutive IDs return {"error": {"code": 6}} (Incorrect ID),
assuming no further items exist beyond that point.
Outputs: items/item_prices.json  →  { "id": { "name": ..., "sell_price": ... }, ... }
"""
import json
import os
import time
from pathlib import Path
import requests

## -------------------------
## CONFIG
## -------------------------
API_KEY = os.environ.get("TORN_API_KEY")
if not API_KEY:
    raise EnvironmentError("TORN_API_KEY secret is not set.")

BASE_URL = "https://api.torn.com/v2/torn/{id}/items?key={key}"
ID_START = 0
ID_END = 10
DELAY_SECONDS = 2
CONSECUTIVE_MISSING_LIMIT = 20
OUTPUT_PATH = Path("items/item_prices.json")

# Set to True to delete the existing JSON and re-fetch everything from scratch
FORCE_REFRESH = False

## -------------------------
## HELPERS
## -------------------------
def fetch_item(item_id: int) -> dict | None:
    """Call the Torn API for a single item ID. Returns the parsed JSON or None on network error."""
    url = BASE_URL.format(id=item_id, key=API_KEY)
    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as exc:
        print(f"  [WARN] Request failed for ID {item_id}: {exc}")
        return None

def is_incorrect_id(data: dict) -> bool:
    """Return True if the API response is an 'Incorrect ID' error (code 6)."""
    error = data.get("error")
    return isinstance(error, dict) and error.get("code") == 6

def extract_item_data(data: dict) -> dict | None:
    """Pull name and sell_price out of the API response structure."""
    items = data.get("items")
    if not items or not isinstance(items, list):
        return None
    item = items[0]
    value = item.get("value") or {}
    return {
        "name": item.get("name"),
        "sell_price": value.get("sell_price"),
        "market_price": value.get("market_price"),
    }

## -------------------------
## MAIN
## -------------------------
def main():
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    if FORCE_REFRESH and OUTPUT_PATH.exists():
        OUTPUT_PATH.unlink()
        print("FORCE_REFRESH is True — deleted existing JSON, starting from scratch.")

    if OUTPUT_PATH.exists():
        with open(OUTPUT_PATH, "r") as f:
            prices: dict = json.load(f)
        print(f"Loaded {len(prices)} existing entries from {OUTPUT_PATH}")
    else:
        prices: dict = {}

    total = ID_END - ID_START + 1
    consecutive_missing = 0

    for item_id in range(ID_START, ID_END + 1):
        str_id = str(item_id)

        if str_id in prices:
            print(f"[{item_id}/{ID_END}] Already cached — skipping")
            continue

        print(f"[{item_id}/{ID_END}] Fetching ...", end=" ", flush=True)
        data = fetch_item(item_id)

        if data is None:
            prices[str_id] = {"name": None, "sell_price": None}
            print("request failed")
            consecutive_missing = 0
        elif is_incorrect_id(data):
            consecutive_missing += 1
            print(f"no item (consecutive missing: {consecutive_missing}/{CONSECUTIVE_MISSING_LIMIT})")
            if consecutive_missing >= CONSECUTIVE_MISSING_LIMIT:
                print(f"\nReached {CONSECUTIVE_MISSING_LIMIT} consecutive missing IDs — assuming no further items exist. Stopping.")
                break
        else:
            consecutive_missing = 0
            item_data = extract_item_data(data)
            prices[str_id] = item_data if item_data else {"name": None, "sell_price": None}
            print(f"name = {prices[str_id]['name']}, sell_price = {prices[str_id]['sell_price']}")

        with open(OUTPUT_PATH, "w") as f:
            json.dump(prices, f, indent=2)

        if item_id < ID_END:
            time.sleep(DELAY_SECONDS)

    with open(OUTPUT_PATH, "w") as f:
        json.dump(prices, f, indent=2)

    filled = sum(1 for v in prices.values() if v and v.get("sell_price") is not None)
    print(f"\nDone. {filled}/{total} items have a sell price → {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
