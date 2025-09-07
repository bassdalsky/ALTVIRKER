// Godkveld jul – brukar innebygd fetch (Node 20+)
// Snakkar nynorsk og tek med julemeldingar frå messages/meldinger_godkveld_jul.txt

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// Hjelpevariablar for filsti
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Hent secrets frå miljøvariablar
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const LAT = process.env.SKILBREI_LAT;
const LON = process.env.SKILBREI_LON;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_IDS = process.env.ELEVENLABS_VOICE_IDS?.split(",") ?? [];
const LANGUAGE_PRIMER = process.env.LANGUAGE_PRIMER ?? "Snakk nynorsk, varmt og naturleg.";
const JUL = process.env.JULEMODUS === "on";

async function getWeather() {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&units=metric&lang=no&appid=${OPENWEATHER_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Feil frå OpenWeather: ${res.status}`);
  return res.json();
}

async function getMessage() {
  const file = JUL
    ? path.join(__dirname, "../messages/meldinger_godkveld_jul.txt")
    : path.join(__dirname, "../messages/meldinger_godkveld.txt");

  const raw = await fs.readFile(file, "utf-8");
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
  return lines[Math.floor(Math.random() * lines.length)];
}

async function synthesize(text) {
  const voice = ELEVENLABS_VOICE_IDS.length
    ? ELEVENLABS_VOICE_IDS[Math.floor(Math.random() * ELEVENLABS_VOICE_IDS.length)]
    : "default";

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_turbo_v2_5",
      voice_settings: { stability: 0.4, similarity_boost: 0.8 },
    }),
  });

  if (!res.ok) throw new Error(`Feil frå ElevenLabs: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile("godkveld.mp3", buf);
}

async function main() {
  const weather = await getWeather();
  const msg = await getMessage();

  const fullText = `${LANGUAGE_PRIMER}\n
    Det er ${new Date().toLocaleTimeString("no-NO", { timeZone: "Europe/Oslo", hour: "2-digit", minute: "2-digit" })}.
    Temperaturen ute er ${Math.round(weather.main.temp)} grader.
    Været er: ${weather.weather[0].description}.
    ${msg}
  `;

  console.log("Genererer jule-hilsen med tekst:");
  console.log(fullText);

  await synthesize(fullText);
  console.log("🎄 Ferdig! Filen er lagra som godkveld.mp3");
}

main().catch(err => {
  console.error("Feil:", err);
  process.exit(1);
});
