import fs from "fs";
import fetch from "node-fetch";
import { execSync } from "child_process";

const ELEVEN_API = process.env.ELEVENLABS_API_KEY;
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const LAT = process.env.SKILBREI_LAT;
const LON = process.env.SKILBREI_LON;
const LANGUAGE_PRIMER = process.env.LANGUAGE_PRIMER ?? "Hei! Dette er en norsk melding.";

const IDS = (process.env.ELEVENLABS_VOICE_IDS || "")
  .split(",").map(s => s.trim()).filter(Boolean);
const LABELS = (process.env.VOICE_LABELS || "Olaf,Mia,Emma")
  .split(",").map(s => s.trim()).filter(Boolean);

function nowOslo() {
  const d = new Date();
  const weekday_en = d.toLocaleDateString("en-GB", { weekday: "long", timeZone: "Europe/Oslo" }).toLowerCase();
  const time = d.toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Oslo" }).replace(":", " ");
  return { weekday_en, time };
}

async function getWeather() {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=no`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Feil fra OpenWeather (${res.status}): ${await res.text()}`);
  const data = await res.json();
  const temp = Math.round(data.main?.temp ?? 0);
  const desc = (data.weather?.[0]?.description ?? "").trim();
  return `${temp} grader og ${desc}`;
}

async function tts(voiceId, text, outPath) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "Accept": "audio/mpeg",
      "Content-Type": "application/json",
      "xi-api-key": ELEVEN_API
    },
    body: JSON.stringify({
      model_id: "eleven_turbo_v2_5",
      text: `${LANGUAGE_PRIMER} ${text}`,
      voice_settings: { stability: 0.45, similarity_boost: 0.8 }
    })
  });
  if (!res.ok) throw new Error(`Feil fra ElevenLabs (${res.status}): ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buf);
}

function concatMp3(introPath, tailPath, outPath) {
  execSync(`ffmpeg -y -i "${introPath}" -i "${tailPath}" -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1" -ar 44100 -b:a 128k "${outPath}"`, { stdio: "inherit" });
}

function pick(arr){ return arr[Math.floor(Math.random()*arr.length)] }

(async () => {
  try {
    if (!IDS.length || LABELS.length !== IDS.length) throw new Error("Sett ELEVENLABS_VOICE_IDS og VOICE_LABELS (same antal/rekkefølge).");

    const choice = Math.floor(Math.random() * IDS.length);
    const voiceId = IDS[choice]; const label = LABELS[choice];

    const { weekday_en, time } = nowOslo();
    const weather = await getWeather();

    // 🎄 Jul i desember, eller tvang via JULEMODUS=on
    const monthNo = Number(new Date().toLocaleString("en-GB", { month: "numeric", timeZone: "Europe/Oslo" }));
    const isXmas = (process.env.JULEMODUS || "").toLowerCase() === "on" || monthNo === 12;
    const introDir = isXmas ? "intros_xmas" : "intros";

    const introPath = `${introDir}/${weekday_en}_${label}.mp3`;
    if (!fs.existsSync(introPath)) throw new Error(`Mangler introfil: ${introPath}. Kjør riktig intro-setup (vanlig/jul).`);

    // 🔀 Korte hale-varianter for lav credits
    const tailOptions = [
      `Klokka er ${time}. Ute er det ${weather}.`,
      `Nå er klokka ${time}. Ute: ${weather}.`,
      `${time}. Ute: ${weather}.`
    ];
    const tailText = pick(tailOptions);

    await tts(voiceId, tailText, "tail.mp3");
    concatMp3(introPath, "tail.mp3", "velkomst.mp3");
    console.log(`✅ Velkomst klar: voice=${label}, dag=${weekday_en}, xmas=${isXmas}`);

  } catch (e) {
    console.error("❌ Feil:", e);
    process.exit(1);
  }
})();
