// velkomst.js
import fs from "fs";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.VOICE_ID;

// 🏡 Lokasjon (endre til din plass)
const LAT = process.env.SKILBREI_LAT || "61.3975";
const LON = process.env.SKILBREI_LON || "5.8487";

// 🔔 Hugs-liste
function huskMelding(dag) {
  switch (dag) {
    case "monday":
      return "I dag må du hugse å sette ut papirbosset.";
    case "wednesday":
      return "Hugs at bossplassen på Sande er open frå klokka 12 til 18.";
    case "thursday":
      return "I dag må du hugse å ta ned bossspannet.";
    default:
      return "";
  }
}

// ☁️ Hent værdata frå OpenWeather
async function hentVaer() {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&units=metric&lang=no&appid=${OPENWEATHER_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error("Klarte ikkje hente værdata");
    return { temp: 0, desc: "ukjent vær" };
  }
  const data = await res.json();
  return {
    temp: Math.round(data.main.temp),
    desc: data.weather[0].description,
  };
}

// 🧠 Generer velkomstmelding med OpenAI
async function lagMelding() {
  const dato = new Date();
  const ukedag = dato.toLocaleDate
