import fs from "fs/promises";
import fetch from "node-fetch";

const ELEVEN_API = "https://api.elevenlabs.io/v1/text-to-speech";
const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICES  = (process.env.ELEVENLABS_VOICE_IDS || "").split(",").map(s=>s.trim()).filter(Boolean);
const PRIMER  = process.env.LANGUAGE_PRIMER || "Hei!";

const OW = {
  key: process.env.OPENWEATHER_API_KEY,
  lat: process.env.SKILBREI_LAT,
  lon: process.env.SKILBREI_LON
};

if (!API_KEY || VOICES.length===0) throw new Error("Mangler ELEVENLABS_API_KEY eller ELEVENLABS_VOICE_IDS");
if (!OW.key || !OW.lat || !OW.lon) throw new Error("Mangler OPENWEATHER_API_KEY / LAT / LON");

function pickRandom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function readableTime() {
  const d = new Date();
  const hh = d.getHours().toString().padStart(2,"0");
  const mm = d.getMinutes().toString().padStart(2,"0");
  // “14 32” funker fint på nynorsk
  return `${hh} ${mm}`;
}

async function getWeather() {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${OW.lat}&lon=${OW.lon}&appid=${OW.key}&units=metric&lang=no`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenWeather ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const t = Math.round(data.main.temp);
  const desc = data.weather?.[0]?.description || "ukjent vêr";
  return `Klokka er ${readableTime()}. Vêret er ${desc}, og temperaturen er ${t} grader.`;
}

async function tts(text, outFile) {
  const voice = pickRandom(VOICES);
  const res = await fetch(`${ELEVEN_API}/${voice}`, {
    method: "POST",
    headers: {
      "xi-api-key": API_KEY,
      "accept": "audio/mpeg",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model_id: "eleven_turbo_v2_5",
      voice_settings: { stability: 0.6, similarity_boost: 0.7, style: 0.4, use_speaker_boost: true },
      text: `${PRIMER} ${await getWeather()}`
    })
  });
  if (!res.ok) throw new Error(`ElevenLabs tail feila (${res.status}) ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(outFile, buf);
}

(async () => {
  await tts(" ", "velkomst_tail.mp3"); // getWeather er inni tts-body
  console.log("✅ Tail OK");
})();
