const WORKER_URL = 'https://kfc.deviyl.workers.dev/';
const MAX_LENGTH = 500;
const textarea = document.getElementById('suggestionInput');
const charCounter = document.getElementById('charCounter');
const submitBtn = document.getElementById('submitBtn');
const statusMessage = document.getElementById('statusMessage');

function updateCharCounter() {
    const remaining = MAX_LENGTH - textarea.value.length;
    charCounter.textContent = `${remaining} characters left`;
    charCounter.classList.toggle('warn', remaining <= 50);
}

textarea.addEventListener('input', updateCharCounter);
updateCharCounter();

function setStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = 'status-message' + (type ? ` ${type}` : '');
}

async function submitSuggestion() {
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

        setStatus('Thanks! Your suggestion has been submitted anonymously.', 'success');
        textarea.value = '';
        updateCharCounter();
    } catch (err) {
        setStatus(`Something went wrong: ${err.message}`, 'error');
    } finally {
        submitBtn.disabled = false;
    }
}
