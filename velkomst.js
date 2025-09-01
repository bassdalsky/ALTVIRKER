import fs from "fs";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.VOICE_ID;
const LAT = process.env.SKILBREI_LAT;
const LON = process.env.SKILBREI_LON;

// Hent værdata
async function getWeather() {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&units=metric&lang=no&appid=${OPENWEATHER_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return {
    temp: Math.round(data.main.temp),
    desc: data.weather[0].description,
  };
}

// Lag dagens melding
function makeMessage(weather) {
  const day = new Date().toLocaleDateString("no-NO", { weekday: "long" });
  let extra = "";

  if (day === "mandag") {
    extra = "Husk å sette ut papirbosset.";
  } else if (day === "onsdag") {
    extra = "Bossplassen på Sande er åpen fra 12 til 18.";
  } else if (day === "torsdag") {
    extra = "Husk å ta ned boss spannet.";
  }

  return `Velkommen heim! I dag er det ${day}. ${extra} Eg skrur på lysa dine. Temperaturen inne er rundt 22 grader. Ute er det ${weather.temp} grader og ${weather.desc}. Ha ein fin dag!`;
}

// Generer tekst til tale med ElevenLabs
async function generateTTS(text) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?optimize_streaming_latency=0&output_format=mp3_44100_128`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Feil frå ElevenLabs: ${res.status} ${res.statusText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync("velkommen.mp3", Buffer.from(arrayBuffer));
}

async function main() {
  try {
    const weather = await getWeather();
    const message = makeMessage(weather);
    console.log("Generert melding:", message);

    await generateTTS(message);
    console.log("✅ Lydfil lagra som velkommen.mp3");
  } catch (err) {
    console.error("❌ Feil:", err);
    process.exit(1);
  }
}

main();
