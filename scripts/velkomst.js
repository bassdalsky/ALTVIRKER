// Velkomst (Nynorsk) – ukedagar + julemodus
// Leser frå messages/meldinger_*.txt eller meldinger_jul.txt

import fs from "fs";
import fetch from "node-fetch";

// Secrets / env
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const ELEVENLABS_API_KEY  = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_IDS = (process.env.ELEVENLABS_VOICE_IDS || "").split(",").map(s => s.trim()).filter(Boolean);
const SKILBREI_LAT = process.env.SKILBREI_LAT;
const SKILBREI_LON = process.env.SKILBREI_LON;
const JULEMODUS    = (process.env.JULEMODUS || "off").toLowerCase();

function pickRandom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

async function getWeather(){
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${SKILBREI_LAT}&lon=${SKILBREI_LON}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=no`;
  const res = await fetch(url);
  if(!res.ok) throw new Error("Feil frå OpenWeather: " + res.status);
  const data = await res.json();
  const temp = Math.round(data.main.temp);
  const desc = data.weather?.[0]?.description || "ukjent vêr";
  return `${temp} grader og ${desc}`;
}

function getTimeAndDate(){
  const tz = "Europe/Oslo";
  const now = new Date();
  const time = now.toLocaleTimeString("no-NO", { timeZone: tz, hour:"2-digit", minute:"2-digit" });
  const date = now.toLocaleDateString("no-NO", { timeZone: tz, weekday:"long", day:"numeric", month:"long" });
  const weekday = now.toLocaleDateString("no-NO", { timeZone: tz, weekday:"long" }).toLowerCase();
  return { time, date, weekday };
}

function chooseMessageFile(weekday){
  if(JULEMODUS === "on") return "messages/meldinger_jul.txt";
  switch(weekday){
    case "mandag": return "messages/meldinger_mandag.txt";
    case "tysdag": return "messages/meldinger_tysdag.txt";
    case "onsdag": return "messages/meldinger_onsdag.txt";
    case "torsdag": return "messages/meldinger_torsdag.txt";
    case "fredag": return "messages/meldinger_fredag.txt";
    case "laurdag": return "messages/meldinger_laurdag.txt";
    case "søndag": return "messages/meldinger_sondag.txt";
    default:       return "messages/meldinger_vanleg.txt";
  }
}

async function ttsToFile(text, outfile){
  const voice = pickRandom(ELEVENLABS_VOICE_IDS);
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice}`;
  const body = {
    text:
`Snakk NORSK (Nynorsk). Ikkje svensk eller dansk. Bruk varme, naturlege ord og uttalar.

${text}`,
    model_id: "eleven_turbo_v2_5",
    voice_settings: { stability: 0.5, similarity_boost: 0.8 }
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if(!res.ok) throw new Error("Feil frå ElevenLabs: " + (await res.text()));
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outfile, buf);
}

async function main(){
  const { time, date, weekday } = getTimeAndDate();
  const file = chooseMessageFile(weekday);
  const lines = fs.readFileSync(file, "utf-8").split("\n").map(l=>l.trim()).filter(Boolean);
  const base = pickRandom(lines);
  const weather = await getWeather();

  const full = `${base} Klokka er ${time} den ${date}. Ute er det ${weather}.`;
  console.log("🔊 Velkomst:", full);

  await ttsToFile(full, "velkomst.mp3");
}

main().catch(err => { console.error("❌ Feil:", err); process.exit(1); });
