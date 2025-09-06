// velkomst_full.js – tvang NORGE (bokmål-format), én valgt stemme, Turbo 2.5
// Lang intro (~20–25 s) fra messages/* + dato/ukedag/klokke + vær, så færrest mulige feilkilder.

import fs from "fs";
import path from "path";

// ====== ENV / SECRETS ======
const ELEVEN_API_KEY      = (process.env.ELEVENLABS_API_KEY || "").trim();
const VOICE_ID            = (process.env.ELEVENLABS_VOICE_ID || "").trim();   // ÉN ID (norsk, fra din probe)
const MODEL_ID            = "eleven_turbo_v2_5";

const OPENWEATHER_API_KEY = (process.env.OPENWEATHER_API_KEY || "").trim();
const LAT                 = (process.env.SKILBREI_LAT || "").trim();
const LON                 = (process.env.SKILBREI_LON || "").trim();

const JULEMODUS           = /^(on|true|1|yes)$/i.test(process.env.JULEMODUS || "");
const USER_PRIMER         = (process.env.LANGUAGE_PRIMER || "").trim(); // du kan la denne stå som du vil

// ====== KONSTANTER ======
const TZ      = "Europe/Oslo";
const ROOT    = process.cwd();
const MSG_DIR = path.join(ROOT, "messages");
const OUT_MP3 = path.join(ROOT, "velkomst.mp3");

// ====== HJELP ======
const randPick = a => a[Math.floor(Math.random() * a.length)];

function nowOslo_nb() {
  // NB: bevisst bokmål-format (nb-NO) for å holde TTS i norsk retning
  const d = new Date();
  const weekday = new Intl.DateTimeFormat("nb-NO", { timeZone: TZ, weekday: "long" }).format(d);
  const day     = new Intl.DateTimeFormat("nb-NO", { timeZone: TZ, day: "2-digit" }).format(d);
  const month   = new Intl.DateTimeFormat("nb-NO", { timeZone: TZ, month: "long" }).format(d);
  const year    = new Intl.DateTimeFormat("nb-NO", { timeZone: TZ, year: "numeric" }).format(d);
  const time    = new Intl.DateTimeFormat("nb-NO", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  return { weekday, day, month, year, time };
}

function isJuleperiode() {
  const d = new Date();
  const y = d.getFullYear();
  const start = new Date(Date.UTC(y, 10, 18, 0, 0, 0));      // 18. nov
  const end   = new Date(Date.UTC(y+1, 0, 10, 23, 59, 59));  // 10. jan
  return (d >= start || d <= end) || JULEMODUS;
}

function safeReadLines(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(s => s && !s.startsWith("#"));
}

function weekdayFile_nb() {
  // Vi aksepterer både bm/nn-varianter i filnavna dine
  const wd = new Intl.DateTimeFormat("nb-NO", { timeZone: TZ, weekday: "long" })
    .format(new Date()).toLowerCase();

  const map = {
    "mandag":  "meldinger_mandag.txt",  "måndag": "meldinger_mandag.txt",
    "tirsdag": "meldinger_tysdag.txt",  "tysdag": "meldinger_tysdag.txt",
    "onsdag":  "meldinger_onsdag.txt",
    "torsdag": "meldinger_torsdag.txt",
    "fredag":  "meldinger_fredag.txt",
    "lørdag":  "meldinger_laurdag.txt", "laurdag": "meldinger_laurdag.txt",
    "søndag":  "meldinger_sondag.txt",  "sundag": "meldinger_sondag.txt"
  };
  return map[wd] || "meldinger_vanleg.txt";
}

function pickWelcomeMessage() {
  const jul = isJuleperiode();
  const dayFile = path.join(MSG_DIR, weekdayFile_nb());
  const base = safeReadLines(dayFile);
  let pool = base.length ? base : safeReadLines(path.join(MSG_DIR, "meldinger_vanleg.txt"));

  if (jul) {
    const julLines = safeReadLines(path.join(MSG_DIR, "meldinger_jul.txt"));
    pool = pool.concat(julLines, julLines); // boost jul i perioden
  }
  if (!pool.length) {
    // solid fallback (~20 s), bokmål
    return "Hjertelig velkommen! Jeg slår på lysene og gjør det hyggelig her inne. Sett deg godt til rette, pust rolig ut og kos deg – her er det varmt, vennlig og rolig tempo.";
  }
  return randPick(pool);
}

async function getWeather_nb() {
  if (!OPENWEATHER_API_KEY || !LAT || !LON) return null;
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${encodeURIComponent(LAT)}&lon=${encodeURIComponent(LON)}&appid=${encodeURIComponent(OPENWEATHER_API_KEY)}&units=metric&lang=no`;
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

// ElevenLabs – arrayBuffer → fil
async function ttsToMp3({ text, voiceId, outPath }) {
  if (!ELEVEN_API_KEY) throw new Error("Mangler ELEVENLABS_API_KEY");
  if (!voiceId)        throw new Error("Mangler ELEVENLABS_VOICE_ID (én norsk ID fra proben)");

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?optimize_streaming_latency=0&output_format=mp3_44100_128`;

  const body = {
    model_id: MODEL_ID,
    text,
    voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.2, use_speaker_boost: true }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": ELEVEN_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`ElevenLabs: ${res.status} ${await res.text()}`);

  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buf);
}

// ====== HOVED ======
async function main() {
  const { weekday, day, month, year, time } = nowOslo_nb();
  const intro = pickWelcomeMessage();

  let vaer = "";
  try {
    const w = await getWeather_nb();
    if (w) vaer = `Ute er det ${w.desc}, omtrent ${w.temp} grader.`;
  } catch (e) { console.warn("Vær-feil:", e.message); }

  const julHilsen = isJuleperiode() ? "Riktig god jul!" : "";

  // ————— Anti-dansk “gjerde” + din primer (om satt) —————
  // Første ord styrer målform sterkt. Vi bruker en kort bokmål-linje, så valgfri bruker-primeren din.
  const hardBokmaal = "Dette skal leses på norsk bokmål, ikke dansk. Si jeg, ikke, også, klokka, kjøleskap, skje, sjø, øy, æ, ø, å.";
  const primerPart  = USER_PRIMER ? ` ${USER_PRIMER}` : "";

  // Hale: alltid helt til slutt
  const hale = `I dag er det ${weekday} ${day}. ${month} ${year}. Klokka er nå ${time}. ${vaer}`.trim();

  const manuscript = [
    hardBokmaal,
    primerPart,
    intro,
    "Her kommer en liten oppdatering.",
    hale,
    julHilsen
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ");

  // Logg for feilsøk
  console.log("↪️ Voice:", VOICE_ID);
  console.log("↪️ Tid/ukedag:", `${weekday} ${day}. ${month} ${year} – ${time} (Europe/Oslo)`);
  console.log("↪️ Julemodus:", isJuleperiode() ? "ON" : "OFF");
  console.log("↪️ Tekst (start):", manuscript.slice(0, 180), "...");

  await ttsToMp3({ text: manuscript, voiceId: VOICE_ID, outPath: OUT_MP3 });

  console.log("✅ Lagret:", OUT_MP3);
}

main().catch(err => { console.error("❌ Feil:", err); process.exit(1); });
