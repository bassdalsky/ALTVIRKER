import fs from "fs";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const LAT = process.env.LAT;
const LON = process.env.LON;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.VOICE_ID;

async function getWeather() {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&units=metric&lang=no&appid=${OPENWEATHER_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Feil frå OpenWeather");
  const data = await res.json();
  return {
    temp: Math.round(data.main.temp),
    description: data.weather[0].description
  };
}

function getRandomGreeting() {
  const meldinger = [
    "Hei, og velkomen heim!",
    "Så kjekt å sjå deg att!",
    "Hallo, håpar dagen din har vore fin!",
    "Velkomen, no kan du slappe av!",
    "Der var du! Velkomen heim!"
  ];
  return meldinger[Math.floor(Math.random() * meldinger.length)];
}

async function generateSpeech(text) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v3_alpha",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.7
      }
    })
  });
  if (!res.ok) throw new Error("Feil frå ElevenLabs: " + res.status + " " + res.statusText);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync("velkomst.mp3", buffer);
}

async function main() {
  try {
    const weather = await getWeather();
    const greeting = getRandomGreeting();
    const now = new Date();
    const dato = now.toLocaleDateString("nn-NO", { weekday: "long", day: "numeric", month: "long" });
    const klokke = now.toLocaleTimeString("nn-NO", { hour: "2-digit", minute: "2-digit" });

    const melding = `${greeting} I dag er det ${dato}, klokka er ${klokke}. Inne er det 22 grader. Ute er det ${weather.temp} grader og ${weather.description}.`;

    console.log("📢 Velkomstmelding:", melding);
    await generateSpeech(melding);
    console.log("✅ Lydfil lagra som velkomst.mp3");
  } catch (err) {
    console.error("❌ Feil:", err);
    process.exit(1);
  }
}

main();
