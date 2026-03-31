const API_BASE = 'https://api.torn.com';
const CLOUDFLARE_WORKER = 'https://kfc.deviyl.workers.dev/';

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

function setCookie(name, value, days = 7) {
    const d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = `expires=${d.toUTCString()}`;
    document.cookie = `${name}=${value};${expires};path=/`;
}

function clearCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
}

let apiKey = getCookie('tornApiKey');
let currentRaffleData = null;
let selectedWinner = null;

async function callTornAPI(endpoint) {
    if (!apiKey) {
        throw new Error('API key not set');
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}&key=${apiKey}`);
        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('API Call Error:', error);
        throw error;
    }
}

async function getPlayerInfo(playerId) {
    try {
        const data = await callTornAPI(`/user/${playerId}/?selections=profile`);
        return {
            id: data.player_id,
            name: data.name,
        };
    } catch (error) {
        console.error(`Failed to fetch player ${playerId}:`, error);
        throw error;
    }
}

async function fetchRaffleFromGitHub(raffleName) {
    try {
        const timestamp = Date.now();
        const rawUrl = `https://raw.githubusercontent.com/deviyl/kfc/main/raffles/data/${encodeURIComponent(raffleName)}.json?t=${timestamp}`;
        const response = await fetch(rawUrl);
        
        if (!response.ok) {
            throw new Error('Raffle not found on GitHub');
        }
        
        const raffleData = await response.json();
        return raffleData;
    } catch (error) {
        console.error('Error fetching from GitHub:', error);
        throw error;
    }
}

