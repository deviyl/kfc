document.addEventListener("DOMContentLoaded", function () {
    const apiKeyInput = document.getElementById("apiKeyInput");
    const apiKeySubmit = document.getElementById("apiKeySubmit");

    const warSelector = document.getElementById("warSelector");
    const tableContainer = document.getElementById("tableContainer");

    let apiKey = "";

    // Hide everything except the API key input
    warSelector.style.display = "none";
    tableContainer.style.display = "none";

    // ------------------------------------------
    // STEP 1 — AFTER API KEY ENTERED
    // ------------------------------------------
    apiKeySubmit.addEventListener("click", function () {
        apiKey = apiKeyInput.value.trim();

        if (!apiKey) {
            alert("Please enter an API key first.");
            return;
        }

        console.log("API Key Accepted:", apiKey);

        // Now reveal the war dropdown
        warSelector.style.display = "block";

        // Fetch wars list
        loadWarList();
    });

    // ------------------------------------------
    // STEP 2 — FETCH WAR LIST
    // ------------------------------------------
    function loadWarList() {
        const url = `https://wolfhaven.at/warpayout.php?apikey=${apiKey}`;

        console.log("Fetching war list from:", url);

        fetch(url)
            .then(response => {
                console.log("War List Response Status:", response.status);
                return response.json();
            })
            .then(data => {
                console.log("War List JSON:", data);

                // Populate dropdown
                warSelector.innerHTML = `<option value="">Select a War...</option>`;
                data.forEach(war => {
                    warSelector.innerHTML += `
                        <option value="${war.start}">${war.name}</option>
                    `;
                });
            })
            .catch(err => {
                console.error("Error loading war list:", err);
                alert("Failed to load war list. Check console.");
            });
    }

    // ------------------------------------------
    // STEP 3 — SELECT A WAR → LOAD PAYOUT DATA
    // ------------------------------------------
    warSelector.addEventListener("change", function () {
        const startTime = this.value;

        if (!startTime) return;

        showData(startTime);
    });

    // ------------------------------------------
    // STEP 4 — FETCH PAYOUT DATA FOR SELECTED WAR
    // ------------------------------------------
    function showData(startTime) {
        const url = `https://wolfhaven.at/warpayout.php?start=${startTime}&end=0&apikey=${apiKey}`;

        console.log("Fetching payout data from:", url);

        fetch(url)
            .then(response => {
                console.log("Payout Response Status:", response.status);
                return response.json();
            })
            .then(data => {
                console.log("Payout JSON:", data);

                // Make table visible
                tableContainer.style.display = "block";

                // Build HTML table dynamically
                let html = `
                    <table class="results-table">
                        <thead>
                            <tr>
                                <th>Player</th>
                                <th>Damage</th>
                                <th>Reward</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                data.forEach(row => {
                    html += `
                        <tr>
                            <td>${row.player}</td>
                            <td>${row.damage}</td>
                            <td>${row.reward}</td>
                        </tr>
                    `;
                });

                html += `
                        </tbody>
                    </table>
                `;

                tableContainer.innerHTML = html;
            })
            .catch(err => {
                console.error("Error loading payout data:", err);
                alert("Failed to load payout data. Check console.");
            });
    }
});
