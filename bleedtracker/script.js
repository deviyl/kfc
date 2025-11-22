let allAttacks = []; // master copy for filtering

async function loadAttacks() {
  try {
    const response = await fetch('attacks.json');
    allAttacks = await response.json();

    // Populate faction filter dropdown with unique attacker factions from ranked war attacks
    const factionFilter = document.getElementById('faction-filter');
    const uniqueFactions = new Set();
    allAttacks.forEach(attack => {
      if (attack.is_ranked_war && attack.attacker?.faction?.name) {
        uniqueFactions.add(attack.attacker.faction.name);
      }
    });

    // Clear existing options except "All"
    factionFilter.innerHTML = '<option value="all">All</option>';
    Array.from(uniqueFactions)
      .sort()
      .forEach(factionName => {
        const option = document.createElement('option');
        option.value = factionName;
        option.textContent = factionName;
        factionFilter.appendChild(option);
      });

    // Add event listener for filtering
    factionFilter.addEventListener('change', () => displayAttacks());

    // Initial display: show ALL attacks
    displayAttacks();
  } catch (err) {
    console.error('Failed to load attacks.json:', err);
  }
}

function displayAttacks() {
  const tbody = document.querySelector('#attacks-table tbody');
  tbody.innerHTML = '';

  const selectedFaction = document.getElementById('faction-filter').value;

  // Filter attacks based on selection
  const filtered = allAttacks.filter(attack => {
    if (selectedFaction === 'all') return true; // show all attacks
    // only show attacks from the selected faction that are ranked war
    return attack.is_ranked_war && attack.attacker?.faction?.name === selectedFaction;
  });

  filtered.forEach(attack => {
    const attackerName = attack.attacker?.name ?? 'someone';
    const attackerFaction = attack.attacker?.faction?.name ?? 'none';
    const defenderName = attack.defender?.name ?? 'someone';
    const defenderFaction = attack.defender?.faction?.name ?? 'none';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${attack.id}</td>
      <td>${new Date(attack.started * 1000).toUTCString().slice(0, -4)}</td>
      <td>${new Date(attack.ended * 1000).toUTCString().slice(0, -4)}</td>
      <td>${attackerName}</td>
      <td>${attackerFaction}</td>
      <td>${defenderName}</td>
      <td>${defenderFaction}</td>
      <td>${attack.result}</td>
      <td>${attack.respect_gain ?? ''}</td>
      <td>${attack.respect_loss ?? ''}</td>
      <td>${attack.chain ?? ''}</td>
      <td>${attack.is_interrupted}</td>
      <td>${attack.is_stealthed}</td>
      <td>${attack.is_raid}</td>
      <td>${attack.is_ranked_war}</td>
    `;
    tbody.append(row);
  });
}

loadAttacks();
