async function loadAttacks() {
  try {
    const response = await fetch('attacks.json');
    const attacks = await response.json();

    const tbody = document.querySelector('#attacks-table tbody');
    tbody.innerHTML = '';

    attacks.forEach(attack => {
      const attackerName = attack.attacker?.name ?? 'someone';
      const attackerFaction = attack.attacker?.faction?.name ?? 'none';
      const defenderName = attack.defender?.name ?? 'someone';
      const defenderFaction = attack.defender?.faction?.name ?? 'none';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${attack.id}</td>
        <td>${new Date(attack.started * 1000).toUTCString()}</td>
        <td>${new Date(attack.ended * 1000).toUTCString()}</td>
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
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error('Failed to load attacks.json:', err);
  }
}

loadAttacks();
