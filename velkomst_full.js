// velkomst_full.js
// Bygger éin full velkomst-lyd (intro + vær/klokke) → velkomst.mp3

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ---------- Stiar & oppsett ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = __dirname;

// Meldingsfiler ligg i /messages
const MSG_DIR = path.join(ROOT, "messages");

// ---------- Miljøvariablar ----------
const ELEVEN_API = process.env.ELEVENLABS_API_KEY;
const VOICES = (process.env.ELEVENLABS_VOICE_IDS || "").split(",").map(s => s.trim()).filter(Boolean);
const VOICE_ID = VOICES[0] || "21m00Tcm4TlvDq8ikWAM"; // fallback
const WEATHER_KEY = process.env.OPENWEATHER_API_KEY;
const LAT = process.env.SKILBREI_LAT || "61.000";
const LON = process.env.SKILBREI_LON || "5.000";
const PRIMER = process.env.LANGUAGE_PRIMER || "Snakk alltid naturleg på nynorsk i varm, venleg tone. Ingen dansk.";
const FORCE_JUL = /^(on|true|1|yes)$/i.test(process.env.JULEMODUS || "");

// ---------- Hjelparar ----------
const tz = "Europe/Oslo";

function isWithinChristmasWindow(d = new Date()) {
  const y = d.getFullYear();
  const nov18 = new Date(Date.UTC(y, 10, 18, 0, 0, 0)); // 18. nov
  const jan10 = new Date(Date.UTC(y + 1, 0, 10, 23, 59, 59)); // 10. jan
  return d >= nov18 || d <= jan10; // kryssar årsskifte
}

function weekdayFile(d = new Date()) {
  // Mandag–søndag → meldinger_mandag.txt ... meldinger_sondag.txt
  const day = new Intl.DateTimeFormat("nn-NO", { weekday: "long", timeZone: tz }).format(d).toLowerCase();
  const map = {
    "måndag": "meldinger_mandag.txt",
    "mandag": "meldinger_mandag.txt", // fallback
    "tysdag": "meldinger_tysdag.txt",
    "onsdag": "meldinger_onsdag.txt",
    "torsdag": "meldinger_torsdag.txt",
    "fredag": "meldinger_fredag.txt",
    "laurdag": "meldinger_laurdag.txt",
    "lørdag": "meldinger_laurdag.txt", // fallback
    "søndag": "meldinger_sondag.txt",
    "sondag": "meldinger_sondag.txt", // fallback
  };
  return map[day] || "meldinger_vanleg.txt";
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

async function fetchWeather() {
  if (!WEATHER_KEY) return null;
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${encodeURIComponent(LAT)}&lon=${encodeURIComponent(LON)}&units=metric&lang=nn&appid=${WEATHER_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenWeather feila: ${res.status} ${await res.text()}`);
  const j = await res.json();
  const temp = Math.round(j.main?.temp ?? 0);
  const feels = Math.round(j.main?.feels_like ?? temp);
  const desc = (j.weather?.[0]?.description || "").toLowerCase();
  return { temp, feels, desc };
}

function formatDateTime(d = new Date()) {
  const date = new Intl.DateTimeFormat("nn-NO", { timeZone: tz, year: "numeric", month: "long", day: "numeric" }).format(d);
  const weekday = new Intl.DateTimeFormat("nn-NO", { timeZone: tz, weekday: "long" }).format(d);
  const time = new Intl.DateTimeFormat("nn-NO", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(d);
  return { date, weekday, time };
}

async function elevenTTS(text, outFile) {
  if (!ELEVEN_API) throw new Error("Manglar ELEVENLABS_API_KEY");
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

  const fileStream = fs.createWriteStream(outFile);
  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on("error", reject);
    fileStream.on("finish", resolve);
  });
}

// ---------- Hovudløp ----------
async function main() {
  const now = new Date();

  // 1) Vel meldingsfil
  const useJul = FORCE_JUL || isWithinChristmasWindow(now);
  const msgFile = useJul ? "meldinger_jul.txt" : weekdayFile(now);
  const filePath = path.join(MSG_DIR, msgFile);

  // 2) Plukk ei velkomstlinje
  const introLine = pickLineFrom(filePath);

  // 3) Hent vær + klokke/dato
  const { date, weekday, time } = formatDateTime(now);
  let weatherLine = "";
  try {
    const w = await fetchWeather();
    if (w) {
      weatherLine = `Ute er det ${w.desc}. Temperaturen er rundt ${w.temp} grader, og det kjennest som ${w.feels}.`;
    }
  } catch (e) {
    console.warn("Vêr feila:", e.message);
  }

  // 4) Sett saman full tekst (intro ~20–25s + hale til slutt)
  const fullText = [
    PRIMER,
    introLine,
    useJul ? "Riktig god jul!" : "",
    `I dag er det ${weekday} den ${date}.`,
    weatherLine,
    `Klokka er no ${time}.`
  ].filter(Boolean).join(" ");

  console.log("🎙 Tekst → TTS:\n", fullText);

  // 5) TTS → velkomst.mp3
  await elevenTTS(fullText, path.join(ROOT, "velkomst.mp3"));
  console.log("✅ Lagra: velkomst.mp3");
}

main().catch(err => {
  console.error("❌ Feil:", err);
  process.exit(1);
});
