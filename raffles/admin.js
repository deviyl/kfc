const CONFIG = {
  github: {
    owner: 'deviyl',
    repo: 'kfc',
    branch: 'main',
  },
  raffles: {
    dirPath: 'raffles',
  },
  passwords: {
    admin: 'NogLovesToes',
  },
};

const GITHUB_WORKER = 'https://kfc.deviyl.workers.dev/';

let apiKey = '';
let currentRaffleData = null;
let selectedWinner = null;

// ============= Auth =============
document.getElementById('authForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = document.getElementById('adminPassword').value;
  const key = document.getElementById('apiKey').value;
  
  try {
    const response = await fetch(GITHUB_WORKER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'validate-password', password }),
    });
    
    const data = await response.json();
    if (data.success) {
      apiKey = key;
      localStorage.setItem('raffleApiKey', key);
      document.getElementById('authPanel').style.display = 'none';
      document.getElementById('adminPanel').style.display = 'block';
      loadRaffles();
    } else {
      showAuthError('Invalid password');
    }
  } catch (error) {
    showAuthError('Authentication failed: ' + error.message);
  }
});

function showAuthError(message) {
  const errorDiv = document.getElementById('authError');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('raffleApiKey');
  apiKey = '';
  document.getElementById('adminPanel').style.display = 'none';
  document.getElementById('authPanel').style.display = 'block';
  document.getElementById('authForm').reset();
});

document.getElementById('clearApiBtn').addEventListener('click', () => {
  localStorage.removeItem('raffleApiKey');
  apiKey = '';
  document.getElementById('apiKey').value = '';
});

// Check for saved API key on load
window.addEventListener('load', () => {
  const savedKey = localStorage.getItem('raffleApiKey');
  if (savedKey) {
    apiKey = savedKey;
    document.getElementById('apiKey').value = '••••••••';
  }
});

// ============= Raffle Creation =============
document.getElementById('newRaffleBtn').addEventListener('click', () => {
  document.getElementById('raffleFormContainer').style.display = 'block';
  document.getElementById('activeRaffleDisplay').style.display = 'none';
  document.getElementById('raffleFormTitle').textContent = 'Create New Raffle';
  document.getElementById('raffleForm').reset();
  currentRaffleData = null;
  updateCurrentRaffleName();
});

document.getElementById('loadRaffleBtn').addEventListener('click', async () => {
  await loadRaffles();
});

async function loadRaffles() {
  try {
    const response = await fetch(GITHUB_WORKER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list-raffles' }),
    });
    
    const data = await response.json();
    const raffleNames = data.raffles || [];
    
    const raffles = [];
    for (const name of raffleNames) {
      try {
        const raffleData = await fetchRaffleFromGitHub(name);
        raffles.push(raffleData);
      } catch (error) {
        console.error(`Failed to load raffle ${name}:`, error);
      }
    }
    
    showRaffleSelector(raffles);
  } catch (error) {
    console.error('Error loading raffles:', error);
    alert('Failed to load raffles');
  }
}

function showRaffleSelector(raffles) {
  if (raffles.length === 0) {
    alert('No raffles found. Create a new one!');
    return;
  }
  
  raffles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  const raffleNames = raffles.map(r => r.name);
  const selectedRaffle = prompt('Select a raffle:\n' + raffleNames.map((n, i) => `${i + 1}. ${n}`).join('\n') + '\n\nEnter the number:', '1');
  
  if (selectedRaffle) {
    const index = parseInt(selectedRaffle) - 1;
    if (index >= 0 && index < raffles.length) {
      displayRaffle(raffles[index]);
    }
  }
}

async function fetchRaffleFromGitHub(raffleName) {
  try {
    const timestamp = Date.now();
    const rawUrl = `https://raw.githubusercontent.com/deviyl/kfc/main/raffles/${encodeURIComponent(raffleName)}.json?t=${timestamp}`;
    const response = await fetch(rawUrl);
    
    if (!response.ok) {
      throw new Error('Raffle not found');
    }
    
    return await response.json();
  } catch (error) {
    throw error;
  }
}

document.getElementById('raffleForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const raffleName = document.getElementById('raffleName').value;
  const prize = document.getElementById('rafflePrize').value;
  const ticketCost = document.getElementById('ticketCost').value;
  const maxTickets = parseInt(document.getElementById('maxTickets').value);
  const maxPerPlayer = parseInt(document.getElementById('maxPerPlayer').value);
  
  const raffleData = {
    name: raffleName,
    prize,
    ticketCost,
    maxTickets,
    maxPerPlayer,
    createdAt: new Date().toISOString(),
    entries: [],
    totalTickets: 0,
    locked: false,
    winner: null,
  };
  
  currentRaffleData = raffleData;
  displayRaffle(raffleData);
  document.getElementById('raffleFormContainer').style.display = 'none';
  updateCurrentRaffleName();
});

