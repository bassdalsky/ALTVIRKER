// velkomst_full.js  — bygger EN samlet velkomst.mp3 (intro + klokke + vær)
// Kjør i Actions via workflow "velkomst-full.yml" eller manuelt lokalt (Node 20+).

import fs from "fs";
import path from "path";

// ----------------------- Konfig / secrets -----------------------
const ELEVEN_API        = process.env.ELEVENLABS_API_KEY || "";
const VOICES_RAW        = (process.env.ELEVENLABS_VOICE_IDS || "").trim(); // "voiceId1,voiceId2"
const MODEL_ID          = (process.env.ELEVEN_MODEL_ID || "eleven_turbo_v2_5").trim();
const LANGUAGE_PRIMER   = process.env.LANGUAGE_PRIMER || "";        // t.d. "Snakk nynorsk."
const OW_API            = process.env.OPENWEATHER_API_KEY || "";
const LAT               = process.env.SKILBREI_LAT || "";
const LON               = process.env.SKILBREI_LON || "";
const JULEMODUS_SECRET  = (process.env.JULEMODUS || "").toUpperCase() === "ON";

const VOICES = VOICES_RAW
  ? VOICES_RAW.split(",").map(s => s.trim()).filter(Boolean)
  : [];

// ----------------------- Hjelp -----------------------
const repoRoot = process.cwd();
const msgDir   = path.join(repoRoot, "messages");
const outFile  = path.join(repoRoot, "velkomst.mp3");

const nn = new Intl.Locale ? "nn-NO" : "nb-NO"; // fallback om 'nn-NO' ikkje finst

function randPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function nowOslo() {
  const tz = "Europe/Oslo";
  const d  = new Date();
  // lag eit objekt med formatert dato/tid i Oslo
  const formatter = new Intl.DateTimeFormat("nn-NO", {
    timeZone: tz, hour: "2-digit", minute: "2-digit",
  });
  const time = formatter.format(d); // HH:mm
  const dayName = new Intl.DateTimeFormat("nn-NO", { timeZone: tz, weekday: "long" }).format(d); // måndag
  const dayNum  = new Intl.DateTimeFormat("nn-NO", { timeZone: tz, day: "2-digit" }).format(d);
  const month   = new Intl.DateTimeFormat("nn-NO", { timeZone: tz, month: "long" }).format(d);
  const year    = new Intl.DateTimeFormat("nn-NO", { timeZone: tz, year: "numeric" }).format(d);
  return { time, dayName, dayNum, month, year, dateStr: `${dayNum}. ${month} ${year}` };
}

function isJuleperiodeOslo() {
  const tz = "Europe/Oslo";
  const now = new Date();
  const y = new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric" }).format(now);
  const year = parseInt(y, 10);

  // 18. nov (inneverande år) → 10. jan (neste år)
  const start = new Date(Date.UTC(year, 10, 18, 0, 0, 0)); // merk: mnd 10 = nov (0-basert)
  const end   = new Date(Date.UTC(year + 1, 0, 10, 23, 59, 59)); // 10. jan

  // konverter "no" til UTC-rått ved å bruke offset for Oslo indirekte via parsing er tricky,
  // men vindauget er stort nok at UTC samanlikning er ok her.
  return (now >= start && now <= end) || JULEMODUS_SECRET;
}

function dayFileName() {
  const tz = "Europe/Oslo";
  const d = new Date();
  const day = new Intl.DateTimeFormat("nn-NO", { timeZone: tz, weekday: "long" })
    .format(d).toLowerCase(); // t.d. "måndag"
  // mappar til våre filnamn (utan spesialteikn)
  const map = {
    "måndag": "mandag",
    "tysdag": "tysdag",
    "onsdag": "onsdag",
    "torsdag": "torsdag",
    "fredag": "fredag",
    "laurdag": "laurdag",
    "laurdag ": "laurdag",
    "søndag": "sondag",
    "sundag": "sondag",
  };
  const key = map[day] || "vanleg";
  return `meldinger_${key}.txt`;
}

function readLines(p) {
  if (!fs.existsSync(p)) return [];
  const txt = fs.readFileSync(p, "utf8");
  return txt
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(s => s && !s.startsWith("#"));
}

