import fs from "fs";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.VOICE_ID;
const LAT = process.env.LAT;
const LON = process.env.LON;

if (!OPENAI_API_KEY || !OPENWEATHER_API_KEY || !ELEVENLABS_API_KEY || !VOICE_ID || !LAT || !LON) {
  console.error("[FEIL] Manglar ein eller fleire miljøvariablar.");
  process.exit(1);
}

async function hentVær() {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&units=metric&lang=no&appid=${OPENWEATHER_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Klarte ikkje hente værdata.");
  const data = await res.json();
  return {
    temp: Math.round(data.main.temp),
    beskrivelse: data.weather[0].description
  };
}

async function lagTekst() {
  const vær = await hentVær();
  const nå = new Date();
  const klokkeslett = nå.toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });
  return `God dag! Klokka er ${klokkeslett}. Temperaturen er ${vær.temp} grader, med ${vær.beskrivelse}. Velkommen heim til Skilbrei!`;
}

async function lagLyd(tekst) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": ELEVENLABS_API_KEY
    },
    body: JSON.stringify({
      text: tekst,
      voice_settings: { stability: 0.5, similarity_boost: 0.7 }
    })
  });

  if (!res.ok) throw new Error("Feil frå ElevenLabs API.");
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync("velkomst.mp3", buffer);
  console.log("[OK] Lydfila 'velkomst.mp3' er generert.");
}

async function main() {
  try {
    const tekst = await lagTekst();
    console.log("[INFO] Generert tekst:", tekst);
    await lagLyd(tekst);
  } catch (err) {
    console.error("[FEIL]", err.message);
    process.exit(1);
  }
}

main();