function displayRaffle(raffleData) {
  currentRaffleData = raffleData;
  
  document.getElementById('activeRaffleDisplay').style.display = 'block';
  document.getElementById('raffleFormContainer').style.display = 'none';
  document.getElementById('entryManagementSection').style.display = 'block';
  
  document.getElementById('displayRaffleName').textContent = raffleData.name;
  document.getElementById('displayRafflePrize').textContent = raffleData.prize;
  document.getElementById('displayTicketCost').textContent = raffleData.ticketCost;
  document.getElementById('displayTicketsSold').textContent = `${raffleData.totalTickets || 0} / ${raffleData.maxTickets}`;
  document.getElementById('displayRaffleStatus').textContent = raffleData.locked ? '🔒 LOCKED' : 'Open';
  
  if (raffleData.locked && raffleData.winner) {
    document.getElementById('resultSection').style.display = 'block';
    document.getElementById('winnerDisplay').textContent = raffleData.winner.name;
    document.getElementById('entryManagementSection').style.display = 'none';
  } else {
    document.getElementById('resultSection').style.display = 'none';
  }
  
  updateTicketCapacity();
  displayEntries();
  updateCurrentRaffleName();
}

function updateCurrentRaffleName() {
  const nameElement = document.getElementById('currentRaffleName');
  if (currentRaffleData) {
    nameElement.textContent = currentRaffleData.name;
  } else {
    nameElement.textContent = 'No active raffle';
  }
}

// ============= Entry Management =============
document.getElementById('addEntryBtn').addEventListener('click', async () => {
  if (!currentRaffleData) {
    alert('Please create or load a raffle first');
    return;
  }
  
  if (currentRaffleData.locked) {
    alert('Cannot add entries to a locked raffle');
    return;
  }
  
  const playerId = parseInt(document.getElementById('playerIdInput').value);
  const ticketCount = parseInt(document.getElementById('ticketCountInput').value);
  
  if (!playerId || !ticketCount) {
    showPlayerError('Please enter both player ID and ticket count');
    return;
  }
  
  if (ticketCount > currentRaffleData.maxPerPlayer) {
    showPlayerError(`Cannot exceed max ${currentRaffleData.maxPerPlayer} tickets per player`);
    return;
  }
  
  const ticketsRemaining = currentRaffleData.maxTickets - (currentRaffleData.totalTickets || 0);
  if (ticketCount > ticketsRemaining) {
    showPlayerError(`Only ${ticketsRemaining} tickets remaining`);
    return;
  }
  
  try {
    const playerData = await fetchPlayerFromAPI(playerId);
    const playerName = playerData.player.name;
    
    const existingEntry = currentRaffleData.entries.find(e => e.playerId === playerId);
    if (existingEntry) {
      const newTotal = existingEntry.tickets + ticketCount;
      if (newTotal > currentRaffleData.maxPerPlayer) {
        showPlayerError(`Player already has ${existingEntry.tickets} tickets. Max is ${currentRaffleData.maxPerPlayer}`);
        return;
      }
      existingEntry.tickets = newTotal;
    } else {
      currentRaffleData.entries.push({
        playerId,
        playerName,
        tickets: ticketCount,
        paid: false,
      });
    }
    
    currentRaffleData.totalTickets = currentRaffleData.entries.reduce((sum, e) => sum + e.tickets, 0);
    
    document.getElementById('playerIdInput').value = '';
    document.getElementById('ticketCountInput').value = '';
    document.getElementById('playerError').style.display = 'none';
    displayEntries();
    updateTicketCapacity();
    document.getElementById('displayTicketsSold').textContent = `${currentRaffleData.totalTickets} / ${currentRaffleData.maxTickets}`;
  } catch (error) {
    showPlayerError('Player not found: ' + error.message);
  }
});

async function fetchPlayerFromAPI(playerId) {
  const response = await fetch(`https://api.torn.com/user/${playerId}?selections=&key=${apiKey}`);
  if (!response.ok) {
    throw new Error('Player not found');
  }
  return await response.json();
}

