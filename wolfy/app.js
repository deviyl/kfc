// ---------------------------------------------------------------------------
// When the page loads, attach event listeners
// ---------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    const loadWarsBtn = document.getElementById("load-wars");
    const warSelect = document.getElementById("wars");
    const loadDataBtn = document.getElementById("load-data-btn");
    const customTimeContainer = document.getElementById("custom-end-time-container");
    const useCustomEndCheckbox = document.getElementById("use-custom-end");
    const customEndDatetimeInput = document.getElementById("custom-end-datetime");

    if (!loadWarsBtn || !warSelect || !loadDataBtn || !customTimeContainer || !useCustomEndCheckbox || !customEndDatetimeInput) {
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
    
    loadDataBtn.addEventListener("click", () => {
        const selectedValue = warSelect.value;
        if (selectedValue) {
            showData(selectedValue);
        } else {
            alert("Please select a war from the dropdown before loading data.");
        }
    });
    
    useCustomEndCheckbox.addEventListener("change", () => {
        customEndDatetimeInput.style.display = useCustomEndCheckbox.checked ? "inline-block" : "none";
        if (!useCustomEndCheckbox.checked) {
            customEndDatetimeInput.value = "";
        }
    });   
});

// ---------------------------------------------------------------------------
// Timestamp Formatting
// ---------------------------------------------------------------------------
function formatTimestamp(unixTimestamp) {
    if (!unixTimestamp) return "N/A";
    const date = new Date(unixTimestamp * 1000);
    let utcString = date.toUTCString();
    return utcString.replace(" GMT", ""); 
}

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
    const customTimeContainer = document.getElementById("custom-end-time-container");
    
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
    customTimeContainer.style.display = "flex";
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
    { key: "loss",          label: "Losses" },
    { key: "escape",        label: "Escapes"},
    { key: "insidemerc",    label: "Inside Mercs" },
    { key: "totalhits",     label: "Total Hits" },
    { key: "defend",        label: "Defends" },
    { key: "respect_gain",  label: "Respect Gained" },
    { key: "respect_loss",  label: "Respect Lost" },
    { key: "bonus",         label: "Bonuses" },
    { key: "totalresp",     label: "Total Respect" },
    { key: "balanceresp",   label: "Respect Balance" }
];

// Sort state
let sortColumn = "respect_gain";
let sortDirection = "asc"; // default: highest respect first
let lastDataSet = {}; // stored so we can re-render when sorting

// ---------------------------------------------------------------------------
// Fetch and display war data
// ---------------------------------------------------------------------------
function showData(warValue) {
    toggleLoading(true, "Fetching war data...");
    const apikey = document.getElementById("apikey").value.trim();
    const [warId, start, originalEnd, fac1ID, fac2ID] = warValue.split(";").map(Number);
    
    let end = originalEnd; // Default API end time
    const useCustomEndCheckbox = document.getElementById("use-custom-end");
    const customEndDatetimeInput = document.getElementById("custom-end-datetime");
    
    if (useCustomEndCheckbox.checked && customEndDatetimeInput.value) {
        let customTimeString = customEndDatetimeInput.value;
        // treat custom date as utc
        const customDate = new Date(customTimeString + ":00.000Z");
        // save into custom var and convert ms to s
        let customEndTimestamp = Math.floor(customDate.getTime() / 1000); 

        // validation to ensure custom time is between original start and end times
        if (customEndTimestamp < start) {
            toggleLoading(true, `<p style='color: red; font-weight: bold;'>Error: Custom end time cannot be before the war's start time.</p>`);
            return; 
        }
        if (customEndTimestamp > originalEnd) {
            toggleLoading(true, `<p style='color: red; font-weight: bold;'>Error: Custom end time cannot be after the war's original end time.</p>`);
            return; 
        }
        end = customEndTimestamp;
    }    
       
    const startTimeFormatted = formatTimestamp(start);
    const endTimeFormatted = formatTimestamp(end);
    
    const url = `https://wolfhaven.at/WarPayout/warpayout.php?start=${start}&end=${end}&apikey=${apikey}&fac1ID=${fac1ID}&fac2ID=${fac2ID}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            lastDataSet = data; // store for future sorts

            const resultsContainer = document.getElementById("results-container");
            const timeTag = (end !== originalEnd) ? '<strong> (Custom)</strong>' : ''; // if custom end
            const timeHTML = `<p style="font-style: italic;">Start Time: **${startTimeFormatted}** &mdash; End Time: **${endTimeFormatted}**${timeTag}</p>`;
            
            resultsContainer.innerHTML = `<h3>War Data</h3>${timeHTML}<div id="tracker"></div>`;
            
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
// Calculate Totals
// ---------------------------------------------------------------------------
function calculateTotals(data) {
    let totals = {};
    
    // Initialize totals for every column except 'name'
    columnMap.forEach(col => {
        if (col.key !== "name") {
            totals[col.key] = 0;
        }
    });

    for (const username in data) {
        const stats = data[username];
        for (const key in stats) {
            if (totals.hasOwnProperty(key)) {
                totals[key] += Number(stats[key]) || 0;
            }
        }
    }
    return totals;
}

// ---------------------------------------------------------------------------
// Build and display the data table
// ---------------------------------------------------------------------------
function renderTable(data) {
    document.getElementById("cooperation").style.display = "none";
    const container = document.getElementById("results-container");
    const trackerDiv = document.getElementById("tracker");

    container.style.display = "block";
    trackerDiv.innerHTML = "";

    // Calculate Totals
    const totals = calculateTotals(data);
    
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

    // Add Total Row
    let totalRow = document.createElement("tr");
    totalRow.classList.add("total-row");

    columnMap.forEach(col => {
        let cell = document.createElement("td");
        let key = col.key;
        
        if (key === "name") {
            // First column says "TOTAL"
            cell.textContent = "TOTAL";
            cell.style.fontWeight = "bold"; 
        } else {
            let totalValue = totals[key];
            
            if (["respect_gain", "respect_loss", "totalresp"].includes(key)) {
                cell.textContent = totalValue.toFixed(2);
            } else {
                cell.textContent = Math.round(totalValue); 
            }
        }
        totalRow.appendChild(cell);
    });
    tbody.appendChild(totalRow);
    
    table.appendChild(tbody);
    trackerDiv.appendChild(table);
}