document.getElementById('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('adminPassword').value;
    const key = document.getElementById('apiKey').value;
    
    try {
        const response = await fetch(CLOUDFLARE_WORKER, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'validate-password', password }),
        });
        
        const data = await response.json();
        if (data.success) {
            apiKey = key;
            setCookie('adminPassword', password);
            setCookie('tornApiKey', key);
            document.getElementById('authPanel').style.display = 'none';
            document.getElementById('adminPanel').style.display = 'block';
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

window.addEventListener('load', () => {
    const savedPassword = getCookie('adminPassword');
    const savedApiKey = getCookie('tornApiKey');
    
    if (savedPassword && savedApiKey) {
        apiKey = savedApiKey;
        document.getElementById('adminPassword').value = savedPassword;
        document.getElementById('apiKey').value = '••••••••';
        document.getElementById('authPanel').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
    }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    clearCookie('adminPassword');
    clearCookie('tornApiKey');
    apiKey = '';
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('authPanel').style.display = 'block';
    document.getElementById('authForm').reset();
});

document.getElementById('clearApiBtn').addEventListener('click', () => {
    clearCookie('tornApiKey');
    apiKey = '';
    document.getElementById('apiKey').value = '';
});

document.getElementById('newRaffleBtn').addEventListener('click', () => {
    document.getElementById('raffleFormContainer').style.display = 'block';
    document.getElementById('activeRaffleDisplay').style.display = 'none';
    document.getElementById('raffleFormTitle').textContent = 'Create New Raffle';
    document.getElementById('raffleForm').reset();
    
    const submitBtn = document.getElementById('raffleSubmitBtn');
    submitBtn.textContent = 'Create Raffle';
    
    currentRaffleData = null;
    updateCurrentRaffleName();
});

document.getElementById('loadRaffleBtn').addEventListener('click', async () => {
    const loadRaffleBtn = document.getElementById('loadRaffleBtn');
    const originalText = loadRaffleBtn.textContent;
    
    try {
        loadRaffleBtn.disabled = true;
        loadRaffleBtn.textContent = 'Fetching raffles...';
        
        const response = await fetch(CLOUDFLARE_WORKER, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'list-raffles',
            }),
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

        if (raffles.length === 0) {
            alert('No raffles found');
            loadRaffleBtn.disabled = false;
            loadRaffleBtn.textContent = originalText;
            return;
        }

        raffles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999;';
        
        const content = document.createElement('div');
        content.style.cssText = 'background:linear-gradient(135deg, var(--secondary-light) 0%, var(--bg-light) 100%);border:2px solid var(--primary);border-radius:8px;padding:32px;max-width:400px;color:var(--text-primary);';
        
        content.innerHTML = `<h2 style="font-size:20px;margin:0 0 24px 0;color:var(--primary);text-transform:uppercase;letter-spacing:1px;">Select Raffle to Load</h2>`;
        
        const select = document.createElement('select');
        select.className = 'event-dropdown';
        select.style.cssText = 'width:100%;margin-bottom:24px;';
        
        raffles.forEach(raffle => {
            const option = document.createElement('option');
            option.value = JSON.stringify(raffle);
            option.textContent = raffle.name;
            select.appendChild(option);
        });
        
        content.appendChild(select);
        
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display:flex;gap:12px;';
        
        const loadBtn = document.createElement('button');
        loadBtn.className = 'btn btn-primary';
        loadBtn.textContent = 'Load';
        loadBtn.style.cssText = 'flex:1;';
        loadBtn.addEventListener('click', () => {
            const selected = JSON.parse(select.value);
            document.body.removeChild(modal);
            displayRaffle(selected);
            loadRaffleBtn.disabled = false;
            loadRaffleBtn.textContent = originalText;
        });
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = 'flex:1;';
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
            loadRaffleBtn.disabled = false;
            loadRaffleBtn.textContent = originalText;
        });
        
        buttonContainer.appendChild(loadBtn);
        buttonContainer.appendChild(cancelBtn);
        content.appendChild(buttonContainer);
        
        modal.appendChild(content);
        document.body.appendChild(modal);
    } catch (error) {
        console.error('Error loading raffles:', error);
        alert('Failed to load raffles');
        loadRaffleBtn.disabled = false;
        loadRaffleBtn.textContent = originalText;
    }
});

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
        createdAt: currentRaffleData ? currentRaffleData.createdAt : new Date().toISOString(),
        entries: currentRaffleData ? currentRaffleData.entries : [],
        totalTickets: currentRaffleData ? currentRaffleData.totalTickets : 0,
        locked: currentRaffleData ? currentRaffleData.locked : false,
        winner: currentRaffleData ? currentRaffleData.winner : null,
    };
    
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Saving...';
    
    try {
        const response = await fetch(CLOUDFLARE_WORKER, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'save-raffle',
                raffleName: raffleName,
                raffleData: raffleData,
            }),
        });
        
        const data = await response.json();
        if (data.success) {
            currentRaffleData = raffleData;
            btn.textContent = '✓ Saved';
            setTimeout(() => {
                displayRaffle(raffleData);
                document.getElementById('raffleFormContainer').style.display = 'none';
                updateCurrentRaffleName();
                btn.textContent = originalText;
                btn.disabled = false;
            }, 2000);
        } else {
            btn.textContent = originalText;
            btn.disabled = false;
            alert('Failed to save raffle: ' + data.error);
        }
    } catch (error) {
        btn.textContent = originalText;
        btn.disabled = false;
        alert('Error saving raffle: ' + error.message);
    }
});

function displayRaffle(raffleData) {
    currentRaffleData = raffleData;
    
    document.getElementById('activeRaffleDisplay').style.display = 'block';
    document.getElementById('raffleFormContainer').style.display = 'none';
    document.getElementById('entryManagementSection').style.display = 'block';
    
    const raffleInfoContent = document.getElementById('raffleInfoContent');
    raffleInfoContent.innerHTML = `
        <div class="event-info">
            <div class="info-row">
                <span class="label">Raffle Name:</span>
                <span id="displayRaffleName" class="value"></span>
            </div>
            <div class="info-row">
                <span class="label">Prize:</span>
                <span id="displayRafflePrize" class="value"></span>
            </div>
            <div class="info-row">
                <span class="label">Ticket Cost:</span>
                <span id="displayTicketCost" class="value"></span>
            </div>
            <div class="info-row">
                <span class="label">Tickets Sold:</span>
                <span id="displayTicketsSold" class="value"></span>
            </div>
            <div class="info-row">
                <span class="label">Max Per Player:</span>
                <span id="displayMaxPerPlayer" class="value"></span>
            </div>
            <div class="info-row">
                <span class="label">Status:</span>
                <span id="displayRaffleStatus" class="value"></span>
            </div>
        </div>
    `;
    
    document.getElementById('displayRaffleName').textContent = raffleData.name;
    document.getElementById('displayRafflePrize').textContent = raffleData.prize;
    document.getElementById('displayTicketCost').textContent = raffleData.ticketCost;
    document.getElementById('displayTicketsSold').textContent = `${raffleData.totalTickets || 0} / ${raffleData.maxTickets}`;
    document.getElementById('displayMaxPerPlayer').textContent = raffleData.maxPerPlayer;
    document.getElementById('displayRaffleStatus').textContent = raffleData.locked ? '🔒 LOCKED' : 'Open';
    
    const actionButtons = document.getElementById('raffleActionButtons');
    actionButtons.innerHTML = `
        <button id="editRaffleBtn" class="btn btn-secondary">Edit Raffle</button>
        <button id="deleteRaffleBtn" class="btn btn-danger">Delete Raffle</button>
    `;
    
    document.getElementById('editRaffleBtn').addEventListener('click', handleEditRaffle);
    document.getElementById('deleteRaffleBtn').addEventListener('click', handleDeleteRaffle);
    
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
    
    setupToggleButton();
}

