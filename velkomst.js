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
  const dag = ukedager[dato.getDay()];
  const klokkeslett = dato.toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });

  const vaer = await hentVaer();
  const tempUte = Math.round(vaer.main.temp);
  const beskrivelse = vaer.weather[0].description;

  let ekstra = "";
  if (dag === "onsdag") ekstra = "Hugs at det er bossdag på Sande mellom klokka 12 og 18.";
  if (dag === "torsdag") ekstra = "I morgon må du hugse å setje ut boss spannet.";
  if (dag === "mandag") ekstra = "I dag er det papirbosset som skal ut.";

  const morsommeForslag = [
    "Kanskje i dag er ein perfekt dag for ein kopp kaffi.",
    "Hugs å smile – det forvirrar naboen.",
    "Du fortener ein pause – kanskje ein liten lur?",
    "Perfekt dag for å skru av hjernen og på TV-en.",
  ];
  const humor = morsommeForslag[Math.floor(Math.random() * morsommeForslag.length)];

  return `Velkommen heim! Eg har skrudd på alt lys til deg. Klokka er ${klokkeslett}. Ute er det ${tempUte} grader og ${beskrivelse}. Inne er det 22 grader. ${ekstra} ${humor}`;
}

// Lag mp3 med ElevenLabs
async function lagTale(tekst) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: tekst,
      voice_settings: {
        stability: 0.4,
        similarity_boost: 0.8,
      },
    }),
  });

  if (!res.ok) throw new Error("Klarte ikkje lage tale med ElevenLabs");

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync("velkomst.mp3", buffer);
  console.log("[OK] Lydfil lagra som velkomst.mp3");
}

// Kjør
(a
