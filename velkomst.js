import fs from "fs";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

async function getWeather() {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const lat = process.env.LAT;
  const lon = process.env.LON;

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=no`;
  console.log("🔎 Hentar vær frå:", url);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Feil frå OpenWeather (${res.status})`);
  }
  const data = await res.json();
  return data;
}

async function lagMelding() {
  const weather = await getWeather();

  const melding = `Hei! Velkommen heim. 
  Vêret er ${weather.weather[0].description}, temperaturen er ${Math.round(weather.main.temp)} grader. 
  Ha ein fin dag!`;

  return melding;
}

async function lagTale(text) {
  const voiceId = process.env.VOICE_ID;
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const model = "eleven_multilingual_v3_alpha";

  console.log(`🗣️ Brukar stemme (VOICE_ID): ${voiceId}, modell: ${model}`);

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.8
      },
      model_id: model
    })
  });

  if (!response.ok) {
    throw new Error(`Feil frå ElevenLabs: ${response.status} ${await response.text()}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync("velkommen.mp3", buffer);
  console.log("✅ Lydfila er lagra som velkommen.mp3");
}

async function main() {
  try {
    const melding = await lagMelding();
    console.log("📝 Melding:", melding);
    await lagTale(melding);
  } catch (err) {
    console.error("❌ Feil:", err);
    process.exit(1);
  }
}

main();
