// scripts/godkveld.js
// Genererer godkveld.mp3 frå meldingsliste (nynorsk), 15–25 s.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const MSG_DIR    = path.join(__dirname, "..", "messages");
const OUT_FILE   = path.join(__dirname, "..", "godkveld.mp3");

const ELEVENLABS_API_KEY  = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = (process.env.ELEVENLABS_VOICE_IDS || "").split(",")[0] || "21m00Tcm4TlvDq8ikWAM";
const JULEMODUS = (process.env.JULEMODUS || "").toLowerCase() === "on";

function linesFrom(fname) {
  const fp = path.join(MSG_DIR, fname);
  const txt = fs.readFileSync(fp, "utf-8");
  return txt.split("\n").map(s=>s.trim()).filter(s=>s && !s.startsWith("#"));
}
function pick(arr) { return arr[Math.floor(Math.random()*arr.length)]; }

async function tts(text, outPath) {
  if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY manglar");
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}?optimize_streaming_latency=0&output_format=mp3_44100_128`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice_settings: { stability: 0.4, similarity_boost: 0.85 } })
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`ElevenLabs feila ${res.status}: ${msg}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buf);
}

async function main() {
  console.log("🚀 Byggjer godkveld.mp3 …");
  const src = JULEMODUS ? "meldinger_godkveld_jul.txt" : "meldinger_godkveld.txt";
  const lines = linesFrom(src);
  const parts = [pick(lines), pick(lines), Math.random()<0.5 ? pick(lines) : ""].filter(Boolean);
  const text = parts.join(" ").replace(/\s+/g, " ");
  await tts(text, OUT_FILE);
  console.log("✅ Lagde:", OUT_FILE);
}

main().catch(e => { console.error("❌ FEIL i godkveld.js:", e); process.exit(1); });
