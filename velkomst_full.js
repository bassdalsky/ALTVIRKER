// velkomst_full.js
// ÉI MP3: lang intro (~20–25 s) frå messages/* + dato/ukedag/klokke + vær.
// Tvingar norsk ("Hei!") og Europe/Oslo. ElevenLabs: eleven_turbo_v2_5.

import fs from "fs";
import path from "path";

// ==== SECRETS / ENV ====
const ELEVEN_API        = process.env.ELEVENLABS_API_KEY || "";
const VOICES_RAW        = (process.env.ELEVENLABS_VOICE_IDS || "").trim(); // "id1,id2,id3"
const VOICE_LIST        = VOICES_RAW ? VOICES_RAW.split(",").map(s=>s.trim()).filter(Boolean) : [];
const MODEL_ID          = "eleven_turbo_v2_5"; // LÅST (unngå dansk)
const LANGUAGE_PRIMER   = (process.env.LANGUAGE_PRIMER || "Hei!").trim();

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || "";
const LAT = (process.env.SKILBREI_LAT || "").trim();
const LON = (process.env.SKILBREI_LON || "").trim();

const JULEMODUS = /^(on|true|1|yes)$/i.test(process.env.JULEMODUS || "");

// ==== KONSTANTAR ====
const TZ = "Europe/Oslo";
const ROOT = process.cwd();
const MSG_DIR = path.join(ROOT, "messages");
const OUT_MP3 = path.join(ROOT, "velkomst.mp3");

// ==== HJELP ====
const randPick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function nowOslo() {
  const d = new Date();
  const weekday = new Intl.DateTimeFormat("nn-NO", { timeZone: TZ, weekday: "long" }).format(d);
  const day     = new Intl.DateTimeFormat("nn-NO", { timeZone: TZ, day: "2-digit" }).format(d);
  const month   = new Intl.DateTimeFormat("nn-NO", { timeZone: TZ, month: "long" }).format(d);
  const year    = new Intl.DateTimeFormat("nn-NO", { timeZone: TZ, year: "numeric" }).format(d);
  const time    = new Intl.DateTimeFormat("nn-NO", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  return { weekday, day, month, year, time };
}

function isJuleperiode() {
  const d = new Date();
  const y = d.getFullYear();
  const start = new Date(Date.UTC(y, 10, 18, 0, 0, 0));    // 18. nov
  const end   = new Date(Date.UTC(y+1, 0, 10, 23, 59, 59)); // 10. jan
  return (d >= start || d <= end) || JULEMODUS;
}

function safeReadLines(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(s => s && !s.startsWith("#"));
}

function weekdayFile() {
  const wd = new Intl.DateTimeFormat("nn-NO", { timeZone: TZ, weekday: "long" })
    .format(new Date()).toLowerCase();

  const map = {
    "måndag": "meldinger_mandag.txt", "mandag": "meldinger_mandag.txt",
    "tysdag": "meldinger_tysdag.txt", "tirsdag": "meldinger_tysdag.txt",
    "onsdag": "meldinger_onsdag.txt",
    "torsdag": "meldinger_torsdag.txt",
    "fredag": "meldinger_fredag.txt",
    "laurdag": "meldinger_laurdag.txt", "lørdag": "meldinger_laurdag.txt",
    "søndag": "meldinger_sondag.txt", "sundag": "meldinger_sondag.txt"
  };
  return map[wd] || "meldinger_vanleg.txt";
}

function pickWelcomeMessage() {
  const jul = isJuleperiode();
  const dayFile = path.join(MSG_DIR, weekdayFile());
  const base = safeReadLines(dayFile);
  let pool = base.length ? base : safeReadLines(path.join(MSG_DIR, "meldinger_vanleg.txt"));

  if (jul) {
    const julLines = safeReadLines(path.join(MSG_DIR, "meldinger_jul.txt"));
    pool = pool.concat(julLines, julLines); // boost jul i perioden
  }
  if (!pool.length) {
    // Solid, lang fallback (~20 s)
    return "Hjartleg velkommen inn! Eg slår på lys og gjer det triveleg. Set deg godt til rette, pust ut og lat skuldrene falle på plass. Denne heimen er på lag med deg – varm, venleg, og alltid klar for ein god pause midt i dagen.";
  }
  return randPick(pool);
}

async function getWeather() {
  if (!OPENWEATHER_API_KEY || !LAT || !LON) return null;
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${encodeURIComponent(LAT)}&lon=${encodeURIComponent(LON)}&appid=${encodeURIComponent(OPENWEATHER_API_KEY)}&units=metric&lang=nn`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn("OpenWeather:", res.status, await res.text());
    return null;
  }
  const j = await res.json();
  const temp = Math.round(j.main?.temp ?? 0);
  const desc = (j.weather?.[0]?.description || "").toLowerCase();
  return { temp, desc };
}

// ElevenLabs – bruk arrayBuffer → skriv fil (fiksar .pipe-problem i Actions)
async function ttsToMp3({ text, voiceId, outPath }) {
  if (!ELEVEN_API) throw new Error("Manglar ELEVENLABS_API_KEY");
  const id = voiceId || "xF681s0UeE04gsf0mVsJ"; // Olaf fallback
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${id}/stream?optimize_streaming_latency=4&output_format=mp3_44100_128`;

  const body = {
    model_id: MODEL_ID,
    text,
    voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": ELEVEN_API, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`ElevenLabs: ${res.status} ${await res.text()}`);

  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buf);
}

// ==== HOVUD ====
async function main() {
  const { weekday, day, month, year, time } = nowOslo();
  const intro = pickWelcomeMessage(); // lang intro (~20–25 s)

  let vaer = "";
  try {
    const w = await getWeather();
    if (w) vaer = `Ute er det ${w.desc}, rundt ${w.temp} grader.`;
  } catch (e) { console.warn("Vêr-feil:", e.message); }

  const julHls = isJuleperiode() ? "Riktig god jul!" : "";

  // ÉIN tekst – intro først, så oppdateringa (dato/ukedag/klokke + vær)
  const primer = LANGUAGE_PRIMER || "Hei!";
  const hale = `I dag er det ${weekday} ${day}. ${month} ${year}. Klokka er ${time}. ${vaer}`.trim();

  const manuscript = [primer, intro, "Her kjem ei lita oppdatering.", hale, julHls]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ");

  const voiceId = VOICE_LIST.length ? randPick(VOICE_LIST) : "xF681s0UeE04gsf0mVsJ";
  await ttsToMp3({ text: manuscript, voiceId, outPath: OUT_MP3 });
  console.log("✅ Lagra:", OUT_MP3);
}

main().catch(err => { console.error("❌ Feil:", err); process.exit(1); });
