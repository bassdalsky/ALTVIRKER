import fs from "fs";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

// Hent API-nøkler og konfig fra env/secrets
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.VOICE_ID;
const LAT = process.env.LAT;
const LON = process.env.LON;

if (!OPENAI_API_KEY || !OPENWEATHER_API_KEY || !ELEVENLABS_API_KEY || !VOICE_ID || !LAT || !LON) {
  console.error("[FEIL] Manglar ein eller fleire environment-variablar.");
  process.exit(1);
}

async function hentVaer() {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&units=metric&lang=no&appid=${OPENWEATHER_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Klarte ikkje hente værdata");
  const data = await res.json();
  return `I dag er det ${Math.round(data.main.temp)} grader og ${data.weather[0].description}.`;
}

async function lagMelding() {
  const vaar = await hentVaer();
  const tidspunkt = new Date().toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });

  return `Hei! Klokka er ${tidspunkt}. ${vaar} Ha ein strålande dag vidare!`;
}

async function lagTale(melding) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text: melding,
      voice_settings: { stability: 0.3, similarity_boost: 0.7 },
    }),
  });

  if (!res.ok) throw new Error("Feil ved generering av lyd");
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync("velkomst.mp3", buffer);
  console.log("✅ Ny velkomstmelding lagra som velkomst.mp3");
}

(async () => {
  try {
    const melding = await lagMelding();
    console.log("Generert melding:", melding);
    await lagTale(melding);
  } catch (err) {
    console.error("FEIL:", err.message);
    process.exit(1);
  }
})();
