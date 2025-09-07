import fs from "fs";
import fetch from "node-fetch";

// 🔑 Secrets frå GitHub
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_IDS = (process.env.ELEVENLABS_VOICE_IDS || "").split(",");
const LANGUAGE_PRIMER = process.env.LANGUAGE_PRIMER || "";
const WEATHER_KEY = process.env.OPENWEATHER_API_KEY;
const LAT = process.env.SKILBREI_LAT;
const LON = process.env.SKILBREI_LON;

// 🎲 Velg tilfeldig stemme
function randomVoice() {
  return VOICE_IDS[Math.floor(Math.random() * VOICE_IDS.length)];
}

// 🌤️ Hent vær
async function getWeather() {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${WEATHER_KEY}&units=metric&lang=no`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Kunne ikkje hente værdata");
  const data = await res.json();
  return `${Math.round(data.main.temp)} grader og ${data.weather[0].description}`;
}

// 🕒 Hent klokke/dato
function getTimeAndDate() {
  const now = new Date();
  const optionsDate = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  const optionsTime = { hour: "2-digit", minute: "2-digit" };
  const dato = now.toLocaleDateString("no-NO", optionsDate);
  const klokke = now.toLocaleTimeString("no-NO", optionsTime);
  return { dato, klokke };
}

// 📖 Velg tilfeldig melding frå messages/
function getRandomMessage() {
  const weekday = new Date().toLocaleDateString("no-NO", { weekday: "long" }).toLowerCase();
  const path = `messages/${weekday}.txt`;
  const lines = fs.readFileSync(path, "utf-8").split("\n").filter(l => l.trim());
  return lines[Math.floor(Math.random() * lines.length)];
}

// 🔊 Lag MP3 frå ElevenLabs
async function makeMp3(text) {
  const voice = randomVoice();
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: LANGUAGE_PRIMER + " " + text,
      model_id: "eleven_turbo_v2_5",
      voice_settings: { stability: 0.5, similarity_boost: 0.8 }
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs-feil (${res.status})`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync("velkomst.mp3", buffer);
  console.log("✅ velkomst.mp3 generert!");
}

async function main() {
  const { dato, klokke } = getTimeAndDate();
  const vær = await getWeather();
  const melding = getRandomMessage();

  const fullText = `${melding} I dag er det ${dato}. Klokka er ${klokke}, og ute er det ${vær}.`;
  await makeMp3(fullText);
}

main().catch(err => {
  console.error("❌ Feil:", err);
  process.exit(1);
});
