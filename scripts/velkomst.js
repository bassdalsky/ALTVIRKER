import fs from "fs";
import fetch from "node-fetch";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_IDS = process.env.ELEVENLABS_VOICE_IDS.split(",");
const LANGUAGE_PRIMER = process.env.LANGUAGE_PRIMER || "Snakk nynorsk, ikkje dansk.";
const WEATHER_KEY = process.env.OPENWEATHER_API_KEY;
const LAT = process.env.SKILBREI_LAT;
const LON = process.env.SKILBREI_LON;

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function getWeather() {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${WEATHER_KEY}&units=metric&lang=no`;
  const res = await fetch(url);
  const data = await res.json();
  return `${Math.round(data.main.temp)} grader og ${data.weather[0].description}`;
}

function getWeekdayMessage() {
  const d = new Date();
  const day = d.getDay();
  const julemodus = process.env.JULEMODUS === "on" ||
    (d.getMonth() === 11 || d.getMonth() === 0);

  let file = "";
  if (julemodus) file = "messages/meldinger_jul.txt";
  else {
    switch (day) {
      case 1: file = "messages/meldinger_mandag.txt"; break;
      case 2: file = "messages/meldinger_tysdag.txt"; break;
      case 3: file = "messages/meldinger_onsdag.txt"; break;
      case 4: file = "messages/meldinger_torsdag.txt"; break;
      case 5: file = "messages/meldinger_fredag.txt"; break;
      case 6: file = "messages/meldinger_laurdag.txt"; break;
      case 0: file = "messages/meldinger_sondag.txt"; break;
    }
  }
  const lines = fs.readFileSync(file, "utf8").split("\n").filter(l => l.trim());
  return pickRandom(lines);
}

async function makeMp3(text, outFile) {
  const voice = pickRandom(VOICE_IDS);
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_turbo_v2_5",
      voice_settings: { stability: 0.7, similarity_boost: 0.8 },
      language: "no",
      prefill_text: LANGUAGE_PRIMER
    }),
  });

  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outFile, buf);
}

(async () => {
  const weather = await getWeather();
  const d = new Date();
  const klokke = d.toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });
  const dato = d.toLocaleDateString("no-NO", { weekday: "long", day: "numeric", month: "long" });

  const base = getWeekdayMessage();
  const full = `${base} Klokka er ${klokke} den ${dato}. Ute er det ${weather}.`;

  await makeMp3(full, "velkomst.mp3");
})();
