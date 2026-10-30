const WORKER_URL = "https://bully.deviyl.workers.dev";

document.addEventListener("DOMContentLoaded", () => {
    const savedKey = getCookie("bully_key");
    if (savedKey) {
        loadDashboard(savedKey);
    } else {
        document.getElementById("auth-section").style.display = "block";
        document.getElementById("dashboard-section").style.display = "none";
        document.getElementById("logout-btn").style.display = "none";
    }

    document.getElementById("auth-submit-btn").addEventListener("click", handleLogin);
    document.getElementById("auth-key-input").addEventListener("keypress", (e) => {
        if (e.key === "Enter") handleLogin();
    });

    document.getElementById("logout-btn")?.addEventListener("click", logout);
    document.getElementById("add-key-btn").addEventListener("click", () => callAction("add_key", "new-api-key"));
    document.getElementById("add-user-btn").addEventListener("click", addUser);
});

function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function logout() {
    setCookie("bully_key", "", -1);
    document.getElementById("auth-section").style.display = "block";
    document.getElementById("dashboard-section").style.display = "none";
    document.getElementById("logout-btn").style.display = "none";
    showBanner("Logged out successfully.", false);
}

async function handleLogin() {
    const keyVal = document.getElementById("auth-key-input").value.trim();
    if (!keyVal) return;

    setCookie("bully_key", keyVal, 7);
    await loadDashboard(keyVal);
}

async function loadDashboard(apiKey) {
    clearBanner();
    try {
        const response = await fetch(`${WORKER_URL}/api/dashboard`, {
            method: "GET",
            headers: { "x-api-key": apiKey }
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Authentication failed.");

        document.getElementById("auth-section").style.display = "none";
        document.getElementById("dashboard-section").style.display = "block";
        document.getElementById("logout-btn").style.display = "block";

        renderUI(data);
    } catch (err) {
        setCookie("bully_key", "", -1);
        document.getElementById("auth-section").style.display = "block";
        document.getElementById("dashboard-section").style.display = "none";
        document.getElementById("logout-btn").style.display = "none";
        showBanner(err.message, true);
    }
}

function renderUI(config) {
    document.getElementById("keys-note").textContent = `These keys are stored and rotated for calls. Each key supports up to ${config.max_users_per_key} monitored users.`;

    const keysList = document.getElementById("api-keys-list");
    keysList.innerHTML = config.api_keys.length ? "" : `<div class="empty-notice">No API keys stored yet.</div>`;
    config.api_keys.forEach(k => {
        const item = document.createElement("div");
        item.className = "list-row";
        item.innerHTML = `<span>🔑 <strong>${k.name}</strong> [${k.user_id}]</span>`;
        keysList.appendChild(item);
    });

    const usersList = document.getElementById("monitored-users-list");
    usersList.innerHTML = config.monitored_users.length ? "" : `<div class="empty-notice">No users being monitored yet.</div>`;
    config.monitored_users.forEach(u => {
        const reasonDisplay = u.reason ? ` <span class="subsection-note">(${u.reason})</span>` : "";
        const item = document.createElement("div");
        item.className = "list-row";
        item.innerHTML = `
            <span>🎯 <strong>${u.name}</strong> [${u.user_id}]${reasonDisplay}</span>
            <button type="button" class="action-btn remove-btn" onclick="removeUser('${u.user_id}')">Remove</button>
        `;
        usersList.appendChild(item);
    });

    const adminContainer = document.getElementById("admin-container");
    if (config.is_leadership && config.admin_html) {
        adminContainer.innerHTML = config.admin_html;
        
        document.getElementById("add-leadership-btn").onclick = () => callAction("add_leadership_position", "new-leadership-pos");
        document.getElementById("settings-form").onsubmit = saveSettings;
        document.getElementById("test-ping-btn").onclick = () => callAction("test_ping");
        document.getElementById("run-check-btn").onclick = () => callAction("run_check");

        const posList = document.getElementById("leadership-positions-list");
        const defaultPositions = ["Leader", "Co-Leader", "Git Bucket Maintainer"];
        
        let posHtml = defaultPositions.map(p => `<div class="list-row"><span>🛡️ <strong>${p}</strong></span></div>`).join("");
        
        if (config.leadership_positions.length > 0) {
            posHtml += config.leadership_positions.map(p => `
                <div class="list-row">
                    <span>🛡️ <strong>${p}</strong></span>
                    <button type="button" class="action-btn remove-btn" onclick="removeLeadershipPosition('${p}')">Remove</button>
                </div>
            `).join("");
        }
        posList.innerHTML = posHtml;

        document.getElementById("cooldown-minutes").value = config.cooldown_minutes;
        document.getElementById("ping-toggle").checked = (config.ping_type === "role");
        document.getElementById("webhook-status").textContent = config.webhook_set ? "[Configured]" : "[Not Configured]";
        document.getElementById("role-status").textContent = config.role_id_set ? "[Configured]" : "[Not Configured]";
    } else {
        adminContainer.innerHTML = "";
    }
}

async function callAction(action, inputId = null) {
    clearBanner();
    const apiKey = getCookie("bully_key");
    const value = inputId ? document.getElementById(inputId).value.trim() : null;

    try {
        const response = await fetch(`${WORKER_URL}/api/action`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": apiKey },
            body: JSON.stringify({ action, value })
        });
        const res = await response.json();
        if (!response.ok) throw new Error(res.error);

        if (inputId) document.getElementById(inputId).value = "";
        showBanner("Action executed successfully!", false);

        if (action !== "run_check") {
            loadDashboard(apiKey);
        }
    } catch (err) {
        showBanner(err.message, true);
    }
}

async function addUser() {
    clearBanner();
    const apiKey = getCookie("bully_key");
    const userId = document.getElementById("new-user-id").value.trim();
    const reason = document.getElementById("new-user-reason").value.trim();

    try {
        const response = await fetch(`${WORKER_URL}/api/action`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": apiKey },
            body: JSON.stringify({ action: "add_user", user_id: userId, reason: reason })
        });
        const res = await response.json();
        if (!response.ok) throw new Error(res.error);

        document.getElementById("new-user-id").value = "";
        document.getElementById("new-user-reason").value = "";
        showBanner("Monitored user added successfully!", false);
        loadDashboard(apiKey);
    } catch (err) {
        showBanner(err.message, true);
    }
}