function setupToggleButton() {
    const toggleBtn = document.getElementById('toggleRaffleInfoBtn');
    const infoContent = document.getElementById('raffleInfoContent');
    const actionButtons = document.getElementById('raffleActionButtons');
    
    toggleBtn.addEventListener('click', () => {
        const isHidden = infoContent.style.display === 'none';
        infoContent.style.display = isHidden ? 'flex' : 'none';
        actionButtons.style.display = isHidden ? 'flex' : 'none';
        toggleBtn.textContent = isHidden ? '▼ Collapse' : '▶ Expand';
    });
}

function handleEditRaffle() {
    document.getElementById('raffleFormContainer').style.display = 'block';
    document.getElementById('activeRaffleDisplay').style.display = 'none';
    document.getElementById('raffleFormTitle').textContent = 'Edit Raffle';
    
    const submitBtn = document.getElementById('raffleSubmitBtn');
    submitBtn.textContent = 'Save Raffle';
    
    document.getElementById('raffleName').value = currentRaffleData.name;
    document.getElementById('rafflePrize').value = currentRaffleData.prize;
    document.getElementById('ticketCost').value = currentRaffleData.ticketCost;
    document.getElementById('maxTickets').value = currentRaffleData.maxTickets;
    document.getElementById('maxPerPlayer').value = currentRaffleData.maxPerPlayer;
}

