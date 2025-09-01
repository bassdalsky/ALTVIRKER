import fs from "fs";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

async function getWeather() {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${process.env.LAT}&lon=${process.env.LON}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric&lang=no`;

  console.log("🔎 Hentar vær frå:", url);

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Feil frå OpenWeather (${res.status}): ${text}`);
  }
  return res.json();
}

function lagMelding(weather) {
  const dato = new Date();
  const dagar = ["søndag", "måndag", "tysdag", "onsdag", "torsdag", "fredag", "laurdag"];
  const dag = dagar[dato.getDay()];

  const temperatur = Math.round(weather.main.temp);
  const beskrivelse = weather.weather[0].description;

  const meldingar = [
    `Velkomen heim! I dag er det ${dag}. Ute er det ${temperatur} grader og ${beskrivelse}.`,
    `Hei! Så kjekt å sjå deg. ${dag} i dag – ute ${temperatur} grader og ${beskrivelse}.`,
    `Hallo der! Denne fine ${dag} byr på ${beskrivelse} og ${temperatur} grader ute.`,
    `Vel møtt! Det er ${dag}, ute ${temperatur} grader med ${beskrivelse}.`,
    `God ${dag}! Ute er det ${beskrivelse} og ${temperatur} grader.`,
  ];

  const tilfeldig = meldingar[Math.floor(Math.random() * meldingar.length)];
  return `${tilfeldig} Inne held vi 22 grader stabilt.`;
}

async function generateSpeech(text) {
  const url = "https://api.elevenlabs.io/v1/text-to-speech/" + process.env.VOICE_ID;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      voice_settings: { stability: 0.3, similarity_boost: 0.8 },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Feil frå ElevenLabs (${res.status}): ${text}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync("velkomst.mp3", Buffer.from(arrayBuffer));
  console.log("✅ MP3 generert: velkomst.mp3");
}

async function main() {
  try {
    const weather = await getWeather();
    const melding = lagMelding(weather);
    console.log("📢 Velkomstmelding:", melding);
    await generateSpeech(melding);
  } catch (err) {
    console.error("❌ Feil:", err);
    process.exit(1);
  }
}

main();
