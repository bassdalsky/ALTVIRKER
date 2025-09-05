import fs from "fs/promises";
import fetch from "node-fetch";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_IDS = process.env.ELEVENLABS_VOICE_IDS.split(",");
const WEATHER_KEY = process.env.OPENWEATHER_API_KEY;
const LAT = process.env.SKILBREI_LAT;
const LON = process.env.SKILBREI_LON;

// Les meldinger.txt
async function getRandomMessage() {
  try {
    const content = await fs.readFile("meldinger.txt", "utf-8");
    const lines = content.split("\n").filter(l => l.trim());
    return lines[Math.floor(Math.random() * lines.length)];
  } catch (err) {
    console.error("Kunne ikkje lese meldinger.txt:", err);
    return "Hei! Velkommen heim til Skilbrei.";
  }
}

// Hent vær
async function getWeather() {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${WEATHER_KEY}&units=metric&lang=no`;
  const res = await fetch(url);
  const data = await res.json();
  return `Temperaturen er ${Math.round(data.main.temp)} grader og været er ${data.weather[0].description}.`;
}

// Lag MP3
async function makeMp3(text) {
  const voice = VOICE_IDS[Math.floor(Math.random() * VOICE_IDS.length)];
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": ELEVENLABS_API_KEY
    },
    body: JSON.stringify({
      text,
      voice_settings: { stability: 0.4, similarity_boost: 0.8 }
    })
  });
  if (!res.ok) throw new Error(`Feil frå ElevenLabs (${res.status})`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await fs.writeFile("velkomst.mp3", buffer);
  console.log("✅ velkomst.mp3 generert!");
}

async function main() {
  const melding = await getRandomMessage();
  const vær = await getWeather();
  const now = new Date();
  const klokka = now.toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });

  const fullText = `${melding} Klokka er ${klokka}. ${vær}`;
  console.log("[DEBUG] Sender til ElevenLabs:", fullText);

  await makeMp3(fullText);
}

main().catch(err => {
  console.error("❌ Feil:", err);
  process.exit(1);
});