function handleDeleteRaffle() {
    if (!currentRaffleData) return;
    
    const confirmed = confirm('Are you sure you want to delete this raffle? This cannot be undone.');
    if (!confirmed) return;
    
    (async () => {
        try {
            const response = await fetch(CLOUDFLARE_WORKER, {
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
    })();
}

    const nameElement = document.getElementById('currentRaffleName');
    if (currentRaffleData) {
        nameElement.textContent = currentRaffleData.name;
    } else {
        nameElement.textContent = 'No active raffle';
    }
}

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
        const playerData = await getPlayerInfo(playerId);
        const playerName = playerData.name;
        
        const existingEntry = currentRaffleData.entries.find(e => e.playerId === playerId);
        if (existingEntry) {
            const newTotal = existingEntry.tickets + ticketCount;
            if (newTotal > currentRaffleData.maxPerPlayer) {
                showPlayerError(`Player already has ${existingEntry.tickets} tickets. Max is ${currentRaffleData.maxPerPlayer}`);
                return;
            }
            existingEntry.tickets = newTotal;
            existingEntry.paid = false;
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
                <div class="player-id">ID: ${entry.playerId} | Tickets: ${entry.tickets}/${currentRaffleData.maxPerPlayer}</div>
                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">
                    ${entry.paid ? '✓ Paid' : '⏳ Unpaid'}
                </div>
            </div>
            <div style="display: flex; gap: 6px;">
                <button class="toggle-paid-btn" data-index="${index}" style="padding: 8px 12px; background: ${entry.paid ? 'var(--text-secondary)' : 'var(--warning)'}; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; ${entry.paid ? 'cursor: not-allowed;' : ''}">
                    ${entry.paid ? '✓ Paid' : 'Mark Paid'}
                </button>
                <button class="player-remove" data-index="${index}">×</button>
            </div>
        `;
        container.appendChild(card);
    });
    
    document.querySelectorAll('.toggle-paid-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            if (!currentRaffleData.entries[index].paid) {
                currentRaffleData.entries[index].paid = true;
                displayEntries();
            }
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
    
    const btn = document.getElementById('saveEntriesBtn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Saving...';
    
    try {
        const response = await fetch(CLOUDFLARE_WORKER, {
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
            btn.textContent = '✓ Saved';
            setTimeout(() => {
                btn.textContent = originalText;
                btn.disabled = false;
            }, 2000);
        } else {
            btn.textContent = originalText;
            btn.disabled = false;
            alert('Failed to save entries: ' + data.error);
        }
    } catch (error) {
        btn.textContent = originalText;
        btn.disabled = false;
        alert('Error saving entries: ' + error.message);
    }
});

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
    const drawList = [];
    entries.forEach(entry => {
        for (let i = 0; i < entry.tickets; i++) {
            drawList.push({
                name: entry.playerName,
                id: entry.playerId,
            });
        }
    });
    
    for (let i = drawList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [drawList[i], drawList[j]] = [drawList[j], drawList[i]];
    }
    
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
    
    tableContainer.dataset.drawList = JSON.stringify(drawList);
}

document.getElementById('startDrawBtn').addEventListener('click', async () => {
    const tableContainer = document.getElementById('drawTable');
    const drawList = JSON.parse(tableContainer.dataset.drawList);
    
    document.getElementById('startDrawBtn').disabled = true;
    document.getElementById('cancelDrawBtn').disabled = true;
    
    const cellCount = drawList.length;
    const cycles = Math.floor(Math.random() * 9) + 2;
    const totalHighlights = cellCount * cycles;
    
    for (let i = 0; i < totalHighlights; i++) {
        const cellIndex = i % cellCount;
        
        document.querySelectorAll('.draw-cell').forEach(cell => cell.classList.remove('highlight'));
        
        const cellId = `draw-cell-${cellIndex}`;
        const cell = document.getElementById(cellId);
        if (cell) {
            cell.classList.add('highlight');
            cell.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    const winnerIndex = Math.floor(Math.random() * cellCount);
    document.querySelectorAll('.draw-cell').forEach(cell => cell.classList.remove('highlight'));
    const winnerCell = document.getElementById(`draw-cell-${winnerIndex}`);
    if (winnerCell) {
        winnerCell.classList.add('highlight-winner');
        winnerCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    const winner = drawList[winnerIndex];
    selectedWinner = winner;
    
    document.getElementById('startDrawBtn').style.display = 'none';
    document.getElementById('startDrawBtn').disabled = false;
    document.getElementById('cancelDrawBtn').disabled = false;
    
    const saveBtn = document.createElement('button');
    saveBtn.id = 'saveWinnerBtn';
    saveBtn.className = 'btn btn-primary';
    saveBtn.textContent = 'Save Winner';
    saveBtn.style.cssText = 'flex:1;';
    
    const cancelBtn = document.getElementById('cancelDrawBtn');
    const footer = cancelBtn.parentElement;
    footer.insertBefore(saveBtn, cancelBtn);
    
    saveBtn.addEventListener('click', () => {
        document.getElementById('drawModal').style.display = 'none';
        document.getElementById('entryManagementSection').style.display = 'none';
        document.getElementById('resultSection').style.display = 'block';
        document.getElementById('winnerDisplay').textContent = winner.name;
    });
});

document.getElementById('cancelDrawBtn').addEventListener('click', () => {
    selectedWinner = null;
    document.getElementById('startDrawBtn').style.display = 'block';
    const saveWinnerBtn = document.getElementById('saveWinnerBtn');
    if (saveWinnerBtn) {
        saveWinnerBtn.remove();
    }
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
    
    const btn = document.getElementById('saveRaffleBtn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Saving...';
    
    try {
        const response = await fetch(CLOUDFLARE_WORKER, {
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
            btn.textContent = '✓ Locked';
            setTimeout(() => {
                displayRaffle(currentRaffleData);
                btn.textContent = originalText;
                btn.disabled = false;
            }, 2000);
        } else {
            btn.textContent = originalText;
            btn.disabled = false;
            alert('Failed to save raffle: ' + data.error);
        }
    } catch (error) {
        btn.textContent = originalText;
        btn.disabled = false;
        alert('Error saving raffle: ' + error.message);
    }
});

document.getElementById('cancelRaffleBtn').addEventListener('click', () => {
    document.getElementById('raffleFormContainer').style.display = 'none';
});
