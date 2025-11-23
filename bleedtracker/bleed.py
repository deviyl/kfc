import json

# Load attacks and ranked wars
with open('attacks.json', 'r') as f:
    attacks = json.load(f)

with open('rankedwars.json', 'r') as f:
    rankedwars = json.load(f)

# Take the first (most recent) war
current_war = rankedwars[0]
war_start = current_war['start']
war_end = current_war['end'] or float('inf')  # if end is 0, treat as ongoing
factions = current_war['factions']

# Determine enemy faction name
enemy_faction = next(f['name'] for f in factions if f['name'] != "Kentucky Fried Criminals")  # replace with your own team name if needed
enemy_file_name = enemy_faction.lower().replace(' ', '') + '.json'

# Collect unique defenders
bleeders = set()
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
    
    # Add defender name
    bleeders.add(attack['defender']['name'])

# Write to JSON
with open(enemy_file_name, 'w') as f:
    json.dump(list(bleeders), f, indent=2)

print(f"Saved {len(bleeders)} defenders to {enemy_file_name}")
