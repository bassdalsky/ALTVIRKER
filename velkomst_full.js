// velkomst_full.js – ÉI ferdig MP3: intro -> vêr & klokke (sømlaus, nynorsk, Oslo-tid)

import fs from "fs/promises";

// ====== Secrets / miljøvariablar ======
const ELEVEN_API_KEY  = process.env.ELEVENLABS_API_KEY;
const VOICE_IDS_CSV   = process.env.ELEVENLABS_VOICE_IDS || ""; // kommaseparert liste
const LANGUAGE_PRIMER = process.env.LANGUAGE_PRIMER || "Hei! Dette er ei norsk melding på nynorsk.";
const OW_KEY          = process.env.OPENWEATHER_API_KEY;
const LAT             = process.env.SKILBREI_LAT;
const LON             = process.env.SKILBREI_LON;
const JULEMODUS       = (process.env.JULEMODUS || "").toLowerCase() === "on";
const TIME_STYLE      = process.env.READABLE_TIME_STYLE || "space"; // "space" | "og" | "colon"

// ====== Hjelp ======
const TZ = "Europe/Oslo";
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const VOICE_IDS = VOICE_IDS_CSV.split(/[,\s]+/).filter(Boolean);

// Rett norsk tid og dag
function timeAndDay(style = "space") {
  // Ukedag (nynorsk)
  const dag = new Intl.DateTimeFormat("nn-NO", {
    weekday: "long",
    timeZone: TZ,
  }).format(new Date());

  // Klokkeslett (24t-format, Europe/Oslo)
  let klokke = new Intl.DateTimeFormat("nn-NO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  }).format(new Date());

  if (style === "space") klokke = klokke.replace(":", " ");     
  else if (style === "og") klokke = klokke.replace(":", " og "); 

  return { dag, klokke };
}

// Sett inn {DAG}, {KLOKKA}, {VÆR}
function applyPlaceholders(rawText, weatherString, style = "space") {
  const { dag, klokke } = timeAndDay(style);
  return rawText
    .replaceAll("{DAG}", dag)
    .replaceAll("{KLOKKA}", klokke)
    .replaceAll("{VÆR}", weatherString);
}

// Les introar frå meldinger.txt
async function readIntros() {
  const txt = await fs.readFile("meldinger.txt", "utf8");
  return txt
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(s => s && !s.startsWith("#"));
}

// Vêr (kort, nynorskjustert)
async function getWeatherString() {
  if (!OW_KEY || !LAT || !LON) return "vêret er ukjent akkurat no";
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${OW_KEY}&lang=no&units=metric`;
  const r = await fetch(url);
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    console.error("[WARN] OpenWeather:", r.status, t);
    return "vêret er ukjent akkurat no";
  }
  const j = await r.json();
  let desc = (j.weather?.[0]?.description || "ukjent vêr").toLowerCase();
  desc = desc
    .replace("overskyet", "overskya")
    .replace("delvis skyet", "delvis skya")
    .replace("spredt skydekke", "lettskya")
    .replace("skyet", "skya");
  const t = Math.round(j.main?.temp ?? 0);
  return `${desc}, kring ${t} grader`;
}

// Bygg endeleg tekst
async function buildFullText() {
  const intros = await readIntros();
  if (!intros.length) throw new Error("meldinger.txt er tom.");

  const intro = pick(intros);
  const ver   = await getWeatherString();
  const { dag, klokke } = timeAndDay(TIME_STYLE);

  let base = applyPlaceholders(intro, ver, TIME_STYLE);

  // Legg til dag/klokke/vêr om det manglar
  const lower = base.toLowerCase();
  const haleParts = [];
  if (!lower.includes("klokk") && !lower.includes("{k")) {
    haleParts.push(`Klokka er ${klokke}.`);
  }
  if (!lower.includes("vêr") && !lower.includes("{v")) {
    haleParts.push(`Vêret no er ${ver}.`);
  }
  if (!lower.includes("måndag") && !lower.includes("tysdag") &&
      !lower.includes("onsdag") && !lower.includes("torsdag") &&
      !lower.includes("fredag") && !lower.includes("laurdag") &&
      !lower.includes("sundag") && !lower.includes("{d")) {
    haleParts.push(`Det er ${dag}.`);
  }

  const jul = JULEMODUS || (new Date().getMonth() === 11);
  haleParts.push(
    jul
      ? "Og sidan det nærmar seg jul, gjer me det ekstra lunt og stemningsfullt. 🎄"
      : "Kos deg vidare – me held det lunt og triveleg."
  );

  return [LANGUAGE_PRIMER, base, haleParts.join(" ")].join(" ");
}

// Send tekst -> ElevenLabs -> skriv velkomst.mp3
async function ttsToFile(text, outFile) {
  if (!ELEVEN_API_KEY) throw new
