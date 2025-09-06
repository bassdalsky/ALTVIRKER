// velkomst_full.js
// Lager ÉN MP3: lang intro (~20–25s) først, deretter dato/ukedag/klokke + vær.
// Tvinger norsk (primer "Hei!"), Eleven Turbo 2.5, og Europe/Oslo-tid.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Tving prosess til norsk tidssone (i tillegg settes TZ i workflow)
process.env.TZ = "Europe/Oslo";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = __dirname;
const MSG_DIR    = path.join(ROOT, "messages");

// === Secrets / env ===
const ELEVEN_API  = process.env.ELEVENLABS_API_KEY;
const VOICES      = (process.env.ELEVENLABS_VOICE_IDS || "")
  .split(",").map(s => s.trim()).filter(Boolean);
const MODEL_ID    = (process.env.ELEVEN_MODEL_ID || "eleven_turbo_v2_5").trim();
const PRIMER      = (process.env.LANGUAGE_PRIMER || "Hei!").trim();

const OPENWEATHER = process.env.OPENWEATHER_API_KEY;
const LAT = (process.env.SKILBREI_LAT || "61.4500").trim();
const LON = (process.env.SKILBREI_LON || "5.8500").trim();

const JULEMODUS = /^(on|true|1|yes)$/i.test(process.env.JULEMODUS || "");
const TZ = "Europe/Oslo";

// === Hjelp ===
const randPick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function isWithinChristmasWindow(d = new Date()) {
  const y = d.getFullYear();
  const start = new Date(Date.UTC(y, 10, 18, 0, 0, 0));     // 18. nov
  const end   = new Date(Date.UTC(y + 1, 0, 10, 23, 59, 59)); // 10. jan
  return d >= start || d <= end; // håndterer årsskifte
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

function readLines(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Fann ikkje fil: ${filePath}`);
  const lines = fs.readFileSync(filePath, "utf-8")
    .split("\n").map(s => s.trim())
    .filter(s => s && !s.startsWith("#"));
  if (!lines.length) throw new Error(`Ingen gyldige linjer i ${filePath}`);
  return lines;
}

function makeIntroText(msgLines) {
  // 2–3 linjer for å lande på ~20–25 sek
  const parts = [randPick(msgLines), randPick(msgLines)];
  if (Math.random() < 0.6) parts.push(randPick(msgLines));
  return parts.join(" ").replace(/\s+/g, " ");
}

function formatNow(d = new Date()) {
  return {
    weekday: new Intl.DateTimeFormat("nn-NO", { timeZone: TZ, weekday: "long" }).format(d),
    date:    new Intl.DateTimeFormat("nn-NO", { timeZone: TZ, year: "numeric", month: "long", day: "numeric" }).format(d),
    time:    new Intl.DateTimeFormat("nn-NO", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d),
  };
}

async function fetchWeather() {
  if (!OPENWEATHER) return null;
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${encodeURIComponent(LAT)}&lon=${encodeURIComponent(LON)}&units=metric&lang=nn&appid=${OPENWEATHER}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenWeather: ${res.status} ${await res.text()}`);
  const j = await res.json();
  return {
    temp:  Math.round(j.main?.temp ?? 0),
    feels: Math.round(j.main?.feels_like ?? 0),
    desc:  (j.weather?.[0]?.description || "").toLowerCase(),
  };
}

async function ttsToFile({ text, outFile }) {
  if (!ELEVEN_API) throw new Error("Manglar ELEVENLABS_API_KEY");
  const voiceId = VOICES.length ? randPick(VOICES) : "xF681s0UeE04gsf0mVsJ"; // Olaf fallback
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?optimize_streaming_latency=0`;
  const body = {
    model_id: MODEL_ID,                  // ← Turbo 2.5
    text,
    voice_settings: { stability: 0.5, similarity_boost: 0.75 }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": ELEVEN_API, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`ElevenLabs: ${res.status} ${await res.text()}`);

  const ws = fs.createWriteStream(outFile);
  await new Promise((resolve, reject) => {
    res.body.pipe(ws);
    res.body.on("error", reject);
    ws.on("finish", resolve);
  });
}

// === Hovud ===
async function main() {
  const now = new Date();
  const useJul = JULEMODUS || isWithinChristmasWindow(now);
  const msgFile = useJul ? "meldinger_jul.txt" : weekdayFile(now);
  const msgLines = readLines(path.join(MSG_DIR, msgFile));

  // 1) Lang intro først
  const intro = makeIntroText(msgLines);

  // 2) Så hale med dato/ukedag/klokke + vær
  const { weekday, date, time } = formatNow(now);

  let wxText = "";
  try {
    const wx = await fetchWeather();
    if (wx) wxText = `Ute er det ${wx.desc}. Temperaturen er kring ${wx.temp} grader, og det kjennest som ${wx.feels}.`;
  } catch (e) {
    console.warn("Vêr-feil:", e.message);
  }

  const julHilsen = useJul ? "Riktig god jul!" : "";

  const fullText = [
    PRIMER,                          // ← "Hei!" tvinger norsk/nynorsk
    intro,
    "Her kjem ei lita oppdatering.",
    `I dag er det ${weekday} den ${date}.`,
    `Klokka er no ${time}.`,
    wxText,
    julHilsen
  ].filter(Boolean).join(" ").replace(/\s+/g, " ");

  await ttsToFile({ text: fullText, outFile: path.join(ROOT, "velkomst.mp3") });
  console.log("✅ Lagra velkomst.mp3");
}

main().catch(err => { console.error("❌ Feil:", err); process.exit(1); });
