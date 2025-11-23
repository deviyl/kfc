import json

# Load attacks and ranked wars
with open('bleedtracker/attacks.json', 'r') as f:
    attacks = json.load(f)

with open('bleedtracker/rankedwars.json', 'r') as f:
    rankedwars = json.load(f)

# Take the first (most recent) war
current_war = rankedwars[0]
war_start = current_war['start']
war_end = current_war['end'] or float('inf')  # if end is 0, treat as ongoing
factions = current_war['factions']

# Determine enemy faction name (your faction is assumed to be the one NOT the enemy)
our_faction_name = "Kentucky Fried Criminals"  # change if needed
enemy_faction = next(f['name'] for f in factions if f['name'] != our_faction_name)
enemy_file_name = f"bleedtracker/{enemy_faction.lower().replace(' ', '')}.json"

# Collect defenders with counts and respect totals
bleeders = {}

for attack in attacks:
    # Check time
    if not (war_start <= attack['started'] <= war_end and war_start <= attack['ended'] <= war_end):
        continue
    
    # Check result
    if attack['result'] not in ["Attacked", "Hospitalized", "Mugged"]:
        continue
    
    # Check attacker faction
    attacker_faction_name = attack.get('attacker', {}).get('faction', {}).get('name') if attack.get('attacker') else None
    if attacker_faction_name != enemy_faction and not (attack.get('attacker') is None and attack.get('is_ranked_war') is True):
        continue
    
    defender_name = attack['defender']['name']
    
    # Initialize if not present
    if defender_name not in bleeders:
        bleeders[defender_name] = {
            "count": 1,
            "respect_gain": attack.get("respect_gain", 0),
            "respect_loss": attack.get("respect_loss", 0)
        }
    else:
        bleeders[defender_name]["count"] += 1
        bleeders[defender_name]["respect_gain"] += attack.get("respect_gain", 0)
        bleeders[defender_name]["respect_loss"] += attack.get("respect_loss", 0)

# Convert to list of objects sorted alphabetically by name
bleeders_list = [
    {
        "name": name,
        "count": data["count"],
        "respect_gain": round(data["respect_gain"], 2),
        "respect_loss": round(data["respect_loss"], 2)
    }
    for name, data in sorted(bleeders.items())
]

# Write initial JSON
with open(enemy_file_name, 'w') as f:
    json.dump(bleeders_list, f, indent=2)

# Re-read the saved file and sort alphabetically
with open(enemy_file_name, 'r') as f:
    data = json.load(f)

# Sort defenders alphabetically
data_sorted = sorted(data, key=lambda x: x['name'].lower())

# Compute totals
total_count = sum(d["count"] for d in data_sorted)
total_respect_gain = sum(d["respect_gain"] for d in data_sorted)
total_respect_loss = sum(d["respect_loss"] for d in data_sorted)

# Append totals row
data_sorted.append({
    "name": "Total",
    "count": total_count,
    "respect_gain": round(total_respect_gain, 2),
    "respect_loss": round(total_respect_loss, 2)
})

# Rewrite the JSON with totals at the end
with open(enemy_file_name, 'w') as f:
    json.dump(data_sorted, f, indent=2)

print(f"Saved {len(data_sorted)-1} defenders + totals to {enemy_file_name}")
