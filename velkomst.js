import fs from "fs";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${process.env.LAT}&lon=${process.env.LON}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric&lang=no`;

async function getWeather() {
  const res = await fetch(weatherUrl);
  if (!res.ok) throw new Error(`Feil frå OpenWeather (${res.status})`);
  const data = await res.json();
  return {
    temp: Math.round(data.main.temp),
    desc: data.weather[0].description,
  };
}

function lagMelding(weather) {
  const no = new Date();
  const klokke = no.toLocaleTimeString("nn-NO", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const meldinger = [
    `Hei og velkomen heim! Klokka er ${klokke}, og ute er det ${weather.temp} grader med ${weather.desc}.`,
    `Så kjekt å sjå deg! No er klokka ${klokke}. Ute har vi ${weather.temp} grader og ${weather.desc}.`,
    `Velkomen tilbake! Klokka er ${klokke}. Vêret ute er ${weather.temp} grader og ${weather.desc}.`,
    `God dag! Akkurat no er klokka ${klokke}, og vêret viser ${weather.temp} grader med ${weather.desc}.`,
    `Hei hei! Klokka har passert ${klokke}, ute er det ${weather.temp} grader og ${weather.desc}.`,
  ];

  // vel tilfeldig melding
  return meldinger[Math.floor(Math.random() * meldinger.length)];
}

async function lagTale(melding) {
  const res = await fetch("https://api.elevenlabs.io/v1/text-to-speech/" + process.env.VOICE_ID, {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: melding,
      voice_settings: { stability: 0.5, similarity_boost: 0.7 },
    }),
  });

  if (!res.ok) throw new Error(`Feil frå ElevenLabs (${res.status})`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync("velkomst.mp3", buffer);
  console.log("✅ Laga velkomst.mp3 med melding:");
  console.log(melding);
}

async function main() {
  try {
    const weather = await getWeather();
    const melding = lagMelding(weather);
    await lagTale(melding);
  } catch (err) {
    console.error("❌ Feil:", err);
    process.exit(1);
  }
}

main();
