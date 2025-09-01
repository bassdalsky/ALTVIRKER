import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const LAT = process.env.LAT;
const LON = process.env.LON;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.VOICE_ID;

async function getWeather() {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=no`;
  const res = await fetch(url);
  const data = await res.json();
  return {
    temp: Math.round(data.main.temp),
    desc: data.weather[0].description,
  };
}

function getDayMessage() {
  const today = new Date();
  const weekday = today.toLocaleDateString("no-NO", { weekday: "long" });

  let reminder = "";
  if (weekday === "mandag") {
    reminder = "Du må hugse papirbosset.";
  } else if (weekday === "onsdag") {
    reminder = "Hugs at bossplassen på Sande er open frå 12 til 18.";
  } else if (weekday === "torsdag") {
    reminder = "Hugs å ta ned bosspannet.";
  }

  return { weekday, reminder };
}

async function generateSpeech(text) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model_id: "eleven_multilingual_v3_alpha",
      text,
      voice_settings: {
        stability: 0.4,
        similarity_boost: 0.8,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Feil frå ElevenLabs: ${res.status} ${res.statusText}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const outPath = path.resolve("./velkomst.mp3");
  fs.writeFileSync(outPath, buffer);
  console.log("✅ Lydfila er lagra:", outPath);
}

async function main() {
  try {
    const { temp, desc } = await getWeather();
    const { weekday, reminder } = getDayMessage();

    const message = `Velkommen heim. I dag er det ${weekday}. ${reminder} Eg slår på lysa dine, og temperaturen inne er 22 grader. Ute er det ${temp} grader og ${desc}. Ha ein fin dag!`;

    console.log("📢 Velkomstmelding:", message);

    await generateSpeech(message);
  } catch (err) {
    console.error("❌ Feil:", err);
    process.exit(1);
  }
}

main();
