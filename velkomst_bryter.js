// Lager en ny velkomst.mp3 NÅ fra meldinger.txt + vær + klokke
// Forventer secrets: ELEVENLABS_API_KEY, ELEVENLABS_VOICE_IDS, LANGUAGE_PRIMER,
//                    OPENWEATHER_API_KEY, SKILBREI_LAT, SKILBREI_LON
import fetch from "node-fetch";
import fs from "fs";

const ELEVEN_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_IDS = (process.env.ELEVENLABS_VOICE_IDS || "")
  .split(",").map(s => s.trim()).filter(Boolean);
const LANGUAGE_PRIMER = process.env.LANGUAGE_PRIMER || "Hei! Dette er en norsk melding.";

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const LAT = process.env.SKILBREI_LAT;
const LON = process.env.SKILBREI_LON;

// ---- utils
function pick(a){ return a[Math.floor(Math.random()*a.length)] }

function nowOslo() {
  const tz = "Europe/Oslo";
  const d = new Date();
  return {
    weekday: d.toLocaleDateString("no-NO", { weekday: "long", timeZone: tz }).toLowerCase(),
    kl: d.toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit", timeZone: tz }).replace(":", " ")
  };
}

async function getWeather() {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=no`;
  console.log("[DEBUG] Henter vær:", url.replace(OPENWEATHER_API_KEY, "***"));
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Feil fra OpenWeather (${r.status}): ${await r.text()}`);
  const j = await r.json();
  const t = Math.round(j.main?.temp ?? 0);
  const d = (j.weather?.[0]?.description ?? "").trim();
  return `${t} grader og ${d}`;
}

// parser [seksjon]-blokker i meldinger.txt
function parseBlocks(txt) {
  const map = {};
  let cur = null;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^\[(.+?)\]$/);
    if (m) { cur = m[1].toLowerCase(); map[cur] = map[cur] || []; continue; }
    if (!cur) continue;
    map[cur].push(line);
  }
  return map;
}

async function tts(voiceId, text, outPath) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "Accept": "audio/mpeg",
      "Content-Type": "application/json",
      "xi-api-key": ELEVEN_API_KEY
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

(async () => {
  try {
    if (!ELEVEN_API_KEY) throw new Error("Mangler ELEVENLABS_API_KEY");
    if (!VOICE_IDS.length) throw new Error("Mangler ELEVENLABS_VOICE_IDS");
    if (!OPENWEATHER_API_KEY || !LAT || !LON) throw new Error("Mangler vær-secrets");

    if (!fs.existsSync("meldinger.txt")) {
      throw new Error("Fant ikke meldinger.txt i repo-roten.");
    }
    const txt = fs.readFileSync("meldinger.txt", "utf8");
    const blocks = parseBlocks(txt);

    const { weekday, kl } = nowOslo();
    const vaer = await getWeather();

    const pool = blocks[weekday] || blocks["mandag"] || [];
    if (!pool.length) throw new Error(`Fant ingen meldinger for ${weekday} i meldinger.txt`);

    const raw = pick(pool);
    const msg = raw.replace("{KLOKKA}", kl).replace("{VÆR}", vaer);

    const voice = pick(VOICE_IDS);
    console.log("[DEBUG] Ukedag:", weekday, "| Valgt stemme:", voice);
    console.log("[DEBUG] Sender til ElevenLabs:", msg);

    await tts(voice, msg, "velkomst.mp3");
    console.log("✅ velkomst.mp3 generert");
  } catch (e) {
    console.error("❌ Feil:", e);
    process.exit(1);
  }
})();
