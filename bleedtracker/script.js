let allAttacks = []; // master copy for filtering
let allRankedWars = []; // ranked war data

async function loadAttacks() {
  try {
    // Load attacks.json
    const response = await fetch('attacks.json');
    allAttacks = await response.json();

    // Load rankedwars.json
    try {
      const rwResponse = await fetch('rankedwars.json');
      allRankedWars = await rwResponse.json();
    } catch (err) {
      console.warn('Failed to load rankedwars.json:', err);
      allRankedWars = [];
    }

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

    // Event listener for filtering
    factionFilter.addEventListener('change', () => displayAttacks());

    // Initial display: show ALL attacks
    displayAttacks();
  } catch (err) {
    console.error('Failed to load attacks.json:', err);
  }
}

async function displayAttacks() {
  const tbody = document.querySelector('#attacks-table tbody');
  tbody.innerHTML = '';

  const selectedFaction = document.getElementById('faction-filter').value;
  const rwHeader = document.getElementById('rankedwar-header');

  if (selectedFaction === 'all') {
    rwHeader.textContent = '';
    hideBleedTable();
    // show all attacks
    allAttacks.forEach(attack => appendAttackRow(tbody, attack));
    return;
  }

  showBleedTable();

  // Find the most recent ranked war for this faction
  const matchedWar = allRankedWars.find(war =>
    war.factions.some(f => f.name === selectedFaction)
  );

  let warStart = 0;
  let warEnd = Date.now() / 1000; // default to now
  if (matchedWar) {
    warStart = matchedWar.start;
    warEnd = matchedWar.end === 0 ? Date.now() / 1000 : matchedWar.end;

    const startDate = new Date(warStart * 1000).toUTCString().slice(0, -4);
    const endDate =
      matchedWar.end === 0
        ? 'Ongoing'
        : new Date(warEnd * 1000).toUTCString().slice(0, -4);
    rwHeader.textContent = `Ranked War Against (${selectedFaction}) ** Start Time - ${startDate} — End Time (${endDate})`;
  } else {
    rwHeader.textContent = '';
  }

  const filtered = allAttacks.filter(attack => {
    const attackTime = attack.started;

    // include attacks from selected faction
    if (attack.attacker?.faction?.name === selectedFaction) return true;

    // include any ranked war attack during this ranked war period
    if (attack.is_ranked_war && attackTime >= warStart && attackTime <= warEnd) return true;

    return false;
  });

  // Populate attack table
  filtered.forEach(attack => appendAttackRow(tbody, attack));

  // Populate bleed table dynamically from faction-specific JSON
  await populateBleedTable(selectedFaction);
}

function appendAttackRow(tbody, attack) {
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
}

// BLEED TABLE FUNCTIONS

function showBleedTable() {
  let bleedDetails = document.getElementById('bleed-collapse');
  if (!bleedDetails) {
    bleedDetails = document.createElement('details');
    bleedDetails.id = 'bleed-collapse';
    bleedDetails.innerHTML = `
      <summary style="cursor: pointer;">Show Bleed Tracking</summary>
      <table id="bleed-table">
        <thead>
          <tr>
            <th>Member</th>
            <th>Bleed Count</th>
            <th>Respect Gain for Enemy</th>
            <th>Respect Loss for KFC</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    `;
    document.body.appendChild(bleedDetails);
  }
  bleedDetails.style.display = 'block';
}

function hideBleedTable() {
  const bleedDetails = document.getElementById('bleed-collapse');
  if (bleedDetails) {
    bleedDetails.style.display = 'none';
  }
}

async function populateBleedTable(selectedFaction) {
  const tbody = document.querySelector('#bleed-table tbody');
  tbody.innerHTML = '';

  try {
    const factionFile = `${selectedFaction.toLowerCase()}.json`;
    const response = await fetch(factionFile);
    const bleedData = await response.json();

    bleedData.forEach(entry => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${entry.name}</td>
        <td>${entry.count}</td>
        <td>${entry.respect_gain ?? 0}</td>
        <td>${entry.respect_loss ?? 0}</td>
      `;
      tbody.append(row);
    });
  } catch (err) {
    console.error(`Failed to load bleed data for ${selectedFaction}:`, err);
  }
}

// Run on page load
loadAttacks();
