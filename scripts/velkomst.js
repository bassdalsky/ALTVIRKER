import fs from "fs";
import fetch from "node-fetch";

// 🔑 Secrets (GitHub Actions → Secrets)
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_IDS = (process.env.ELEVENLABS_VOICE_IDS || "").split(",").map(s => s.trim()).filter(Boolean);
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const LAT = process.env.SKILBREI_LAT;
const LON = process.env.SKILBREI_LON;

// 🎲 tilfeldig stemme
function randomVoice() {
  if (!VOICE_IDS.length) throw new Error("Mangler ELEVENLABS_VOICE_IDS.");
  return VOICE_IDS[Math.floor(Math.random() * VOICE_IDS.length)];
}

// 🕒 Oslo-tid / ukedag / klokke / dato
function osloStrings() {
  const now = new Date();
  const weekday = now.toLocaleDateString("no-NO", { weekday: "long", timeZone: "Europe/Oslo" });
  const date = now.toLocaleDateString("no-NO", { day: "2-digit", month: "long", timeZone: "Europe/Oslo" });
  const time = now.toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Oslo" });
  return { weekday, date, time };
}

// 🌤️ vær
async function getWeather() {
  if (!OPENWEATHER_API_KEY || !LAT || !LON) return null;
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=no`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Kunne ikkje hente værdata (${res.status})`);
  const data = await res.json();
  return `${Math.round(data.main.temp)} grader og ${data.weather?.[0]?.description || "ukjent vær"}`;
}

// 📖 velg rett meldingsfil etter dag (støtter både nynorsk/bokmål-navn i repoet)
function pickMessageFile() {
  const w = new Date().toLocaleDateString("no-NO", { weekday: "long", timeZone: "Europe/Oslo" }).toLowerCase();
  const map = {
    "mandag": "messages/mandag.txt",
    "tirsdag": "messages/tysdag.txt",
    "tysdag": "messages/tysdag.txt",
    "onsdag": "messages/onsdag.txt",
    "torsdag": "messages/torsdag.txt",
    "fredag": "messages/fredag.txt",
    "lørdag": "messages/laurdag.txt",
    "laurdag": "messages/laurdag.txt",
    "søndag": "messages/sondag.txt",
    "sundag": "messages/sondag.txt",
  };
  return map[w] || "messages/mandag.txt"; // fallback
}

function pickRandomLine(path) {
  const lines = fs.readFileSync(path, "utf-8").split("\n").map(l => l.trim()).filter(Boolean);
  if (!lines.length) throw new Error(`Tom meldingsfil: ${path}`);
  return lines[Math.floor(Math.random() * lines.length)];
}

// 🔊 ElevenLabs
async function generateMp3(text, outFile) {
  const voice = randomVoice();
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice}`;
  const body = {
    model_id: "eleven_turbo_v2_5",
    text, // 👈 KUN meldingen – ingen primer leses opp
    voice_settings: { stability: 0.5, similarity_boost: 0.8 }
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`ElevenLabs-feil (${res.status}): ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outFile, buf);
  console.log(`✅ Skreiv ${outFile} (${(buf.length/1024/1024).toFixed(2)} MB)`);
}

async function main() {
  const file = pickMessageFile();
  const base = pickRandomLine(file);                 // lang, vennleg velkomst-tekst (20–25 s)
  const { weekday, date, time } = osloStrings();
  const weather = await getWeather().catch(() => null);

  // slutt-del (dato/klokke/evt vær) kjem etter velkomst-teksten
  const tail = weather
    ? ` I dag er det ${weekday} ${date}. Klokka er ${time}, og ute er det ${weather}.`
    : ` I dag er det ${weekday} ${date}, og klokka er ${time}.`;

  const fullText = `${base}${tail}`;
  console.log("🎙️ Genererer velkomst:", fullText);

  await generateMp3(fullText, "velkomst.mp3");
}

main().catch(err => {
  console.error("❌ Feil:", err);
  process.exit(1);
});
