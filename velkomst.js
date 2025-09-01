import fs from "fs";
import fetch from "node-fetch";

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const WEATHER_KEY = process.env.OPENWEATHER_API_KEY;
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.VOICE_ID;

// Hent værdata
async function getWeather() {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=61.45&lon=5.85&appid=${WEATHER_KEY}&units=metric&lang=no`;
  const res = await fetch(url);
  const data = await res.json();
  return `${data.weather[0].description}, ${Math.round(data.main.temp)}°C`;
}

// Lag velkomsttekst
async function makeText() {
  const weather = await getWeather();
  return `Hei, velkommen hjem! Akkurat nå er det ${weather}.`;
}

// Generer tale med ElevenLabs v3 Alpha
async function generateTTS(text) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream?model_id=eleven_multilingual_v3`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVEN_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v3",
      voice_settings: { stability: 0.6, similarity_boost: 0.8 }
    })
  });

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync("velkomst.mp3", buffer);
  console.log("✅ velkomst.mp3 generert!");
}

const main = async () => {
  const text = await makeText();
  await generateTTS(text);
};
main();
