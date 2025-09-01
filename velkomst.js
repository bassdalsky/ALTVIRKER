// velkomst.js
import fs from "fs";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

// Hent variabler fra env/secrets
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // fallback stemme
const LAT = process.env.LAT;
const LON = process.env.LON;

if (!OPENAI_API_KEY || !OPENWEATHER_API_KEY || !ELEVENLABS_API_KEY || !LAT || !LON) {
  console.error("[FEIL] Manglar ein eller fleire env variablar");
  process.exit(1);
}

// Hent værdata
async function hentVaer() {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&units=metric&lang=no&appid=${OPENWEATHER_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Klarte ikkje hente værdata");
  return res.json();
}

// Lag melding
async function lagMelding() {
  const dato = new Date();
  const ukedager = ["søndag", "mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag"];
  const dag = ukedager[dato.getDay()]
