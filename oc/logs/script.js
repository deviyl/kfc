let globalLogData = null;
let alertTypes = new Set();
let alertStates = {};

document.addEventListener("DOMContentLoaded", () => {
  fetchLogData();
  setupSearch();
});

async function fetchLogData() {
  const statusEl = document.getElementById("status-message");
  const containerEl = document.getElementById("tables-container");

  try {
    const response = await fetch("./log.json");
    if (!response.ok) {
      throw new Error(`Failed to load log.json: HTTP ${response.status}`);
    }

    globalLogData = await response.json();
    statusEl.style.display = "none";

    extractAlertTypes(globalLogData);
    renderAlertFilters();
    updateView();
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Error loading log data.";
    statusEl.classList.add("error-message");
  }
}

function extractAlertTypes(data) {
  alertTypes.clear();
  Object.values(data).forEach((userObj) => {
    const entries = userObj.entries || [];
    entries.forEach((entry) => {
      if (entry.alert) {
        alertTypes.add(entry.alert);
      }
    });
  });

  alertTypes.forEach((alertName) => {
    const saved = localStorage.getItem(`alert_filter_${alertName}`);
    alertStates[alertName] = saved !== null ? saved === "true" : true;
  });
}

function renderAlertFilters() {
  const filtersContainer = document.getElementById("alert-filters");
  filtersContainer.innerHTML = "";

  alertTypes.forEach((alertName) => {
    const label = document.createElement("label");
    label.className = "filter-chip";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = alertStates[alertName];
    
    checkbox.addEventListener("change", (e) => {
      alertStates[alertName] = e.target.checked;
      localStorage.setItem(`alert_filter_${alertName}`, e.target.checked);
      updateView();
    });

    label.appendChild(checkbox);
    label.append(` ${alertName}`);
    filtersContainer.appendChild(label);
  });
}

function setupSearch() {
  const searchInput = document.getElementById("search-input");
  searchInput.addEventListener("input", () => {
    updateView();
  });
}

function updateView() {
  if (!globalLogData) return;
  const searchInput = document.getElementById("search-input");
  const query = searchInput.value.toLowerCase().trim();
  const containerEl = document.getElementById("tables-container");
  renderUserTables(globalLogData, containerEl, query);
}

function renderUserTables(data, container, filterQuery) {
  container.innerHTML = "";
  const userIds = Object.keys(data);

  let renderedCount = 0;

  userIds.forEach((userId) => {
    const userObj = data[userId];
    const username = userObj.name || "Unknown";
    const entries = userObj.entries || [];

    const usernameLower = username.toLowerCase();
    const idStr = userId.toLowerCase();
    const matchesSearch = !filterQuery || usernameLower.includes(filterQuery) || idStr.includes(filterQuery);

    if (!matchesSearch) return;

    const filteredEntries = entries.filter((entry) => {
      const alertName = entry.alert;
      if (!alertName) return true;
      return alertStates[alertName] !== false;
    });

    if (filteredEntries.length === 0) return;

    renderedCount++;
    filteredEntries.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    const panel = document.createElement("section");
    panel.className = "user-panel";

    const title = document.createElement("h2");
    title.textContent = `${username} [${userId}]`;
    panel.appendChild(title);

    const tableWrapper = document.createElement("div");
    tableWrapper.className = "table-wrapper";

    const table = document.createElement("table");
    table.innerHTML = `
      <thead>
        <tr>
          <th>Timestamp</th>
          <th>Crime ID</th>
          <th>Crime Name</th>
          <th>Alert</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");

    filteredEntries.forEach((entry) => {
      const row = document.createElement("tr");

      const formattedTime = formatTimestampTCT(entry.timestamp);
      const detailsHtml = formatDetails(entry.details);

      row.innerHTML = `
        <td class="timestamp">${formattedTime}</td>
        <td>${entry.crimeId ?? "N/A"}</td>
        <td><strong>${escapeHtml(entry.crimeName ?? "N/A")}</strong></td>
        <td><span class="alert-badge">${escapeHtml(entry.alert ?? "N/A")}</span></td>
        <td>${detailsHtml}</td>
      `;

      tbody.appendChild(row);
    });

    tableWrapper.appendChild(table);
    panel.appendChild(tableWrapper);
    container.appendChild(panel);
  });

  if (renderedCount === 0) {
    container.innerHTML = "<p class='hint'>No matching entries found.</p>";
  }
}

function formatTimestampTCT(timestamp) {
  if (!timestamp) return "N/A";
  
  const ms = timestamp < 1e11 ? timestamp * 1000 : timestamp;
  const date = new Date(ms);

  if (isNaN(date.getTime())) return "Invalid Date";

  const YYYY = date.getUTCFullYear();
  const MM = String(date.getUTCMonth() + 1).padStart(2, "0");
  const DD = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");

  return `${YYYY}-${MM}-${DD} ${hh}:${mm}:${ss} TCT`;
}

function formatDetails(details) {
  if (!details || typeof details !== "object" || Object.keys(details).length === 0) {
    return "-";
  }

  const items = Object.entries(details)
    .map(([key, val]) => {
      const formattedVal = typeof val === "number" && !Number.isInteger(val) 
        ? val.toFixed(2) 
        : val;
      return `<li><span class="details-key">${escapeHtml(key)}:</span> <span class="details-val">${escapeHtml(String(formattedVal))}</span></li>`;
    })
    .join("");

  return `<ul class="details-list">${items}</ul>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
