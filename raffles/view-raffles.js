const raffleSelect = document.getElementById('raffleSelect');
const raffleInfoPanel = document.getElementById('raffleInfoPanel');
const emptyState = document.getElementById('emptyState');

const GITHUB_WORKER = 'https://kfc.deviyl.workers.dev/';

let currentRaffleData = null;

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
        console.error('Error fetching from GitHub:', error);
        throw error;
    }
}

async function loadAllRaffles() {
    try {
        const response = await fetch(GITHUB_WORKER, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'list-raffles',
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch raffle list');
        }

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
        
        return raffles;
    } catch (error) {
        console.error('Error loading raffles:', error);
        return [];
    }
}

async function populateRaffleSelector() {
    const raffles = await loadAllRaffles();

    if (raffles.length === 0) {
        raffleInfoPanel.style.display = 'none';
        emptyState.style.display = 'block';
        raffleSelect.innerHTML = '<option value="">No raffles available</option>';
        raffleSelect.disabled = true;
        return;
    }

    emptyState.style.display = 'none';
    raffleSelect.disabled = false;

    raffles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    raffleSelect.innerHTML = '';
    raffles.forEach((raffle, index) => {
        const option = document.createElement('option');
        option.value = raffle.name;
        option.textContent = raffle.name;
        raffleSelect.appendChild(option);
    });

    if (raffles.length > 0) {
        raffleSelect.value = raffles[0].name;
        displayRaffle(raffles[0]);
    }
}

raffleSelect.addEventListener('change', async (e) => {
    if (!e.target.value) return;

    try {
        const raffleData = await fetchRaffleFromGitHub(e.target.value);
        displayRaffle(raffleData);
    } catch (error) {
        console.error('Error loading raffle:', error);
    }
});

document.getElementById('refreshBtn').addEventListener('click', async () => {
    const refreshBtn = document.getElementById('refreshBtn');
    const originalText = refreshBtn.textContent;
    refreshBtn.disabled = true;
    refreshBtn.textContent = 'Refreshing...';
    
    try {
        const selectedRaffle = document.getElementById('raffleSelect').value;
        if (selectedRaffle) {
            const raffleData = await fetchRaffleFromGitHub(selectedRaffle);
            displayRaffle(raffleData);
            refreshBtn.textContent = '✓ Updated';
            setTimeout(() => {
                refreshBtn.textContent = originalText;
            }, 2000);
        }
    } catch (error) {
        console.error('Error refreshing:', error);
        refreshBtn.textContent = '✗ Error';
        setTimeout(() => {
            refreshBtn.textContent = originalText;
        }, 2000);
    } finally {
        refreshBtn.disabled = false;
    }
});

function displayRaffle(raffleData) {
    currentRaffleData = raffleData;
    raffleInfoPanel.style.display = 'block';

    document.getElementById('raffleTitle').textContent = raffleData.name;
    document.getElementById('rafflePrizeDisplay').textContent = raffleData.prize;
    document.getElementById('raffleTicketCostDisplay').textContent = raffleData.ticketCost;

    // Show prize section
    document.querySelector('.prizes-section').style.display = 'block';
    document.getElementById('prizeDisplay').textContent = raffleData.prize;

    // Show winner if raffle is locked
    if (raffleData.locked && raffleData.winner) {
        document.getElementById('winnerSection').style.display = 'block';
        document.getElementById('winnerName').textContent = raffleData.winner.name;
    } else {
        document.getElementById('winnerSection').style.display = 'none';
    }

    displayEntries(raffleData);
}

function displayEntries(raffleData) {
    const entriesDisplay = document.getElementById('entriesDisplay');
    entriesDisplay.innerHTML = '';

    if (!raffleData || !raffleData.entries || raffleData.entries.length === 0) {
        entriesDisplay.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 32px;">No paid entries yet</p>';
        return;
    }

    // Filter to only show paid entries
    const paidEntries = raffleData.entries.filter(entry => entry.paid);

    if (paidEntries.length === 0) {
        entriesDisplay.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 32px;">No paid entries yet</p>';
        return;
    }

    // Create table
    let tableHtml = '<div class="standings-table-wrapper"><table class="standings-table"><thead><tr>';
    tableHtml += '<th>Player ID</th><th>Player Name</th><th>Tickets</th></tr></thead><tbody>';

    paidEntries.forEach((entry) => {
        tableHtml += `<tr>
            <td class="standings-rank">${entry.playerId}</td>
            <td class="standings-name">${entry.playerName}</td>
            <td class="standings-score">${entry.tickets}</td>
        </tr>`;
    });

    tableHtml += '</tbody></table></div>';
    entriesDisplay.innerHTML = tableHtml;
}

let autoRefreshEnabled = true;
const REFRESH_INTERVAL = 30000; // 30 seconds

async function autoRefresh() {
    if (autoRefreshEnabled && currentRaffleData) {
        try {
            const updated = await fetchRaffleFromGitHub(currentRaffleData.name);
            currentRaffleData = updated;
            displayEntries(updated);
            
            // Update winner if raffle just got locked
            if (updated.locked && updated.winner) {
                document.getElementById('winnerSection').style.display = 'block';
                document.getElementById('winnerName').textContent = updated.winner.name;
            }
        } catch (error) {
            console.error('Auto-refresh failed:', error);
        }
    }
}

setInterval(autoRefresh, REFRESH_INTERVAL);

document.addEventListener('DOMContentLoaded', () => {
    populateRaffleSelector();
});