function displayEntries() {
  const container = document.getElementById('entriesContainer');
  container.innerHTML = '';
  
  if (!currentRaffleData.entries || currentRaffleData.entries.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary); grid-column: 1/-1;">No entries yet</p>';
    return;
  }
  
  currentRaffleData.entries.forEach((entry, index) => {
    const card = document.createElement('div');
    card.className = 'player-card';
    card.innerHTML = `
      <div class="player-info">
        <div class="player-name">${entry.playerName}</div>
        <div class="player-id">ID: ${entry.playerId} | Tickets: ${entry.tickets}</div>
        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">
          ${entry.paid ? '✓ Paid' : '⏳ Unpaid'}
        </div>
      </div>
      <div style="display: flex; gap: 6px;">
        <button class="toggle-paid-btn" data-index="${index}" style="padding: 8px 12px; background: ${entry.paid ? 'var(--success)' : 'var(--warning)'}; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">
          ${entry.paid ? '✓' : 'Mark Paid'}
        </button>
        <button class="player-remove" data-index="${index}">×</button>
      </div>
    `;
    container.appendChild(card);
  });
  
  document.querySelectorAll('.toggle-paid-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index);
      currentRaffleData.entries[index].paid = !currentRaffleData.entries[index].paid;
      displayEntries();
    });
  });
  
  document.querySelectorAll('.player-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index);
      currentRaffleData.entries.splice(index, 1);
      currentRaffleData.totalTickets = currentRaffleData.entries.reduce((sum, e) => sum + e.tickets, 0);
      displayEntries();
      updateTicketCapacity();
      document.getElementById('displayTicketsSold').textContent = `${currentRaffleData.totalTickets} / ${currentRaffleData.maxTickets}`;
    });
  });
}

function updateTicketCapacity() {
  if (!currentRaffleData) return;
  const remaining = currentRaffleData.maxTickets - (currentRaffleData.totalTickets || 0);
  const used = currentRaffleData.totalTickets || 0;
  document.getElementById('ticketCapacity').textContent = `${used} of ${currentRaffleData.maxTickets} tickets sold (${remaining} remaining)`;
}

function showPlayerError(message) {
  const errorDiv = document.getElementById('playerError');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  setTimeout(() => {
    errorDiv.style.display = 'none';
  }, 5000);
}

document.getElementById('saveEntriesBtn').addEventListener('click', async () => {
  if (!currentRaffleData) return;
  
  try {
    const response = await fetch(GITHUB_WORKER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save-raffle',
        raffleName: currentRaffleData.name,
        raffleData: currentRaffleData,
      }),
    });
    
    const data = await response.json();
    if (data.success) {
      alert('Entries saved successfully!');
    } else {
      alert('Failed to save entries: ' + data.error);
    }
  } catch (error) {
    alert('Error saving entries: ' + error.message);
  }
});

// ============= Draw Functionality =============
document.getElementById('readyToDrawBtn').addEventListener('click', () => {
  if (!currentRaffleData || !currentRaffleData.entries) {
    alert('No entries to draw from');
    return;
  }
  
  const paidEntries = currentRaffleData.entries.filter(e => e.paid);
  if (paidEntries.length === 0) {
    alert('No paid entries to draw from');
    return;
  }
  
  generateDrawTable(paidEntries);
  document.getElementById('drawModal').style.display = 'flex';
});

function generateDrawTable(entries) {
  // Create array with each entry repeated by ticket count
  const drawList = [];
  entries.forEach(entry => {
    for (let i = 0; i < entry.tickets; i++) {
      drawList.push({
        name: entry.playerName,
        id: entry.playerId,
      });
    }
  });
  
  // Shuffle
  for (let i = drawList.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [drawList[i], drawList[j]] = [drawList[j], drawList[i]];
  }
  
  // Create table with multiple columns (10 per column)
  const tableContainer = document.getElementById('drawTable');
  tableContainer.innerHTML = '';
  
  const columns = Math.ceil(drawList.length / 10);
  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  
  const tbody = document.createElement('tbody');
  
  for (let row = 0; row < 10; row++) {
    const tr = document.createElement('tr');
    
    for (let col = 0; col < columns; col++) {
      const index = col * 10 + row;
      const td = document.createElement('td');
      td.className = 'draw-cell';
      td.id = `draw-cell-${index}`;
      
      if (index < drawList.length) {
        td.textContent = drawList[index].name;
      }
      
      tr.appendChild(td);
    }
    
    tbody.appendChild(tr);
  }
  
  table.appendChild(tbody);
  tableContainer.appendChild(table);
  
  // Store draw list for later
  tableContainer.dataset.drawList = JSON.stringify(drawList);
}

