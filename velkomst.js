import fs from "fs";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const WEATHER_URL = `https://api.openweathermap.org/data/2.5/weather?lat=${process.env.LAT}&lon=${process.env.LON}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric&lang=no`;

async function getWeather() {
  const res = await fetch(WEATHER_URL);
  if (!res.ok) throw new Error(`Feil frå OpenWeather (${res.status})`);
  const data = await res.json();
  return `Det er ${data.weather[0].description} og ${Math.round(data.main.temp)} grader i dag.`;
}

async function makeText() {
  const dato = new Date().toLocaleDateString("no-NO", { weekday: "long", day: "numeric", month: "long" });
  const vær = await getWeather();
  return `God dag! I dag er det ${dato}. ${vær} Boss blir tømt i morgon. Ha ein fin dag!`;
}

async function makeMp3(text) {
  const res = await fetch("https://api.elevenlabs.io/v1/text-to-speech/" + process.env.VOICE_ID, {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model_id: "eleven_multilingual_v3_alpha",
      text,
      voice_settings: { stability: 0.5, similarity_boost: 0.8 }
    }),
  });

  if (!res.ok) throw new Error(`Feil frå ElevenLabs (${res.status})`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync("velkomst.mp3", buffer);
  console.log("✅ MP3 generert: velkomst.mp3");
}

async function main() {
  try {
    const text = await makeText();
    await makeMp3(text);
  } catch (err) {
    console.error("❌ Feil:", err);
    process.exit(1);
  }
}

main();
