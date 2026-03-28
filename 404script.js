document.addEventListener('DOMContentLoaded', function() {
    const errorUrlElement = document.getElementById('error-url');
    if (errorUrlElement) {
        errorUrlElement.textContent = window.location.pathname;
    }

    logInvalidURL();
});

async function logInvalidURL() {
    const attemptedURL = window.location.pathname;
    const timestamp = new Date().toISOString();
    const referrer = document.referrer || 'direct';
    const userAgent = navigator.userAgent;

    const logEntry = {
        url: attemptedURL,
        timestamp: timestamp,
        referrer: referrer,
        userAgent: userAgent
    };

    try {
        await sendLogToServer([logEntry]);
    } catch (error) {
        console.warn('Failed to log invalid URL:', error);
    }
}

async function sendLogToServer(logs) {
    try {
        const response = await fetch('https://api.kfc.workers.dev/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                action: 'log-invalid-url',
                logs: logs 
            })
        });

        if (!response.ok) {
            console.warn('Server did not accept log data:', response.status);
        }
    } catch (error) {
        console.warn('Could not send logs to server:', error);
        storeLogLocally(logs);
    }
}

function storeLogLocally(logs) {
    try {
        const storageKey = 'kfc_invalid_urls';
        const existing = localStorage.getItem(storageKey);
        let storedLogs = [];

        if (existing) {
            try {
                storedLogs = JSON.parse(existing);
                if (!Array.isArray(storedLogs)) {
                    storedLogs = [];
                }
            } catch (e) {
                storedLogs = [];
            }
        }

        const combined = [...storedLogs, ...logs].slice(-1000);
        localStorage.setItem(storageKey, JSON.stringify(combined));

        console.info('Logged to local storage. Total entries:', combined.length);
    } catch (error) {
        console.warn('Could not store logs locally:', error);
    }
}