function pickWelcomeMessage() {
  const isJul = isJuleperiodeOslo();
  const dayFile = dayFileName(); // frå nn → våre filnamn
  const candidates = [];

  // 1) dagens fil
  const dayPath = path.join(msgDir, dayFile);
  candidates.push(...readLines(dayPath));

  // 2) vanleg fallback
  const vanlegPath = path.join(msgDir, "meldinger_vanleg.txt");
  if (!candidates.length) candidates.push(...readLines(vanlegPath));

  // 3) jule-variantar dersom jul (legg til, så dei oftare treff)
  if (isJul) {
    const julPath = path.join(msgDir, "meldinger_jul.txt");
    const julLines = readLines(julPath);
    // boost – legg inn to gongar
    candidates.push(...julLines, ...julLines);
  }

  if (!candidates.length) {
    // hard fallback – lang standardtekst ~20 sek
    return "Så kjekt å sjå deg! Velkommen inn i det smarte heimen min. Her er kaffien klar, lyset fint og humøret på topp. Ta deg god tid, finn roa, og kos deg – du er varmt velkommen.";
  }
  return randPick(candidates);
}

async function getWeather() {
  if (!OW_API || !LAT || !LON) return null;
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${encodeURIComponent(LAT)}&lon=${encodeURIComponent(LON)}&units=metric&lang=nb&appid=${encodeURIComponent(OW_API)}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn("OpenWeather feila:", res.status, await res.text());
    return null;
  }
  const j = await res.json();
  const temp = Math.round(j.main?.temp ?? 0);
  const desc = (j.weather && j.weather[0]?.description) ? j.weather[0].description : "";
  return { temp, desc };
}

// ElevenLabs: skriv direkte fra arrayBuffer (fiksar .pipe-problemet i Actions)
async function ttsToFile({ text, outFile }) {
  if (!ELEVEN_API) throw new Error("Manglar ELEVENLABS_API_KEY");
  const voiceId = VOICES.length ? randPick(VOICES) : "xF681s0UeE04gsf0mVsJ"; // Olaf fallback (norsk-ish)
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?optimize_streaming_latency=0`;
  const payload = {
    model_id: MODEL_ID, // eleven_turbo_v2_5
    text,
    // litt nøytral, naturleg
    voice_settings: { stability: 0.5, similarity_boost: 0.75 }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": ELEVEN_API, "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`ElevenLabs: ${res.status} ${t}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outFile, buffer);
}

// ----------------------- Bygg tekst -----------------------
function buildFinalText() {
  const { time, dayName, dateStr } = nowOslo();
  const isJul = isJuleperiodeOslo();

  const intro = pickWelcomeMessage(); // lang (20–25 s)

  let weatherLine = "";
  let dateLine = `No er det ${dayName} ${dateStr}, klokka er ${time}.`;

  // Primer for å sikre norsk uttale
  const primer = [
    "Hei!",                             // veldig god «norsk-anker»
    LANGUAGE_PRIMER ? LANGUAGE_PRIMER : "", // valfri, frå secrets
  ].filter(Boolean).join(" ");

  return { primer, intro, dateLine, isJul };
}

async function main() {
  console.log("Bygger velkomst.mp3 …");

  const { primer, intro, dateLine, isJul } = buildFinalText();

  let weatherLine = "";
  try {
    const w = await getWeather();
    if (w) {
      // bruk norsk, enkel setning
      weatherLine = `Ute er det ${w.temp} grader, ${w.desc}.`;
    }
  } catch (e) {
    console.warn("Vêret feila:", e.message);
  }

  const julHale = isJul ? "Riktig god jul og kos deg masse!" : "";

  // Sett saman i naturleg rekkefølge
  const finalText = [primer, intro, dateLine, weatherLine, julHale]
    .filter(Boolean)
    .join(" ");

  // Skriv til mp3
  await ttsToFile({ text: finalText, outFile });

  console.log("✅ Skreiv", outFile, "OK");
}

main().catch(err => {
  console.error("❌ Feil:", err);
  process.exit(1);
});
