// velkomst_full.js
// EN MP3: lang intro (~20–25 s) fra messages/* + dato/ukedag/klokke + vær.
// Tvinger norsk bokmål ved:
//  - Modell: eleven_turbo_v2_5 (låst)
//  - Stemme: Olaf (xF681s0UeE04gsf0mVsJ) (låst, ignorerer secrets)
//  - Sterk norsk primer først i teksten
//  - Europe/Oslo + nb-NO formatering, OpenWeather lang=no

import fs from "fs";
import path from "path";

// ==== LÅSTE KONFIGER ====
const MODEL_ID = "eleven_turbo_v2_5";
const VOICE_ID = "xF681s0UeE04gsf0mVsJ"; // Olaf

// ==== SECRETS / ENV ====
const ELEVEN_API           = process.env.ELEVENLABS_API_KEY || "";
const OPENWEATHER_API_KEY  = process.env.OPENWEATHER_API_KEY || "";
const LAT                  = (process.env.SKILBREI_LAT || "").trim();
const LON                  = (process.env.SKILBREI_LON || "").trim();
const JULEMODUS            = /^(on|true|1|yes)$/i.test(process.env.JULEMODUS || "");

// ==== KONSTANTER ====
const TZ = "Europe/Oslo";
const ROOT = process.cwd();
const MSG_DIR = path.join(ROOT, "messages");
const OUT_MP3 = path.join(ROOT, "velkomst.mp3");

// ==== HJELP ====
const randPick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function nowOslo_nb() {
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
    // Solid, LANG fallback (~20 s) – bokmål
    return "Hjertelig velkommen! Jeg slår på lysene og gjør det hyggelig her hjemme. Sett deg godt til rette, pust rolig ut, og kos deg – her er det varmt, vennlig og lett å lande etter en lang dag.";
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

// ElevenLabs – arrayBuffer → fil (fiks for Actions)
async function ttsToMp3({ text, outPath }) {
  if (!ELEVEN_API) throw new Error("Mangler ELEVENLABS_API_KEY");
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream?optimize_streaming_latency=4&output_format=mp3_44100_128`;

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

// ==== HOVED ====
async function main() {
  const { weekday, day, month, year, time } = nowOslo_nb();
  const intro = pickWelcomeMessage(); // lang intro (~20–25 s)

  let vaer = "";
  try {
    const w = await getWeather_nb();
    if (w) vaer = `Ute er det ${w.desc}, omtrent ${w.temp} grader.`;
  } catch (e) { console.warn("Vær-feil:", e.message); }

  const julHilsen = isJuleperiode() ? "Riktig god jul!" : "";

  // *** SUPER-NORSK PRIMER (første ord styrer språk sterkt) ***
  // Inneholder ord, tall og tegn som modeller forbinder klart med norsk bokmål.
  const hardPrimer = [
    "Hei!",
    "Dette skal leses på norsk bokmål, ikke dansk eller svensk.",
    "Si: jeg, ikke, også, klokka, hjem, hyggelig, vær, kjøleskap, skje, sjø, øy, æ, ø, å.",
    "Tall sies på norsk, for eksempel: tretten, tjue, trettifem, førti, femti.",
  ].join(" ");

  // ÉN tekst – intro først, så oppdateringen (dato/ukedag/klokke + vær)
  const hale = `I dag er det ${weekday} ${day}. ${month} ${year}. Klokka er nå ${time}. ${vaer}`.trim();

  const manuscript = [
    hardPrimer,          // ← sterk språkforankring
    intro,
    "Her kommer en liten oppdatering.",
    hale,
    julHilsen
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ");

  await ttsToMp3({ text: manuscript, outPath: OUT_MP3 });
  console.log("✅ Lagret:", OUT_MP3);
}

main().catch(err => { console.error("❌ Feil:", err); process.exit(1); });
