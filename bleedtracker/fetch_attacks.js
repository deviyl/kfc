import fs from "fs/promises";
import path from "path";
import axios from "axios";

const ATTACKS_FILE = path.resolve("./attacks.json");  // always in the current folder
const API_URL = "https://api.torn.com/v2/faction/attacks?filters=incoming&limit=100&sort=DESC&to=1763288173&from=1763236800&key=Z5VkJsXZ4h25Pffx";

async function loadExisting() {
  try {
    const raw = await fs.readFile(ATTACKS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

async function saveAttacks(arr) {
  await fs.writeFile(ATTACKS_FILE, JSON.stringify(arr, null, 2));
}

async function main() {
  const existing = await loadExisting();
  const existingIds = new Set(existing.map(a => a.id));

  const response = await axios.get(API_URL);
  const newAttacks = response.data.attacks || [];
  let added = 0;

  // prepend new unique attacks
  for (const attack of newAttacks) {
    if (!existingIds.has(attack.id)) {
      existing.unshift(attack);
      existingIds.add(attack.id);
      added++;
    }
  }

  await saveAttacks(existing);
  console.log(`Fetched ${newAttacks.length} attacks from API, added ${added} new attack(s). Total now: ${existing.length}`);
}

main();
