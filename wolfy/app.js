// Step 1: Listen for Load Wars button click
document.getElementById("load-wars").addEventListener("click", function() {
    const apiKey = document.getElementById("apikey").value.trim();
    if (!apiKey) {
        alert("Please enter your API key.");
        return;
    }
    showWars(apiKey);
});
