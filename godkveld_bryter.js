// godkveld_bryter.js
// Bygger godkveld-lyd (berre melding) → godkveld.mp3

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = __dirname;
const MSG_DIR = path.join(ROOT, "messages");

// Miljø
const ELEVEN_API = process.env.ELEVENLABS_API_KEY;
const VOICES = (process.env.ELEVENLABS_VOICE_IDS || "").split(",").map(s => s.trim()).filter(Boolean);
const VOICE_ID = VOICES[0] || "21m00Tcm4TlvDq8ikWAM";
const PRIMER = process.env.LANGUAGE_PRIMER || "Snakk alltid naturleg på nynorsk i varm, venleg tone. Ingen dansk.";

async function elevenTTS(text, outFile) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream?optimize_streaming_latency=0`;
  const body = {
    model_id: "eleven_multilingual_v2",
    text,
    voice_settings: { stability: 0.5, similarity_boost: 0.75 }
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVEN_API,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`ElevenLabs feila: ${res.status} ${await res.text()}`);

  const ws = fs.createWriteStream(outFile);
  await new Promise((resolve, reject) => {
    res.body.pipe(ws);
    res.body.on("error", reject);
    ws.on("finish", resolve);
  });
}

function pickLineFrom(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fant ikkje fil: ${filePath}`);
  }
  const lines = fs.readFileSync(filePath, "utf-8")
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith("#"));
  if (lines.length === 0) throw new Error(`Ingen gyldige linjer i ${filePath}`);
  return lines[Math.floor(Math.random() * lines.length)];
}

async function main() {
  const filePath = path.join(MSG_DIR, "meldinger_godkveld.txt");
  const line = pickLineFrom(filePath);

  const text = [PRIMER, line].join(" ");
  console.log("🎙 Tekst → TTS:\n", text);

  await elevenTTS(text, path.join(ROOT, "godkveld.mp3"));
  console.log("✅ Lagra: godkveld.mp3");
}

main().catch(err => {
  console.error("❌ Feil:", err);
  process.exit(1);
});
