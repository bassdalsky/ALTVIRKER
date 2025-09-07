import fs from "fs";
import fetch from "node-fetch";

function boolFromEnv(v) {
  if (!v) return false;
  const s = String(v).trim().toLowerCase();
  return s === "1" || s === "true" || s === "on" || s === "yes" || s === "ja";
}

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
if (!ELEVENLABS_API_KEY) throw new Error("Mangler ELEVENLABS_API_KEY");

const VOICE_POOL = (process.env.ELEVENLABS_VOICE_IDS || "")
  .split(",").map(s => s.trim()).filter(Boolean);
if (VOICE_POOL.length === 0) throw new Error("Mangler ELEVENLABS_VOICE_IDS");

const JULEMODUS = boolFromEnv(process.env.JULEMODUS);
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const SKILBREI_LAT = process.env.SKILBREI_LAT;
const SKILBREI_LON = process.env.SKILBREI_LON;

// Primer beholdes KUN internt (ikke lest opp)
const LANGUAGE_PRIMER =
  (process.env.LANGUAGE_PRIMER && process.env.LANGUAGE_PRIMER.trim()) ||
  "Dette er ein norsk nynorsk-stemme. Ver naturleg og varm.";

function getOsloDate() {
  return new Date(new Date().toLocaleString("en-GB", { timeZone: "Europe/Oslo" }));
}
function getTimeAndDate() {
  const now = getOsloDate();
  const time = now.toLocaleString("nb-NO", { timeZone: "Europe/Oslo", hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString("nb-NO", { timeZone: "Europe/Oslo" });
  const weekday = now.toLocaleString("nb-NO", { timeZone: "Europe/Oslo", weekday: "long" });
  return { time, date, weekday };
}

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function loadLines(file) {
  const t = fs.readFileSync(file, "utf-8");
  return t.split("\n").map(l => l.trim()).filter(Boolean);
}

function getMessageFile() {
  if (JULEMODUS) return "messages/meldinger_jul.txt";
  const { weekday } = getTimeAndDate();
  const map = {
    mandag:  "messages/meldinger_mandag.txt",
    tirsdag: "messages/meldinger_tysdag.txt",
    onsdag:  "messages/meldinger_onsdag.txt",
    torsdag: "messages/meldinger_torsdag.txt",
    fredag:  "messages/meldinger_fredag.txt",
    lørdag:  "messages/meldinger_laurdag.txt",
    søndag:  "messages/meldinger_sondag.txt",
  };
  const key = weekday.toLowerCase();
  return map[key] || "messages/meldinger_vanleg.txt";
}

async function getWeather() {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${SKILBREI_LAT}&lon=${SKILBREI_LON}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=no`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Feil ved henting av vêrdata");
  const data = await res.json();
  return `${Math.round(data.main.temp)} grader og ${data.weather[0].description}`;
}

function pickVoice() { return pickRandom(VOICE_POOL); }

async function ttsToFile(text, outFile) {
  const voiceId = pickVoice();
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  const body = {
    model_id: "eleven_turbo_v2_5",
    // Viktig: primeren sendes IKKE i text (så den blir ikke lest høyt)
    text,
    voice_settings: { stability: 0.5, similarity_boost: 0.8 },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Feil frå ElevenLabs: ${await res.text()}`);

  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outFile, buf);
}

async function main() {
  const { time, date } = getTimeAndDate();
  const file = getMessageFile();
  const lines = loadLines(file);
  const melding = pickRandom(lines);
  const weather = await getWeather();

  // Meldinga (~20–25 s). Klokke/vær til slutt.
  const fullText = `${melding} Klokka er ${time}, dato ${date}. Ute er det ${weather}.`;

  console.log("[DEBUG] Velkomst-fil:", file);
  console.log("[DEBUG] Generert velkomst-tekst:", fullText);

  await ttsToFile(fullText, "velkomst.mp3");
  console.log("✅ Skreiv velkomst.mp3");
}

main().catch(err => { console.error("❌ Feil:", err); process.exit(1); });
