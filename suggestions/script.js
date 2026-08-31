const WORKER_URL = 'https://kfc.deviyl.workers.dev/';
const MAX_LENGTH = 500;
const textarea = document.getElementById('suggestionInput');

if (textarea) {
    const charCounter = document.getElementById('charCounter');
    const submitBtn = document.getElementById('submitBtn');
    const statusMessage = document.getElementById('statusMessage');

    const COOLDOWN_MS = 24 * 60 * 60 * 1000; // one suggestion per day
    const LAST_SUBMIT_KEY = 'kfcSuggestionLastSubmitted';

    const updateCharCounter = () => {
        const remaining = MAX_LENGTH - textarea.value.length;
        charCounter.textContent = `${remaining} characters left`;
        charCounter.classList.toggle('warn', remaining <= 50);
    };

    textarea.addEventListener('input', updateCharCounter);
    updateCharCounter();

    const setStatus = (message, type) => {
        statusMessage.textContent = message;
        statusMessage.className = 'status-message' + (type ? ` ${type}` : '');
    };

    const formatRemaining = (ms) => {
        const totalMinutes = Math.ceil(ms / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    const msSinceLastSubmit = () => {
        const last = localStorage.getItem(LAST_SUBMIT_KEY);
        if (!last) return Infinity;
        const elapsed = Date.now() - new Date(last).getTime();
        return isNaN(elapsed) ? Infinity : elapsed;
    };

    const applyCooldownState = () => {
        const elapsed = msSinceLastSubmit();
        const remaining = COOLDOWN_MS - elapsed;

        if (remaining > 0) {
            textarea.disabled = true;
            submitBtn.disabled = true;
            setStatus(`You've already submitted a suggestion today. Try again in ${formatRemaining(remaining)}.`, 'pending');
            return true;
        }

        textarea.disabled = false;
        submitBtn.disabled = false;
        return false;
    };

    applyCooldownState();
    setInterval(applyCooldownState, 60 * 1000);

    window.submitSuggestion = async function submitSuggestion() {
        if (applyCooldownState()) return;

        const text = textarea.value.trim();

        if (!text) {
            setStatus('Please enter a suggestion before submitting.', 'error');
            return;
        }
        if (text.length > MAX_LENGTH) {
            setStatus(`Suggestion is too long (max ${MAX_LENGTH} characters).`, 'error');
            return;
        }

        submitBtn.disabled = true;
        setStatus('Submitting...', 'pending');

        try {
            const res = await fetch(WORKER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'send-suggestion', text }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok || data.error) {
                throw new Error(data.error || `HTTP ${res.status}`);
            }

            localStorage.setItem(LAST_SUBMIT_KEY, new Date().toISOString());
            setStatus('Thanks! Your suggestion has been submitted anonymously.', 'success');
            textarea.value = '';
            updateCharCounter();
            applyCooldownState();
        } catch (err) {
            setStatus(`Something went wrong: ${err.message}`, 'error');
            submitBtn.disabled = false;
        }
    };
}

const suggestionsList = document.getElementById('suggestionsList');

if (suggestionsList) {
    const passwordGate = document.getElementById('passwordGate');
    const adminPassword = document.getElementById('adminPassword');
    const unlockBtn = document.getElementById('unlockBtn');
    const adminStatus = document.getElementById('adminStatus');
    const refreshBtn = document.getElementById('refreshBtn');

    const setAdminStatus = (message, type) => {
        adminStatus.textContent = message;
        adminStatus.className = 'status-message' + (type ? ` ${type}` : '');
    };

    const formatTimestamp = (isoString) => {
        const date = new Date(isoString);
        if (isNaN(date)) return isoString;
        return date.toLocaleString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
            timeZone: 'UTC', timeZoneName: 'short',
        });
    };

    const renderSuggestions = (suggestions) => {
        if (!suggestions.length) {
            suggestionsList.innerHTML = '<div class="empty-state">No suggestions yet.</div>';
            return;
        }

        const sorted = [...suggestions].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        suggestionsList.innerHTML = sorted.map(s => `
            <div class="suggestion-card">
                <div class="suggestion-timestamp">${formatTimestamp(s.timestamp)}</div>
                <div class="suggestion-text"></div>
            </div>
        `).join('');

        suggestionsList.querySelectorAll('.suggestion-card').forEach((card, i) => {
            card.querySelector('.suggestion-text').textContent = sorted[i].text;
        });
    };

    const loadSuggestions = async () => {
        setAdminStatus('Loading suggestions...', 'pending');
        try {
            const res = await fetch(WORKER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get-suggestions' }),
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok || data.error) {
                throw new Error(data.error || `HTTP ${res.status}`);
            }

            renderSuggestions(data.suggestions || []);
            setAdminStatus(`Loaded ${data.suggestions ? data.suggestions.length : 0} suggestion(s).`, 'success');
        } catch (err) {
            setAdminStatus(`Failed to load suggestions: ${err.message}`, 'error');
        }
    };

    const unlock = async () => {
        const password = adminPassword.value;
        if (!password) {
            setAdminStatus('Enter the admin password.', 'error');
            return;
        }

        unlockBtn.disabled = true;
        setAdminStatus('Checking password...', 'pending');

        try {
            const res = await fetch(WORKER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'validate-password', password }),
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok || data.error) {
                throw new Error(data.error || 'Invalid password');
            }

            passwordGate.classList.add('hidden');
            suggestionsList.classList.remove('hidden');
            refreshBtn.classList.remove('hidden');
            await loadSuggestions();
        } catch (err) {
            setAdminStatus(`${err.message}`, 'error');
            unlockBtn.disabled = false;
        }
    };

    unlockBtn.addEventListener('click', unlock);
    adminPassword.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') unlock();
    });
    refreshBtn.addEventListener('click', loadSuggestions);
}
