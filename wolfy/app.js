// ---------------------------------------------------------------------------
// When the page loads, attach event listeners
// ---------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    const loadWarsBtn = document.getElementById("load-wars");
    const warSelect = document.getElementById("wars");

    if (!loadWarsBtn || !warSelect) {
        console.error("HTML elements not found. Check element IDs.");
        return;
    }

    loadWarsBtn.addEventListener("click", () => {
        const key = document.getElementById("apikey").value.trim();
        if (!key) {
            alert("Please enter an API key.");
            return;
        }
        showWars(key);
    });

    warSelect.addEventListener("change", (e) => {
        if (e.target.value) {
            showData(e.target.value);
        }
    });
});

// ---------------------------------------------------------------------------
// Loading Indicator
// ---------------------------------------------------------------------------
function toggleLoading(isVisible, message = "") {
    const indicator = document.getElementById("loading-indicator");
    const spinnerHtml = '<span class="spinner">⏳</span>';
    if (indicator) {
        indicator.style.display = isVisible ? "block" : "none";
        indicator.innerHTML = isVisible ? `${spinnerHtml} ${message}` : "";
    }
}

// ---------------------------------------------------------------------------
// Fetch the list of ranked wars
// ---------------------------------------------------------------------------
function showWars(ApiKey) {
    toggleLoading(true, "Fetching wars list...");
    fetch(`https://api.torn.com/faction/?selections=rankedwars&key=${ApiKey}`) // old api
    //fetch(`https://api.torn.com/v2/faction/rankedwars?limit=20&key=${ApiKey}`) //v2 api
        .then(response => response.json())
        .then(data => showRankedWars(data))
        .catch(err => {
            toggleLoading(true, `Error: ${err.message}. Check API key.`);
        })
}

// ---------------------------------------------------------------------------
// Populate the war dropdown
// ---------------------------------------------------------------------------
function showRankedWars(wardata) {
    const warSelect = document.getElementById("wars");
    const dropdownContainer = document.getElementById("war-select-container");

    warSelect.innerHTML = `<option value="">-- Select a war --</option>`;

    const warsArray = Object.entries(wardata["rankedwars"]).reverse();

    for (const war of warsArray) {
        let warId = war[0];
        let start = war[1]["war"]["start"];
        let end = war[1]["war"]["end"];
        
        let factionEntries = Object.entries(war[1]["factions"]);
        let fac1ID = factionEntries[0][0];
        let fac1Name = factionEntries[0][1]["name"];
        let fac2ID = factionEntries[1][0];
        let fac2Name = factionEntries[1][1]["name"];

        let label = `${fac1Name} vs. ${fac2Name}`;
        warSelect.innerHTML += `<option value="${warId};${start};${end};${fac1ID};${fac2ID}">${label}</option>`;
    }

    dropdownContainer.style.display = "block";
    toggleLoading(false);
}

// ---------------------------------------------------------------------------
// Column mapping
// ---------------------------------------------------------------------------
const columnMap = [
    { key: "name",          label: "Name" },
    { key: "warhit",        label: "War Hits" },
    { key: "outsidehit",    label: "Outside Hits" },
    { key: "interrupt",     label: "Interrupts" },
    { key: "assist",        label: "Assists" },
    { key: "defend",        label: "Defends" },
    { key: "loss",          label: "Losses" },
    { key: "respect_gain",  label: "Respect Gained" },
    { key: "respect_loss",  label: "Respect Lost" },
    { key: "bonus",         label: "Bonuses" },
    { key: "totalhits",     label: "Total Hits" },
    { key: "totalresp",     label: "Total Respect" }
];

// Sort state
let sortColumn = "respect_gain";
let sortDirection = "asc"; // default: highest respect first
let lastDataSet = {}; // stored so we can re-render when sorting

// ---------------------------------------------------------------------------
// Fetch and display war data
// ---------------------------------------------------------------------------
function showData(warValue) {
    toggleLoading(true, "Fetching wars data...");
    const apikey = document.getElementById("apikey").value.trim();
    const [warId, start, end, fac1ID, fac2ID] = warValue.split(";");

    const url = `https://wolfhaven.at/warpayout.php?&start=${start}&end=${end}&apikey=${apikey}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            lastDataSet = data; // store for future sorts
            renderTable(data);
            toggleLoading(false);
        })
        .catch(err => {
            toggleLoading(true, `Error loading data: ${err.message}.`);
        })
}

// ---------------------------------------------------------------------------
// Sorting helper
// ---------------------------------------------------------------------------
function sortData(dataObj, key, direction) {
    let arr = Object.entries(dataObj);

    arr.sort((a, b) => {
        let A = a[1][key];
        let B = b[1][key];

        // Name sort alphabetically
        if (key === "name") {
            return direction === "asc"
                ? A.localeCompare(B)
                : B.localeCompare(A);
        }

        // Numeric sort, handle NaN
        A = Number(A) || 0;
        B = Number(B) || 0;

        return direction === "desc" ? A - B : B - A;
    });

    return arr;
}

// ---------------------------------------------------------------------------
// Build and display the data table
// ---------------------------------------------------------------------------
function renderTable(data) {

    const container = document.getElementById("results-container");
    const trackerDiv = document.getElementById("tracker");

    container.style.display = "block";
    trackerDiv.innerHTML = "";

    // Sort before rendering
    let sorted = sortData(data, sortColumn, sortDirection);

    // Create table
    let table = document.createElement("table");

    // ---- HEADER ----
    let thead = document.createElement("thead");
    let headerRow = document.createElement("tr");

    columnMap.forEach(col => {
        let th = document.createElement("th");
        th.textContent = col.label;

    // Add sort class if this column is currently sorted
    if (sortColumn === col.key) {
        th.classList.add(sortDirection === "asc" ? "sort-desc" : "sort-asc");
    }
        
        th.addEventListener("click", () => {
            if (sortColumn === col.key) {
                sortDirection = sortDirection === "asc" ? "desc" : "asc";
            } else {
                sortColumn = col.key;
                sortDirection = "asc";
            }
            renderTable(lastDataSet);
        });

        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // ---- BODY ----
    let tbody = document.createElement("tbody");

    sorted.forEach(([username, stats]) => {
        let row = document.createElement("tr");

        columnMap.forEach(col => {
            let cell = document.createElement("td");
            let value = stats[col.key];

            if (col.key === "name") {
                cell.textContent = value;
            } else if (["respect_gain", "respect_loss", "totalresp"].includes(col.key)) {
                let num = Number(value);
                if (!num || Number.isNaN(num)) num = 0;
                cell.textContent = num.toFixed(2);
            } else {
                let num = Number(value);
                cell.textContent = !Number.isNaN(num) ? num : 0;
            }

            row.appendChild(cell);
        });

        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    trackerDiv.appendChild(table);
}
