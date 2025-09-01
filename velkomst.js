// velkomst.js
import fs from "fs";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// Koordinater for Skilbrei
const LAT = 61.3931;
const LON = 5.7815;

async function hentVaer() {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=no`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Klarte ikke hente værdata");
  const data = await res.json();
  return `I dag er det ${Math.round(data.main.temp)} grader og ${data.weather[0].description}.`;
}

async function genererTekst() {
  const dato = new Date().toLocaleDateString("no-NO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const vaer = await hentVaer();

  const hilsninger = [
    `God morgen! I dag er det ${dato}. ${vaer}`,
    `Hei hei! Velkommen til en ny dag, ${dato}. ${vaer}`,
    `Ny dag, nye muligheter! I dag er det ${dato}. ${vaer}`,
  ];

  const melding = hilsninger[Math.floor(Math.random() * hilsninger.length)];
  return melding + " Ha en fin dag videre!";
}

async function lagLyd(tekst) {
  const url = "https://api.elevenlabs.io/v1/text-to-speech/eleven_multilingual_v3_alpha/stream";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: tekst,
      model_id: "eleven_multilingual_v3_alpha",
      voice_settings: { stability: 0.5, similarity_boost: 0.8 },
    }),
  });

  if (!res.ok) throw new Error(`Feil fra ElevenLabs: ${res.statusText}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync("velkomst.mp3", buffer);
  console.log("✅ Ny velkomstmelding generert: velkomst.mp3");
}

(async () => {
  try {
    const tekst = await genererTekst();
    console.log("Generert tekst:", tekst);
    await lagLyd(tekst);
  } catch (err) {
    console.error("[FEIL]", err.message);
    process.exit(1);
  }
})();
