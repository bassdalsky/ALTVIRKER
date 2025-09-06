// velkomst_full.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = __dirname;
const MSG_DIR = path.join(ROOT, "messages");

// === Secrets / env ===
const ELEVEN_API = process.env.ELEVENLABS_API_KEY;
const VOICES = (process.env.ELEVENLABS_VOICE_IDS || "")
  .split(",").map(s => s.trim()).filter(Boolean);
const VOICE_ID = VOICES[0] || "21m00Tcm4TlvDq8ikWAM"; // sett din foretrukne norske stemme
const MODEL_ID = process.env.ELEVEN_MODEL_ID || "eleven_turbo_v2_5";

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const LAT = process.env.SKILBREI_LAT || "61.000";
const LON = process.env.SKILBREI_LON || "5.000";

const PRIMER = process.env.LANGUAGE_PRIMER ||
  "Snakk naturleg på nynorsk i varm, venleg tone. Ikkje dansk.";
const FORCE_JUL = /^(on|true|1|yes)$/i.test(process.env.JULEMODUS || "");

const TZ = "Europe/Oslo";

// === Hjelp ===
function isWithinChristmasWindow(d = new Date()) {
  const y = d.getFullYear();
  const nov18 = new Date(Date.UTC(y, 10, 18));
  const jan10 = new Date(Date.UTC(y + 1, 0, 10, 23, 59, 59));
  return d >= nov18 || d <= jan10;
}

function weekdayFile(d = new Date()) {
  const wd = new Intl.DateTimeFormat("nn-NO", { weekday: "long", timeZone: TZ })
    .format(d).toLowerCase();
  const map = {
    "måndag": "meldinger_mandag.txt", "mandag": "meldinger_mandag.txt",
    "tysdag": "meldinger_tysdag.txt",
    "onsdag": "meldinger_onsdag.txt",
    "torsdag": "meldinger_torsdag.txt",
    "fredag": "meldinger_fredag.txt",
    "laurdag": "meldinger_laurdag.txt", "lørdag": "meldinger_laurdag.txt",
    "søndag": "meldinger_sondag.txt", "sondag": "meldinger_sondag.txt",
  };
  return map[wd] || "meldinger_vanleg.txt";
}

function pickLine(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Fant ikkje fil: ${filePath}`);
  const lines = fs.readFileSync(filePath, "utf-8")
    .split("\n").map(s => s.trim())
    .filter(s => s && !s.startsWith("#"));
  if (!lines.length) throw new Error(`Ingen gyldige linjer i ${filePath}`);
  return lines[Math.floor(Math.random() * lines.length)];
}

async function fetchWeather() {
  if (!OPENWEATHER_API_KEY) return null;
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${encodeURIComponent(LAT)}&lon=${encodeURIComponent(LON)}&units=metric&lang=nn&appid=${OPENWEATHER_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenWeather: ${res.status} ${await res.text()}`);
  const j = await res.json();
  return {
    temp: Math.round(j.main?.temp ?? 0),
    feels: Math.round(j.main?.feels_like ?? 0),
    desc: (j.weather?.[0]?.description || "").toLowerCase(),
  };
}

function formatNow(d = new Date()) {
  return {
    weekday: new Intl.DateTimeFormat("nn-NO", { weekday: "long", timeZone: TZ }).format(d),
    date: new Intl.DateTimeFormat("nn-NO", { year: "numeric", month: "long", day: "numeric", timeZone: TZ }).format(d),
    time: new Intl.DateTimeFormat("nn-NO", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(d),
  };
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
  const now = new Date();
  const jul = FORCE_JUL || isWithinChristmasWindow(now);
  const msgFile = jul ? "meldinger_jul.txt" : weekdayFile(now);
  const intro = pickLine(path.join(MSG_DIR, msgFile));

  const { weekday, date, time } = formatNow(now);

  let weather = "";
  try {
    const w = await fetchWeather();
    if (w) weather = `Ute er det ${w.desc}. Temperaturen er kring ${w.temp} grader, og det kjennest som ${w.feels}.`;
  } catch (e) {
    console.warn("Vêr-feil:", e.message);
  }

  const text = [
    PRIMER,
    intro,
    jul ? "Riktig god jul!" : "",
    `I dag er det ${weekday} den ${date}.`,
    weather,
    `Klokka er no ${time}.`
  ].filter(Boolean).join(" ");

  await tts(text, path.join(ROOT, "velkomst.mp3"));
  console.log("✅ Lagra velkomst.mp3");
}

main().catch(e => { console.error("❌ Feil:", e); process.exit(1); });
