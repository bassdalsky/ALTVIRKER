// scripts/velkomst_full.js
// Genererer én MP3 som først spelar ei lang, venleg velkomstmelding,
// deretter kjem klokkeslett, dato og eit kort varsel om veret.
// Brukar innebygd fetch (Node 20+). Ingen node-fetch.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// --- Filstiar ---------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const MSG_DIR    = path.join(__dirname, "..", "messages");
const OUT_FILE   = path.join(__dirname, "..", "velkomst.mp3");

// --- Config via Secrets/Env -------------------------------------------------
const ELEVENLABS_API_KEY  = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = (process.env.ELEVENLABS_VOICE_IDS || "").split(",")[0] || "21m00Tcm4TlvDq8ikWAM";
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const LAT = process.env.SKILBREI_LAT || "61.0";
const LON = process.env.SKILBREI_LON || "5.8";
const JULEMODUS = (process.env.JULEMODUS || "").toLowerCase() === "on";

// --- Hjelp ------------------------------------------------------------------
function pickRandom(lines) {
  return lines[Math.floor(Math.random() * lines.length)];
}

function readMessageFile(fname) {
  const fp = path.join(MSG_DIR, fname);
  const txt = fs.readFileSync(fp, "utf-8");
  return txt
    .split("\n")
    .map(l => l.trim())
    .filter(l => l && !l.startsWith("#"));
}

function formatDateNo(now, tz) {
  // Bruk lokal tidssone om sett, elles systemets.
  const opt = { timeZone: tz || undefined, hour12: false };
  const weekday = now.toLocaleDateString("nn-NO", { weekday: "long", ...opt });
  const day     = now.toLocaleDateString("nn-NO", { day: "2-digit", ...opt });
  const month   = now.toLocaleDateString("nn-NO", { month: "long", ...opt });
  const year    = now.getFullYear();
  const hhmm    = now.toLocaleTimeString("nn-NO", { hour: "2-digit", minute: "2-digit", ...opt });
  return { weekday, day, month, year, hhmm };
}

async function fetchWeather() {
  if (!OPENWEATHER_API_KEY) return null;
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=nn`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const j = await res.json();
  const temp = Math.round(j.main?.temp ?? 0);
  const desc = (j.weather && j.weather[0]?.description) ? j.weather[0].description : "";
  return { temp, desc };
}

async function ttsToFile(text, outPath) {
  if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY manglar");
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}?optimize_streaming_latency=0&output_format=mp3_44100_128`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text,
      voice_settings: { stability: 0.4, similarity_boost: 0.85 }
    })
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`ElevenLabs feila ${res.status}: ${msg}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buf);
}

// --- Hovudlogikk ------------------------------------------------------------
async function main() {
  console.log("🚀 Byggjer velkomst.mp3 …");
  const now = new Date();
  const { weekday, day, month, year, hhmm } = formatDateNo(now);

  // Velg meldingskjelder
  const baseFile = JULEMODUS ? "meldinger_jul.txt" : "meldinger_vanleg.txt";
  const lines = readMessageFile(baseFile);

  // For å sikre 20–25 sek med intro, set saman 2–3 setningar
  const introParts = [];
  introParts.push(pickRandom(lines));
  introParts.push(pickRandom(lines));
  if (Math.random() < 0.5) introParts.push(pickRandom(lines));
  const introText = introParts.join(" ");

  // Hent ver
  const wx = await fetchWeather();
  const værTekst = wx
    ? `Klokka er ${hhmm}, ${weekday} ${day}. ${month} ${year}. Ute er det omtrent ${wx.temp} grader og ${wx.desc}.`
    : `Klokka er ${hhmm}, ${weekday} ${day}. ${month} ${year}.`;

  const avsluttJul = JULEMODUS ? "Riktig god jul, og kos deg vidare." : "";

  // Sluttleg tekst – én TTS => null «pling» og null delt avspeling
  const fullText = [
    introText,
    " ",
    "Her kjem ei lita oppdatering:",
    værTekst,
    avsluttJul
  ].join(" ").replace(/\s+/g, " ");

  await ttsToFile(fullText, OUT_FILE);
  console.log("✅ Lagde:", OUT_FILE);
}

main().catch(err => {
  console.error("❌ FEIL i velkomst_full.js:", err);
  process.exit(1);
});
