// scripts/build_tail.js
import { writeFile } from "fs/promises";

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const LAT = process.env.SKILBREI_LAT;
const LON = process.env.SKILBREI_LON;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICES = (process.env.ELEVENLABS_VOICE_IDS || "")
  .split(",").map(s=>s.trim()).filter(Boolean);
const LANGUAGE_PRIMER = process.env.LANGUAGE_PRIMER || "Hei! Dette er en norsk melding.";

if (!OPENWEATHER_API_KEY || !LAT || !LON) throw new Error("Mangler vær-secrets");

function nowOsloHHmm() {
  const tz="Europe/Oslo";
  return new Date().toLocaleTimeString("no-NO",{hour:"2-digit",minute:"2-digit", timeZone:tz}).replace(":", " ");
}
function pick(a){ return a[Math.floor(Math.random()*a.length)] }

const url = `https://api.openweathermap.org/data/2.5/weather?lat=${encodeURIComponent(LAT)}&lon=${encodeURIComponent(LON)}&appid=${encodeURIComponent(OPENWEATHER_API_KEY)}&units=metric&lang=no`;
const r = await fetch(url);
if (!r.ok) throw new Error(`OpenWeather feil (${r.status}): ${await r.text()}`);
const j = await r.json();
const temp = Math.round(j.main?.temp ?? 0);
const desc = (j.weather?.[0]?.description ?? "").trim();

const haleText = `${LANGUAGE_PRIMER} Forresten: Ute er det ${temp} grader og ${desc}. Klokka er ${nowOsloHHmm()}.`;

const voice = VOICES.length? pick(VOICES): "xF681s0UeE04gsf0mVsJ";
const tts = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
  method:"POST",
  headers:{
    "Accept":"audio/mpeg",
    "Content-Type":"application/json",
    "xi-api-key": ELEVENLABS_API_KEY
  },
  body: JSON.stringify({ model_id:"eleven_turbo_v2_5", text: haleText })
});
if (!tts.ok) throw new Error(`ElevenLabs feil (${tts.status}): ${await tts.text()}`);
const buf = Buffer.from(await tts.arrayBuffer());
await writeFile("tail.mp3", buf);
console.log("✅ Laga tail.mp3 (vær + klokke)");
