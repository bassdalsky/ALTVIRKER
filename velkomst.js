import fetch from "node-fetch";
import fs from "fs";
import "dotenv/config";

const WEATHER_KEY = process.env.OPENWEATHER_API_KEY;
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.VOICE_ID;

async function getWeather() {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=61.45&lon=5.85&units=metric&lang=no&appid=${WEATHER_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return `${data.weather[0].description}, ${Math.round(data.main.temp)}°C`;
}

async function generateTTS(text) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVEN_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_v3",
      voice_settings: { stability: 0.5, similarity_boost: 0.7 }
    })
  });

  if (!res.ok) throw new Error(`ElevenLabs feilet: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync("velkomst.mp3", buffer);
  console.log("✅ velkomst.mp3 generert!");
}

(async () => {
  try {
    const weather = await getWeather();
    const message = `Hei og velkommen hjem! Akkurat nå er det ${weather}.`;
    console.log("Melding:", message);
    await generateTTS(message);
  } catch (err) {
    console.error("Feil:", err);
  }
})();
