// scripts/velkomst_jul.js
// Byggar jule-velkomst på Nynorsk -> velkomst.mp3
// Krav: OPENWEATHER_API_KEY, SKILBREI_LAT, SKILBREI_LON, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_IDS, LANGUAGE_PRIMER
// Node 20+ (innebygd fetch)

import fs from "node:fs/promises";
import path from "node:path";

// ----- Oppsett -----
const TZ = "Europe/Oslo";
const LAT = process.env.SKILBREI_LAT;
const LON = process.env.SKILBREI_LON;
const OPENWEATHER = process.env.OPENWEATHER_API_KEY;
const ELEVEN = process.env.ELEVENLABS_API_KEY;
const VOICES = (process.env.ELEVENLABS_VOICE_IDS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

// Hald oss til norske stemmer (dersom du har miksa IDs i hemmeligheiten)
const NORWEGIAN_ONLY = VOICES.filter(v =>
  // la det vera ein enkel whitelist-check – legg til fleire IDs om du vil
  /^[a-z0-9]{32}$/i.test(v)
);
// Fallback: bruk alle oppgitt
const PICKABLE_VOICES = NORWEGIAN_ONLY.length ? NORWEGIAN_ONLY : VOICES;

const LANGUAGE_PRIMER =
  process.env.LANGUAGE_PRIMER ||
  "Snakk NORSK (Nynorsk). IKKJE dansk. Bruk norske ord og uttalar. Ver naturleg og varm.";

// ----- Småhjelp -----
const nnDag = ["sundag","måndag","tysdag","onsdag","torsdag","fredag","laurdag"];
const nnMnd = ["januar","februar","mars","april","mai","juni","juli","august","september","oktober","november","desember"];

function osloNow() {
  const d = new Date();
  const fmt = new Intl.DateTimeFormat("nb-NO", {
    timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false
  }).format(d);
  const parts = fmt.split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  // separate for tekstformat:
  const ds = new Intl.DateTimeFormat("nb-NO", { timeZone: TZ, weekday:"long" }).format(d);
  const ms = new Intl.DateTimeFormat("nb-NO", { timeZone: TZ, month:"long" }).format(d);
  const dayIndex = new Date(d.toLocaleString("en-US", { timeZone: TZ })).getDay(); // 0=sunday
  const monthIndex = new Date(d.toLocaleString("en-US", { timeZone: TZ })).getMonth();
  const dateNum = new Date(d.toLocaleString("en-US", { timeZone: TZ })).getDate();
  return {
    hour: h, minute: m,
    klokke: `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`,
    ukedag: nnDag[dayIndex],
    datoStr: `${dateNum}. ${nnMnd[monthIndex]}`
  };
}

async function lesLinjer(relPath) {
  const p = path.resolve(process.cwd(), relPath);
  const raw = await fs.readFile(p, "utf8");
  return raw
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && !l.startsWith("#"));
}

function tilfeldig(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ----- Vêr -----
async function hentVaer() {
  if (!OPENWEATHER || !LAT || !LON) return null;
  const url =
    `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${OPENWEATHER}&units=metric&lang=no`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const j = await res.json();
  const temp = Math.round(j.main?.temp ?? 0);
  const desc = (j.weather?.[0]?.description ?? "").toLowerCase();
  return { temp, desc };
}

// ----- ElevenLabs TTS (non-streaming, trygg i Actions) -----
async function ttsToBuffer(text, voiceId) {
  const payload = {
    model_id: "eleven_turbo_v2_5",       // rask og norsk-venleg
    text,
    voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    // Primer i systemprompt for å halde oss på nynorsk
    prompting: {
      text: LANGUAGE_PRIMER
    }
  };

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVEN,
      "Content-Type": "application/json",
      "Accept": "audio/mpeg"
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`ElevenLabs feila ${res.status}: ${t}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return buf;
}

// ----- FFmpeg (via avconcat – enkel WAV+WAV -> MP3 er overkill her).
// For enkelheit: vi lagar éin samanhengande tekst og gjer éin TTS.
function lagJuleTekst(introLinje, klokke, ukedag, dato, vaar) {
  const delar = [];

  // hyggjeleg velkomst frå meldingsfila
  delar.push(introLinje);

  // Litt sesongpreg
  delar.push("No er det snart jul – her i huset er lysa tent og stemninga på topp.");

  // Dato/klokke
  delar.push(`Klokka er ${klokke}, og det er ${ukedag} den ${dato}.`);

  // Vêr hvis tilgjengeleg
  if (vaar) {
    delar.push(`Ute er det ${vaar.desc}, og temperaturen ligg kring ${vaar.temp} grader.`);
  }

  // lita avslutning
  delar.push("Riktig god jul, og velkomen inn!");

  // Samle – og la TTS ta pausar naturleg
  return delar.join(" ");
}

// ----- Hovud -----
async function main() {
  // 1) Les ei tilfeldig julelinje
  const linjer = await lesLinjer("messages/meldinger_jul.txt");
  const intro = tilfeldig(linjer);

  // 2) Tid & dato
  const now = osloNow();

  // 3) Vêr
  const vaar = await hentVaer();

  // 4) Lag endelig tekst
  const voice = tilfeldig(PICKABLE_VOICES);
  const fullTekst = lagJuleTekst(intro, now.klokke, now.ukedag, now.datoStr, vaar);

  // 5) TTS
  if (!ELEVEN || PICKABLE_VOICES.length === 0) {
    throw new Error("Mangler ELEVENLABS_API_KEY eller ELEVENLABS_VOICE_IDS");
  }
  const mp3 = await ttsToBuffer(fullTekst, voice);

  // 6) Skriv ut -> velkomst.mp3 (same som vanleg)
  await fs.writeFile("velkomst.mp3", mp3);
  console.log("✅ Skreiv velkomst.mp3 (juleversjon) med norsk/nynorsk.");
}

main().catch(err => {
  console.error("❌ Feil:", err);
  process.exit(1);
});
