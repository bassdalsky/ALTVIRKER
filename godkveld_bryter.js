import fs from "fs";

const LABELS = (process.env.VOICE_LABELS || "Olaf,Mia,Emma")
  .split(",").map(s => s.trim()).filter(Boolean);

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function listFilesFor(label) {
  const dir = "godkveld";
  if (!fs.existsSync(dir)) throw new Error("Mappa 'godkveld' finst ikkje. Kjør godkveld-setup først.");
  return fs.readdirSync(dir).filter(f => f.startsWith(label + "_") && f.endsWith(".mp3"));
}

(async () => {
  try {
    if (!LABELS.length) throw new Error("VOICE_LABELS mangler (f.eks. Olaf,Mia,Emma).");

    const label = pickRandom(LABELS);
    const files = listFilesFor(label);
    if (!files.length) throw new Error(`Fann ingen filer for label ${label}. Kjør godkveld-setup.`);

    const chosen = pickRandom(files);
    fs.copyFileSync(`godkveld/${chosen}`, "godkveld.mp3");
    console.log(`✅ Godkveld klar: ${label} → ${chosen} → godkveld.mp3`);
  } catch (e) {
    console.error("❌ Feil:", e);
    process.exit(1);
  }
})();
