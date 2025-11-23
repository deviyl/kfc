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

# Collect defenders with counts
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
    
    # Increment count
    if defender_name not in bleeders:
        bleeders[defender_name] = 1
    else:
        bleeders[defender_name] += 1

# Convert to list of objects sorted alphabetically by defender name
bleeders_list = [{"name": name, "count": count} for name, count in sorted(bleeders.items())]

# Write to JSON
with open(enemy_file_name, 'w') as f:
    json.dump(bleeders_list, f, indent=2)

print(f"Saved {len(bleeders_list)} defenders to {enemy_file_name}")

# Re-read the saved file and ensure alphabetical order
with open(enemy_file_name, 'r') as f:
    data = json.load(f)

# Sort alphabetically by defender name
data_sorted = sorted(data, key=lambda x: x['name'].lower())

# Save again
with open(enemy_file_name, 'w') as f:
    json.dump(data_sorted, f, indent=2)

print(f"Final file re-saved in alphabetical order: {enemy_file_name}")

