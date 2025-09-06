// godkveld_bryter.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = __dirname;
const MSG_DIR = path.join(ROOT, "messages");

const ELEVEN_API = process.env.ELEVENLABS_API_KEY;
const VOICES = (process.env.ELEVENLABS_VOICE_IDS || "")
  .split(",").map(s => s.trim()).filter(Boolean);
const VOICE_ID = VOICES[0] || "21m00Tcm4TlvDq8ikWAM";
const MODEL_ID = process.env.ELEVEN_MODEL_ID || "eleven_turbo_v2_5";
const PRIMER = process.env.LANGUAGE_PRIMER ||
  "Snakk naturleg på nynorsk i varm, venleg tone. Ikkje dansk.";

function pickLine(p) {
  if (!fs.existsSync(p)) throw new Error(`Fant ikkje fil: ${p}`);
  const lines = fs.readFileSync(p, "utf-8")
    .split("\n").map(s => s.trim())
    .filter(s => s && !s.startsWith("#"));
  if (!lines.length) throw new Error(`Ingen gyldige linjer i ${p}`);
  return lines[Math.floor(Math.random() * lines.length)];
}

async function tts(text, outFile) {
  if (!ELEVEN_API) throw new Error("Manglar ELEVENLABS_API_KEY");
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream?optimize_streaming_latency=0`;
  const body = { model_id: MODEL_ID, text,
    voice_settings: { stability: 0.5, similarity_boost: 0.75 } };

  const res = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": ELEVEN_API, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`ElevenLabs: ${res.status} ${await res.text()}`);

  const ws = fs.createWriteStream(outFile);
  await new Promise((resolve, reject) => {
    res.body.pipe(ws);
    res.body.on("error", reject);
    ws.on("finish", resolve);
  });
}

async function main() {
  const line = pickLine(path.join(MSG_DIR, "meldinger_godkveld.txt"));
  const text = [PRIMER, line].join(" ");
  await tts(text, path.join(ROOT, "godkveld.mp3"));
  console.log("✅ Lagra godkveld.mp3");
}

main().catch(e => { console.error("❌ Feil:", e); process.exit(1); });