async function removeUser(userId) {
    clearBanner();
    const apiKey = getCookie("bully_key");
    try {
        const response = await fetch(`${WORKER_URL}/api/action`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": apiKey },
            body: JSON.stringify({ action: "remove_user", value: userId })
        });
        const res = await response.json();
        if (!response.ok) throw new Error(res.error);

        showBanner("Monitored user removed.", false);
        loadDashboard(apiKey);
    } catch (err) {
        showBanner(err.message, true);
    }
}

async function removeLeadershipPosition(positionName) {
    clearBanner();
    const apiKey = getCookie("bully_key");
    try {
        const response = await fetch(`${WORKER_URL}/api/action`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": apiKey },
            body: JSON.stringify({ action: "remove_leadership_position", value: positionName })
        });
        const res = await response.json();
        if (!response.ok) throw new Error(res.error);

        showBanner("Leadership position removed.", false);
        loadDashboard(apiKey);
    } catch (err) {
        showBanner(err.message, true);
    }
}

async function saveSettings(e) {
    e.preventDefault();
    clearBanner();

    const apiKey = getCookie("bully_key");
    const isRolePing = document.getElementById("ping-toggle").checked;

    const payload = {
        action: "save_settings",
        cooldown_minutes: parseInt(document.getElementById("cooldown-minutes").value) || 60,
        ping_type: isRolePing ? "role" : "user",
        discord_webhook: document.getElementById("discord-webhook").value.trim(),
        discord_role_id: document.getElementById("discord-role-id").value.trim()
    };

    try {
        const response = await fetch(`${WORKER_URL}/api/action`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": apiKey },
            body: JSON.stringify(payload)
        });
        const res = await response.json();
        if (!response.ok) throw new Error(res.error);

        document.getElementById("discord-webhook").value = "";
        document.getElementById("discord-role-id").value = "";
        showBanner("Settings saved successfully!", false);
        loadDashboard(apiKey);
    } catch (err) {
        showBanner(err.message, true);
    }
}

function showBanner(message, isError) {
    const banner = document.getElementById("alert-banner");
    banner.innerHTML = `<div class="${isError ? 'error-banner' : 'success-banner'}">${message}</div>`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearBanner() {
    document.getElementById("alert-banner").innerHTML = "";
}
