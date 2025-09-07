// scripts/godkveld_jul.js
// Godkveld (jul) på nynorsk – UTAN LANGUAGE_PRIMER i teksten
// Brukar Node 20 (global fetch), OpenWeather for vêr, ElevenLabs Turbo v2.5

import fs from "node:fs";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";
import { readFile } from "node:fs/promises";

// ---- Secrets / env ----
const OW_KEY = process.env.OPENWEATHER_API_KEY;     // required
const LAT    = process.env.SKILBREI_LAT;            // required
const LON    = process.env.SKILBREI_LON;            // required
const EL_KEY = process.env.ELEVENLABS_API_KEY;      // required
const VOICES = (process.env.ELEVENLABS_VOICE_IDS || "")
  .split(",").map(s => s.trim()).filter(Boolean);   // minst éin norsk/nynorsk voice-ID

// ---- Konstanter ----
const TZ      = "Europe/Oslo";
const MSGFILE = "messages/meldinger_godkveld_jul.txt";
const OUT     = "godkveld.mp3";

// ---- Hjelp ----
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function osloNow() {
  const d = new Date();
  const dato = new Intl.DateTimeFormat("nn-NO", { timeZone: TZ, weekday:"long", day:"numeric", month:"long" }).format(d);
  const tid  = new Intl.DateTimeFormat("nn-NO", { timeZone: TZ, hour:"2-digit", minute:"2-digit" }).format(d);
  return { dato, tid };
}

async function getWeather() {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${OW_KEY}&units=metric&lang=no`;
  const res = await fetch(url);
  if (!res.ok) {
    const t = await res.text().catch(() => "-");
    throw new Error(`OpenWeather: ${res.status} – ${t}`);
  }
  const j = await res.json();
  return {
    temp: Math.round(j.main?.temp ?? 0),
    desc: (j.weather?.[0]?.description || "").toLowerCase()
  };
}

async function readMessages() {
  const raw = await readFile(MSGFILE, "utf8");
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith("#"));
  if (!lines.length) throw new Error(`Fann ingen linjer i ${MSGFILE}`);
  return lines;
}

function buildText(baseLine, now, w) {
  // baseLine kjem frå meldinger_godkveld_jul.txt (allereie 20–25s lange med "lysa sløkkjer seg / systema av")
  // Me legg berre på klokke + vêr til slutt – og held oss 100% utan primer.
  const hale = ` Klokka er ${now.tid}, og det er ${now.dato}. Ute er det ${w.desc}, og temperaturen ligg kring ${w.temp} grader. Riktig god jul, og god natt.`;
  return `${baseLine} ${hale}`;
}

async function ttsToFile(text) {
  if (!EL_KEY) throw new Error("Mangler ELEVENLABS_API_KEY");
  if (!VOICES.length) throw new Error("Mangler ELEVENLABS_VOICE_IDS");

  const voice = pick(VOICES);
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream?optimize_streaming_latency=4`;

  const payload = {
    model_id: "eleven_turbo_v2_5",
    text,
    voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.2, use_speaker_boost: true }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": EL_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "-");
    throw new Error(`ElevenLabs: ${res.status} – ${t}`);
  }

  const file = fs.createWriteStream(OUT);
  await finished(Readable.fromWeb(res.body).pipe(file));
}

async function main() {
  try {
    const [lines, weather] = await Promise.all([readMessages(), getWeather()]);
    const base = pick(lines);
    const now  = osloNow();
    const text = buildText(base, now, weather);

    await ttsToFile(text);
    console.log("✅ godkveld.mp3 (jul) generert utan primer-intro.");
  } catch (err) {
    console.error("❌ Feil:", err);
    process.exit(1);
  }
}

await main();
