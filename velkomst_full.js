// velkomst_full.js – bygg ÉI ferdig MP3: intro -> vær & klokke (sømlaus)
import fs from "fs/promises";

// ====== Konfig fra Secrets ======
const ELEVEN_API_KEY   = process.env.ELEVENLABS_API_KEY;
const VOICE_IDS_CSV    = process.env.ELEVENLABS_VOICE_IDS || ""; // "olaf,mia,emma" eller IDs
const LANGUAGE_PRIMER  = process.env.LANGUAGE_PRIMER || "Hei! Dette er ei norsk melding.";
const OW_KEY           = process.env.OPENWEATHER_API_KEY;
const LAT              = process.env.SKILBREI_LAT;
const LON              = process.env.SKILBREI_LON;
const JULEMODUS        = (process.env.JULEMODUS || "").toLowerCase() === "on";

// ====== Hjelp ======
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const voiceIds = VOICE_IDS_CSV.split(/[,\s]+/).filter(Boolean);

// Les meldinger.txt (introar)
async function readIntros() {
  const txt = await fs.readFile("meldinger.txt", "utf8");
  return txt
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(s => s && !s.startsWith("#"));
}

// Vêr (kort, nynorsk)
async function getWeather() {
  if (!OW_KEY || !LAT || !LON) return "vêret er ukjent akkurat no";
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${OW_KEY}&lang=no&units=metric`;
  const r = await fetch(url);
  const j = await r.json();
  const desc = (j.weather?.[0]?.description || "ukjent vêr").toLowerCase();
  const t = Math.round(j.main?.temp ?? 0);
  return `vêret er ${desc}, rundt ${t} grader`;
}

// Klokke som "14 32" (leseleg for TTS)
function readableTime() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2,"0");
  const mm = String(now.getMinutes()).padStart(2,"0");
  return `${hh} ${mm}`;
}

// Bygg ferdig tekst (intro -> vær/klokke). Litt julestemning i desember/julemodus.
function buildText(intro, weather, time) {
  const jul = JULEMODUS || (new Date().getMonth() === 11);
  const hale = jul
    ? `Forresten – det nærmar seg jul, så me tek det ekstra hyggeleg her heime.`
    : `Kos deg vidare – me held det lunt og triveleg.`;

  // ingen {KLOKKA}/{VÆR} placeholder – vi legg inn dynamisk her
  return [
    LANGUAGE_PRIMER,                 // drar modellen til norsk
    intro,
    `Når det gjeld vêr og klokke: ${weather}. Klokka er ${time}.`,
    hale
  ].join(" ");
}

// Kall ElevenLabs (Turbo 2.5) – random stemme kvar gong
async function ttsToFile(text, outFile) {
  if (!ELEVEN_API_KEY) throw new Error("Mangler ELEVENLABS_API_KEY");
  const voiceId = pick(voiceIds.length ? voiceIds : ["21m00Tcm4TlvDq8ikWAM"]); // fallback (Rachel)
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;

  const body = {
    text,
    model_id: "eleven_turbo_v2_5",
    voice_settings: { stability: 0.4, similarity_boost: 0.7 },
    // norsk hint
    pronunciation_dictionary: [],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVEN_API_KEY,
      "Accept": "audio/mpeg",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`ElevenLabs feil ${res.status}: ${msg}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(outFile, buf);
  console.log(`✅ Skreiv ${outFile} (${buf.length} byte) med stemme ${voiceId}`);
}

async function main() {
  const intros  = await readIntros();
  const intro   = pick(intros);           // 1) tilfeldig intro (15–20 s typisk)
  const weather = await getWeather();     // 2) ferskt vêr
  const time    = readableTime();         // 3) fersk klokke
  const text    = buildText(intro, weather, time);

  await ttsToFile(text, "velkomst.mp3");
}

main().catch(err => {
  console.error("❌ Feil i velkomst_full:", err);
  process.exit(1);
});
