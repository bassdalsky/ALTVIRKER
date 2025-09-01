import fs from "fs";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const WEATHER_URL = `https://api.openweathermap.org/data/2.5/weather?lat=${process.env.LAT}&lon=${process.env.LON}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric&lang=no`;

async function getWeather() {
  const res = await fetch(WEATHER_URL);
  if (!res.ok) throw new Error(`Feil frå OpenWeather (${res.status})`);
  const data = await res.json();
  return `Været i dag er ${data.weather[0].description} med temperatur på ${Math.round(data.main.temp)} grader.`;
}

async function makeMp3(text) {
  const res = await fetch("https://api.elevenlabs.io/v1/text-to-speech/" + process.env.VOICE_ID, {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v3_alpha",
      voice_settings: { stability: 0.5, similarity_boost: 0.8 }
    })
  });
  if (!res.ok) throw new Error(`Feil frå ElevenLabs (${res.status})`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync("velkommen.mp3", buffer);
  console.log("✅ Lydfil lagra: velkommen.mp3");
}

async function main() {
  try {
    const weather = await getWeather();
    const melding = `Hei og velkommen heim. ${weather} Hugs å ta ut bosset i kveld.`;
    await makeMp3(melding);
  } catch (err) {
    console.error("❌ Feil:", err);
    process.exit(1);
  }
}

main();
