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
// Fetch the list of ranked wars
// ---------------------------------------------------------------------------
function showWars(ApiKey) {
    console.log("Fetching Torn ranked wars…");

    fetch(`https://api.torn.com/faction/?selections=rankedwars&key=${ApiKey}`)
        .then(response => response.json())
        .then(data => {
            console.log("Ranked wars data received:", data);
            showRankedWars(data);
        })
        .catch(err => console.error("Error loading wars:", err));
}

// ---------------------------------------------------------------------------
// Populate the war dropdown
// ---------------------------------------------------------------------------
function showRankedWars(wardata) {
    const warSelect = document.getElementById("wars");
    const dropdownContainer = document.getElementById("war-select-container");

    warSelect.innerHTML = `<option value="">-- Select a war --</option>`;

    for (const war of Object.entries(wardata["rankedwars"])) {
        let warId = war[0];
        let start = war[1]["war"]["start"];
        let end = war[1]["war"]["end"];

        let factionNames = Object.entries(war[1]["factions"]).map(f => f[1]["name"]);
        let label = `${factionNames[0]} vs. ${factionNames[1]}`;

        warSelect.innerHTML += `<option value="${warId};${start};${end}">${label}</option>`;
    }

    dropdownContainer.hidden = false;
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
    { key: "defend",        label: "Defends (Bleed)" },
    { key: "loss",          label: "Losses (Outgoing)" },
    { key: "respect_gain",  label: "Respect Gained" },
    { key: "respect_loss",  label: "Respect Lost" },
    { key: "bonus",         label: "Bonuses" },
    { key: "totalhit",      label: "Total Hits" },
    { key: "totalresp",     label: "Total Respect" }
];

// ---------------------------------------------------------------------------
// Fetch and display war data from PHP endpoint
// ---------------------------------------------------------------------------
function showData(warValue) {
    const apikey = document.getElementById("apikey").value.trim();
    const [warId, start, end] = warValue.split(";");

    const url = `https://wolfhaven.at/warpayout.php?&start=${start}&end=${end}&apikey=${apikey}`;
    console.log("Fetching PHP data from:", url);

    fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log("War stats received:", data);
            renderTable(data);
        })
        .catch(err => {
            console.error("Error fetching war data:", err);
        });
}

// ---------------------------------------------------------------------------
// Build and display the data table
// ---------------------------------------------------------------------------
function renderTable(data) {

    const container = document.getElementById("results-container");
    const bleedDiv = document.getElementById("bleed");

    container.hidden = false;
    bleedDiv.innerHTML = ""; // Clear old table

    // Create table
    let table = document.createElement("table");
    table.border = "1";
    table.style.borderCollapse = "collapse";

    // ---- HEADER ----
    let thead = document.createElement("thead");
    let headerRow = document.createElement("tr");

    columnMap.forEach(col => {
        let th = document.createElement("th");
        th.textContent = col.label;
        th.style.padding = "4px 8px";
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // ---- BODY ----
    let tbody = document.createElement("tbody");

    Object.entries(data).forEach(([username, stats]) => {
        let row = document.createElement("tr");

        columnMap.forEach(col => {
            let cell = document.createElement("td");
            let value = stats[col.key];

            // Replace null/NaN/undefined with 0
            if (value === null || value === undefined || Number.isNaN(value)) {
                value = 0;
            }

            cell.textContent = value;
            cell.style.padding = "4px 8px";
            row.appendChild(cell);
        });

        tbody.appendChild(row);
    });

    table.appendChild(tbody);

    bleedDiv.appendChild(table);
}
