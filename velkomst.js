import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function getWeather() {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const lat = process.env.LAT;
  const lon = process.env.LON;

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=no&appid=${apiKey}`;

  const res = await fetch(url);
  const data = await res.json();

  // Debug: logg hele svaret
  console.log("OpenWeather response:", JSON.stringify(data, null, 2));

  if (!data.main || !data.weather) {
    throw new Error("Ugyldig svar fra OpenWeather. Sjekk API-nøkkel, LAT/LON.");
  }

  return {
    temp: data.main.temp,
    description: data.weather[0].description,
  };
}

function getBossInfo() {
  const day = new Date().toLocaleDateString("no-NO", { weekday: "long" }).toLowerCase();

  if (day === "mandag") return "Hugs å ta ut papirbosset i dag.";
  if (day === "onsdag") return "Bossplassen på Sande er open frå 12 til 18.";
  if (day === "torsdag") return "Hugs å ta ned bosspannet i kveld.";
  return "";
}

async function main() {
  try {
    const weather = await getWeather();
    const bossInfo = getBossInfo();

    const message = `Velkommen heim! Temperaturen ute er ${weather.temp} grader og været er ${weather.description}. ${bossInfo}`;

    console.log("Generert melding:", message);

    // Kall til ElevenLabs for å generere lydfil
    const elevenApiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.VOICE_ID;
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    const audioRes = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": elevenApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model_id: "eleven_multilingual_v3",
        text: message,
        voice_settings: { stability: 0.7, similarity_boost: 0.7 },
      }),
    });

    if (!audioRes.ok) {
      throw new Error(`Feil frå ElevenLabs: ${audioRes.statusText}`);
    }

    const arrayBuffer = await audioRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const outPath = path.join(__dirname, "public", "velkomst.mp3");
    fs.writeFileSync(outPath, buffer);

    console.log("✅ Fil lagra:", outPath);
  }
