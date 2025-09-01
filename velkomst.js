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
  console.error("[FEIL] Mangler en eller flere miljøvariabler (.env eller GitHub Secrets).");
  process.exit(1);
}

async function hentVaer() {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=no`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Klarte ikke hente værdata");
  const data = await res.json();
  return `${Math.round(data.main.temp)} grader og ${data.weather[0].description}`;
}

async function lagMelding() {
  const weekday = new Date().toLocaleDateString("no-NO", { weekday: "long" });
  const vaer = await hentVaer();

  const prompt = `
Lag en kort, morsom velkomstmelding på norsk.
Den skal
