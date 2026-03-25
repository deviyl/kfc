const WORKER_URL = "https://kfc.deviyl.workers.dev/";
const COOKIE_NAME = "adminPassword";

function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/;SameSite=Strict";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function injectLinks(links) {
    const container = document.getElementById('cards-container');
    if (!container || !links) return;
    container.innerHTML = '';
    links.forEach(link => {
        const card = document.createElement('a');
        card.href = link.url;
        card.target = '_blank';
        card.className = 'link-card';
        card.innerHTML = `
            <div class="card-header">
                <span class="card-title">${link.title}</span>
            </div>
            <div class="card-body">
                <p class="card-description">${link.description}</p>
            </div>
        `;
        container.appendChild(card);
    });
}

async function apiCall(action, password) {
    try {
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, password })
        });
        return await response.json();
    } catch (error) {
        return { success: false };
    }
}

async function attemptAccess(password) {
    const auth = await apiCall('validate-password', password);
    if (auth.success) {
        const data = await apiCall('get-admin-links', password);
        if (data.success && data.links) {
            injectLinks(data.links);
            return true;
        }
    }
    return false;
}

function showContent() {
    const authPanel = document.getElementById('authPanel');
    const adminContent = document.getElementById('admin-content');
    if (authPanel) authPanel.style.display = 'none';
    if (adminContent) adminContent.style.display = 'block';
}

async function handleLogin(e) {
    if (e) e.preventDefault();
    const passwordInput = document.getElementById('adminPassword');
    const errorMsg = document.getElementById('authError');
    const password = passwordInput.value;
    
    errorMsg.style.display = 'none';
    errorMsg.textContent = '';

    if (await attemptAccess(password)) {
        setCookie(COOKIE_NAME, password, 7);
        showContent();
    } else {
        errorMsg.textContent = 'Invalid password. Access denied.';
        errorMsg.style.display = 'block';
    }
}

window.onload = async () => {
    const savedPassword = getCookie(COOKIE_NAME);
    if (savedPassword && await attemptAccess(savedPassword)) {
        showContent();
    }

    const authForm = document.getElementById('authForm');
    if (authForm) {
        authForm.addEventListener('submit', handleLogin);
    }
};
