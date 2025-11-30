document.addEventListener("DOMContentLoaded", () => {
    const apiKeyInput = document.getElementById("apikey");
    const loadWarsBtn = document.getElementById("load-wars");
    const warSelectContainer = document.getElementById("war-select-container");
    const warSelect = document.getElementById("wars");
    const resultsContainer = document.getElementById("results-container");
    const bleedDiv = document.getElementById("bleed");

    // Hide war selector + results initially
    warSelectContainer.hidden = true;
    resultsContainer.hidden = true;

    // ==== Load War List ====
    loadWarsBtn.addEventListener("click", async () => {
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            alert("Please enter an API key.");
            return;
        }

        console.log("Fetching ranked wars…");

        try {
            const response = await fetch(
                `https://api.torn.com/faction/?selections=rankedwars&key=${apiKey}`
            );

            const data = await response.json();
            console.log("Ranked wars API returned:", data);

            if (!data.rankedwars) {
                alert("No ranked wars found or invalid API key.");
                return;
            }

            // Clear dropdown
            warSelect.innerHTML = `<option value="">-- Select a war --</option>`;

            // Populate dropdown
            for (const [warId, warInfo] of Object.entries(data.rankedwars)) {
                const start = warInfo.war.start;
                const end = warInfo.war.end;

                const factions = Object.values(warInfo.factions);
                const faction1 = factions[0].name;
                const faction2 = factions[1].name;

                const option = document.createElement("option");
                option.value = `${start};${end}`;
                option.textContent = `${faction1} vs. ${faction2}`;

                warSelect.appendChild(option);
            }

            // Reveal war selector
            warSelectContainer.hidden = false;

        } catch (err) {
            console.error("Error fetching ranked wars:", err);
            alert("Failed to load ranked wars.");
        }
    });


    // ==== Load War Data from PHP ====
    warSelect.addEventListener("change", async () => {
        const value = warSelect.value;
        if (!value) return;

        const apiKey = apiKeyInput.value.trim();
        const [start, end] = value.split(";");

        const phpURL = `https://wolfhaven.at/warpayout.php?&start=${start}&end=${end}&apikey=${apiKey}`;
        console.log("Fetching PHP data from:", phpURL);

        try {
            const response = await fetch(phpURL);
            const result = await response.json();

            console.log("PHP returned:", result);

            bleedDiv.innerHTML = "";

            for (const [name, value] of Object.entries(result)) {
                bleedDiv.innerHTML += `
                    <tr>
                        <td>${name}</td>
                        <td>${parseFloat(value).toFixed(2)}</td>
                    </tr>
                `;
            }

            resultsContainer.hidden = false;

        } catch (err) {
            console.error("Error fetching PHP data:", err);
            alert("Failed to load war data.");
        }
    });
});