document.getElementById('startDrawBtn').addEventListener('click', async () => {
  const tableContainer = document.getElementById('drawTable');
  const drawList = JSON.parse(tableContainer.dataset.drawList);
  
  document.getElementById('startDrawBtn').disabled = true;
  document.getElementById('cancelDrawBtn').disabled = true;
  
  const cellCount = drawList.length;
  const cycles = Math.floor(Math.random() * 9) + 2; // 2-10 cycles
  const totalHighlights = cellCount * cycles;
  
  let currentIndex = 0;
  
  for (let i = 0; i < totalHighlights; i++) {
    const cellIndex = i % cellCount;
    
    // Remove highlight from previous
    document.querySelectorAll('.draw-cell').forEach(cell => cell.classList.remove('highlight'));
    
    // Add highlight to current
    const cellId = `draw-cell-${cellIndex}`;
    document.getElementById(cellId).classList.add('highlight');
    
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  // Final winner
  const winnerIndex = Math.floor(Math.random() * cellCount);
  document.querySelectorAll('.draw-cell').forEach(cell => cell.classList.remove('highlight'));
  document.getElementById(`draw-cell-${winnerIndex}`).classList.add('highlight-winner');
  
  const winner = drawList[winnerIndex];
  selectedWinner = winner;
  
  // Show result
  setTimeout(() => {
    document.getElementById('drawModal').style.display = 'none';
    document.getElementById('entryManagementSection').style.display = 'none';
    document.getElementById('resultSection').style.display = 'block';
    document.getElementById('winnerDisplay').textContent = winner.name;
  }, 500);
});

document.getElementById('cancelDrawBtn').addEventListener('click', () => {
  document.getElementById('drawModal').style.display = 'none';
});

document.getElementById('closeDrawModal').addEventListener('click', () => {
  document.getElementById('drawModal').style.display = 'none';
});

document.getElementById('saveRaffleBtn').addEventListener('click', async () => {
  if (!selectedWinner || !currentRaffleData) {
    alert('No winner selected');
    return;
  }
  
  const confirmed = confirm('⚠️ WARNING: This will permanently lock the raffle and prevent any further changes. Are you sure?');
  if (!confirmed) return;
  
  currentRaffleData.locked = true;
  currentRaffleData.winner = selectedWinner;
  
  try {
    const response = await fetch(GITHUB_WORKER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save-raffle',
        raffleName: currentRaffleData.name,
        raffleData: currentRaffleData,
      }),
    });
    
    const data = await response.json();
    if (data.success) {
      alert('🎉 Raffle locked and saved! Winner: ' + selectedWinner.name);
      displayRaffle(currentRaffleData);
    } else {
      alert('Failed to save raffle: ' + data.error);
    }
  } catch (error) {
    alert('Error saving raffle: ' + error.message);
  }
});

document.getElementById('cancelRaffleBtn').addEventListener('click', () => {
  document.getElementById('raffleFormContainer').style.display = 'none';
});

document.getElementById('deleteRaffleBtn').addEventListener('click', async () => {
  if (!currentRaffleData) return;
  
  const confirmed = confirm('Are you sure you want to delete this raffle? This cannot be undone.');
  if (!confirmed) return;
  
  try {
    const response = await fetch(GITHUB_WORKER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete-raffle',
        raffleName: currentRaffleData.name,
      }),
    });
    
    const data = await response.json();
    if (data.success) {
      alert('Raffle deleted');
      currentRaffleData = null;
      document.getElementById('activeRaffleDisplay').style.display = 'none';
      document.getElementById('entryManagementSection').style.display = 'none';
      document.getElementById('raffleFormContainer').style.display = 'none';
      updateCurrentRaffleName();
    } else {
      alert('Failed to delete raffle: ' + data.error);
    }
  } catch (error) {
    alert('Error deleting raffle: ' + error.message);
  }
});

document.getElementById('editRaffleBtn').addEventListener('click', () => {
  document.getElementById('raffleFormContainer').style.display = 'block';
  document.getElementById('activeRaffleDisplay').style.display = 'none';
  document.getElementById('raffleFormTitle').textContent = 'Edit Raffle';
  
  document.getElementById('raffleName').value = currentRaffleData.name;
  document.getElementById('rafflePrize').value = currentRaffleData.prize;
  document.getElementById('ticketCost').value = currentRaffleData.ticketCost;
  document.getElementById('maxTickets').value = currentRaffleData.maxTickets;
  document.getElementById('maxPerPlayer').value = currentRaffleData.maxPerPlayer;
});
