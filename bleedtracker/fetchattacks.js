import fs from "fs/promises";

async function loadExisting() {
  try {
    const raw = await fs.readFile("attacks.json", "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

loadExisting().then(data => {
  console.log("Loaded attacks.json:", data.length, "records");
});
