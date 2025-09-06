// velkomst_full.js – ÉI ferdig MP3: intro -> vêr & klokke (sømlaus, nynorsk, Oslo-tid)

// Node 20 har global fetch.
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

// Oslo-tid
function nowOslo() {
  // Konverter frå UTC-runtime til Oslo-tid
  return new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
}

function timeAndDay(style = "space") {
  const now = nowOslo();

  // Ukedag på nynorsk
  const dag = new Intl.DateTimeFormat("nn-NO", {
    weekday: "long",
    timeZone: TZ,
  }).format(now);

  // Klokkeslett 24t
  let klokke = new Intl.DateTimeFormat("nn-NO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  }).format(now);

  if (style === "space") klokke = klokke.replace(":", " ");     // "06 28"
  else if (style === "og") klokke = klokke.replace(":", " og "); // "06 og 28"
  // "colon" = behold "06:28"

  return { dag, klokke };
}

// Sett inn {DAG}, {KLOKKA}, {VÆR} om dei finst i teksten
function applyPlaceholders(rawText, weatherString, style = "space") {
  const { dag, klokke } = timeAndDay(style);
  return rawText
    .replaceAll("{DAG}", dag)
    .replaceAll("{KLOKKA}", klokke)
    .replaceAll("{VÆR}", weatherString);
}

// Les introar frå meldinger.txt (ein per linje)
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
  // enkel nynorsking av vanlege uttrykk
  desc = desc
    .replace("overskyet", "overskya")
    .replace("delvis skyet", "delvis skya")
    .replace("spredt skydekke", "lettskya")
    .replace("skyet", "skya");
  const t = Math.round(j.main?.temp ?? 0);
  return `${desc}, kring ${t} grader`;
}

// Bygg endeleg tekst (intro -> ev. innsetting -> vêr/klokke hale)
async function buildFullText() {
  const intros = await readIntros();
  if (!intros.length) throw new Error("meldinger.txt er tom.");

  const intro = pick(intros);                 // 1) tilfeldig intro
  const ver   = await getWeatherString();     // 2) ferskt vêr
  const { dag, klokke } = timeAndDay(TIME_STYLE);

  // Om introen allereie har plasshaldarar, fyll dei inn.
  let base = applyPlaceholders(intro, ver, TIME_STYLE);

  // Viss introen ikkje nemner vêr/klokke i det heile, legg ei naturleg hale på slutten.
  const lower = base.toLowerCase();
  const manglarVer   = !lower.includes("vêr") && !lower.includes("{v");
  const manglarKlokke = !lower.includes("klokk") && !lower.includes("{k");
  const manglarDag    = !lower.includes("måndag") && !lower.includes("tysdag")
    && !lower.includes("onsdag") && !lower.includes("torsdag")
    && !lower.includes("fredag") && !lower.includes("laurdag")
    && !lower.includes("sundag") && !lower.includes("{d");

  const haleParts = [];
  if (manglarDag || manglarKlokke || manglarVer) {
    const biter = [];
    if (manglarDag)    biter.push(`Det er ${dag}.`);
    if (manglarKlokke) biter.push(`Klokka er ${klokke}.`);
    if (manglarVer)    biter.push(`Vêret no er ${ver}.`);
    if (biter.length) haleParts.push(biter.join(" "));
  }

  // Liten hyggeleg hale (jul om JULEMODUS=on eller i desember)
  const jul = JULEMODUS || (nowOslo().getMonth() === 11);
  haleParts.push(
    jul
      ? "Og sidan det nærmar seg jul, gjer me det ekstra lunt og stemningsfullt. 🎄"
      : "Kos deg vidare – me held det lunt og triveleg."
  );

  return [LANGUAGE_PRIMER, base, haleParts.join(" ")].join(" ");
}

// Send tekst -> ElevenLabs (Turbo 2.5) -> skriv velkomst.mp3
async function ttsToFile(text, outFile) {
  if (!ELEVEN_API_KEY) throw new Error("Mangler ELEVENLABS_API_KEY");
  if (!VOICE_IDS.length) throw new Error("Mangler ELEVENLABS_VOICE_IDS");
  const voiceId = pick(VOICE_IDS);

  // Stream-endepunkt gir rask respons
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;

  const body = {
    model_id: "eleven_turbo_v2_5",
    text,
    voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true }
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
    const msg = await res.text().catch(() => "");
    throw new Error(`ElevenLabs feil ${res.status}: ${msg}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(outFile, buf);
  console.log(`✅ Skreiv ${outFile} (${buf.length} byte) – stemme: ${voiceId}`);
}

async function main() {
  const fullText = await buildFullText();
  console.log("[DEBUG] Tekst til TTS:\n", fullText);
  await ttsToFile(fullText, "velkomst.mp3");
}

main().catch(err => {
  console.error("❌ Feil i velkomst_full:", err);
  process.exit(1);
});
