#!/usr/bin/env python3

import json
import sys
from pathlib import Path
from urllib.request import urlopen, Request

URL = "https://tornprobability.com:3000/api/GetRoleWeights"
OUTPUT = Path(__file__).parent / "roleweights.json"

def fail(msg):
    print(msg)
    sys.exit(1)
try:
    req = Request(
        URL,
        headers={
            "User-Agent": "GitHubActions"
        }
    )
    with urlopen(req, timeout=30) as response:
        if response.status != 200:
            fail(f"HTTP {response.status}")
        raw = response.read().decode("utf-8")
except Exception as e:
    fail(str(e))

try:
    data = json.loads(raw)
except Exception:
    fail("Response is not valid JSON")
if not isinstance(data, dict):
    fail("Root JSON is not an object")

if len(data) == 0:
    fail("JSON object is empty")
for crime, roles in data.items():
    if not isinstance(roles, dict):
        fail(f"{crime} is not an object")
    if len(roles) == 0:
        fail(f"{crime} has no roles")
    for role, weight in roles.items():
        if not isinstance(weight, (int, float)):
            fail(f"{crime}/{role} is not numeric")
OUTPUT.write_text(
    json.dumps(data, indent=2, sort_keys=False),
    encoding="utf-8"
)
print(f"Saved {OUTPUT}")
