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

async function validate(password) {
    try {
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'validate-password',
                password: password
            })
        });

        const data = await response.json();
        return data.valid === true;
    } catch (error) {
        console.error('Auth error:', error);
        return false;
    }
}

function showContent() {
    document.getElementById('auth-panel').style.display = 'none';
    document.getElementById('admin-content').style.display = 'block';
}

async function handleLogin() {
    const password = document.getElementById('password-input').value;
    const errorMsg = document.getElementById('error-msg');
    
    errorMsg.style.display = 'none';

    if (await validate(password)) {
        setCookie(COOKIE_NAME, "validated", 7);
        showContent();
    } else {
        errorMsg.style.display = 'block';
    }
}

window.onload = async () => {
    if (getCookie(COOKIE_NAME)) {
        showContent();
    }

    document.getElementById('login-btn').addEventListener('click', handleLogin);
    document.getElementById('password-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
};
