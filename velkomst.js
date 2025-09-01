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

// Hent vêr
async function hentVaer() {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=no`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Kunne ikkje hente vêrdata");
  return res.json();
}

// Lag velkomstmelding
function lagMelding(weather) {
  const dag = new Date().toLocaleDateString("no-NO", { weekday: "long" });
  const temp = Math.round(weather.main.temp);
  const forhold = weather.weather[0].description;

  let husk = "";
  if (dag === "mandag") husk = "Hugs å sette ut papirbosset.";
  else if (dag === "onsdag") husk = "I dag er det bossdag på Sande frå klokka 12 til 18.";
  else if (dag === "torsdag") husk = "Hugs å ta ut bosspannet.";

  const morsomKommentarer = [
    "Kanskje det er tid for ein kaffikopp?",
    "Perfekt dag for å late som du er effektiv.",
    "Vêret er gratis – bruk det med måte!",
    "Hugs å smile, det forvirrar naboane.",
    "I dag kan vere ein god dag å skru av og på ruteren."
  ];
  const kommentar = morsomKommentarer[Math.floor(Math.random()]()
