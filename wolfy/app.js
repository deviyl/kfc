// Step 1: Listen for Load Wars button click
document.getElementById("load-wars").addEventListener("click", function() {
    const apiKey = document.getElementById("apikey").value.trim();
    if (!apiKey) {
        alert("Please enter your API key.");
        return;
    }
    showWars(apiKey);
});

// Fetch Torn API ranked wars
function showWars(ApiKey) {
    fetch("https://api.torn.com/faction/?selections=rankedwars&key=" + ApiKey)
        .then((response) => response.json())
        .then((data) => {
            showRankedWars(data);
        });
}

// Populate dropdown and attach selection listener
function showRankedWars(wardata) {
    let warvalue = "";
    let faction1 = "";
    let faction2 = "";

    const warsDropdown = document.getElementById("wars");
    warsDropdown.innerHTML = "<option value=''>-- Select a war --</option>"; // reset dropdown

    for (const war of Object.entries(wardata["rankedwars"])) {
        let count = 0;
        const start = war[1]["war"]["start"];
        const end = war[1]["war"]["end"];
        warvalue = war[0];

        for (const warfaction of Object.entries(war[1]["factions"])) {
            if (count === 0) {
                faction1 = warfaction[1]["name"];
                count++;
            } else {
                faction2 = warfaction[1]["name"];
            }
        }

        warsDropdown.innerHTML += "<option value='" + warvalue + ";" + start + ";" + end + "'>" 
                                  + faction1 + " vs. " + faction2 + "</option>";
    }

    // Reveal the war dropdown now that it’s populated
    document.getElementById("war-select-container").hidden = false;

    // Add listener for when user selects a war
    warsDropdown.addEventListener("change", function() {
        const selectedWar = this.value;
        if (selectedWar) {
            showData(selectedWar);
            document.getElementById("results-container").hidden = false;
        }
    });
}

// Fetch PHP backend data and populate table
function showData(war) {
    const apikey = document.getElementById("apikey").value;
    war = war.split(";");

    const url = "https://wolfhaven.at/warpayout.php?&start=" + war[1] + "&end=" + war[2] + "&apikey=" + apikey;
    console.log("Fetching PHP data from:", url);

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function() {
        if (this.readyState === 4 && this.status === 200) {
            console.log("PHP response:", this.responseText); // <-- LOG RESPONSE

            const result = JSON.parse(this.responseText);
            const bleedDiv = document.getElementById("bleed");
            bleedDiv.innerHTML = ""; // clear previous data

            for (const mem of Object.entries(result)) {
                bleedDiv.innerHTML += "<tr><td>" + mem[0] + "</td><td>" + parseFloat(mem[1]).toFixed(2) + "</td></tr>";
            }
        }
    };

    xmlhttp.open("GET", url, false); // keep synchronous for now
    xmlhttp.send();
}
