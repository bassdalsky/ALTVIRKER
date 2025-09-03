// velkomst.js – PERFEKT versjon (GitHub Actions-first)
// Node 20 (CommonJS) – ingen PowerShell nødvendig.
// Støtter {KLOKKA} og {VÆR}/{VAER}, pen klokke for TTS, OpenWeather, ElevenLabs (modell via secret), fallback til v2.

const fs = require("fs");

const WEATHER_KEY = process.env.OPENWEATHER_API_KEY;
const LAT = process.env.SKILBREI_LAT;
const LON = process.env.SKILBREI_LON;
const ELEVEN_API = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID;
const ELEVEN_MODEL_PREF = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v3";

const LOCATION_NAME = process.env.LOCATION_NAME || "";
const DUMMY_WEATHER = process.env.DUMMY_WEATHER || "";
const READABLE_TIME_STYLE = process.env.READABLE_TIME_STYLE || "colon"; // colon | space | og

(function sanity() {
  const needed = ["OPENWEATHER_API_KEY","SKILBREI_LAT","SKILBREI_LON","ELEVENLABS_API_KEY","ELEVENLABS_VOICE_ID"];
  const missing = needed.filter(k => !process.env[k]);
  if (missing.length) {
    console.error("❌ Mangler secrets:", missing.join(", "));
    process.exit(1);
  }
})();

function getNow() {
  const d = new Date();
  const weekday = d.toLocaleDateString("no-NO", { weekday: "long", timeZone: "Europe/Oslo" }).toLowerCase();
  const time = d.toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Oslo" });
  const map = { "måndag":"mandag", "tysdag":"tirsdag", "lørdag":"laurdag" };
  const normWeekday = map[weekday] || weekday;
  return { weekday: normWeekday, time };
}

function formatTimeForTTS(hhmm, style = READABLE_TIME_STYLE) {
  const [HH, MM] = hhmm.split(":");
  if (style === "space") return `${Number(HH)} ${Number(MM)}`;
  if (style === "og")    return `${Number(HH)} og ${Number(MM)}`;
  return hhmm; // colon
}

async function getWeatherText() {
  if (DUMMY_WEATHER) return DUMMY_WEATHER;
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${WEATHER_KEY}&units=metric&lang=no`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Feil fra OpenWeather: " + (await res.text()));
  const data = await res.json();
  const temp = Math.round(data.main?.temp);
  const desc = (data.weather && data.weather[0] && data.weather[0].description) ? data.weather[0].description : "ukjent vær";
  return `I dag er det ${temp} grader og ${desc}${LOCATION_NAME ? ` i ${LOCATION_NAME}` : ""}.`;
}

function pickMessageForDay(weekday) {
  const text = fs.readFileSync("meldinger.txt", "utf-8");
  const lines = text.split(/\r?\n/);

  const aliases = {
    "mandag": ["mandag","måndag"],
    "tirsdag": ["tirsdag","tysdag"],
    "onsdag": ["onsdag"],
    "torsdag": ["torsdag"],
    "fredag": ["fredag"],
    "laurdag": ["laurdag","lørdag"],
    "søndag": ["søndag"]
  };
  const wanted = Object.entries(aliases).find(([k, arr]) => arr.includes(weekday))?.[0] || weekday;

  let active = false; const msgs = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("#")) { active = line.toLowerCase().includes(wanted); continue; }
    if (active && line.length > 0) msgs.push(line);
  }
  if (msgs.length === 0) return "Velkommen heim! Lysa er tent.";
  return msgs[Math.floor(Math.random() * msgs.length)];
}

function applyPlaceholders(text, time, weatherText) {
  let out = text;
  const hasClock = /\{KLOKKA\}/.test(out);
  const hasWeather = /\{VÆR\}|\{VAER\}/.test(out);

  out = out.replace(/\{KLOKKA\}/g, formatTimeForTTS(time));
  out = out.replace(/\{VÆR\}|\{VAER\}/g, weatherText);

  if (!hasClock || !hasWeather) {
    const tails = [];
    if (!hasClock) tails.push(`Klokka er ${formatTimeForTTS(time)}.`);
    if (!hasWeather) tails.push(weatherText);
    if (tails.length) out = `${out} ${tails.join(" ")}`;
  }
  return out;
}

async function callEleven(text, modelId) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: "POST",
    headers: { "xi-api-key": ELEVEN_API, "Content-Type": "application/json", "Accept": "audio/mpeg" },
    body: JSON.stringify({ model_id: modelId, text, voice_settings: { stability: 0.5, similarity_boost: 0.8 } })
  });
  if (!res.ok) { throw new Error(await res.text()); }
  return Buffer.from(await res.arrayBuffer());
}

async function makeMp3(text, outfile) {
  const preferred = ELEVEN_MODEL_PREF;
  try {
    const buf = await callEleven(text, preferred);
    fs.writeFileSync(outfile, buf);
  } catch (e) {
    const msg = String(e);
    if (msg.includes("model") && preferred !== "eleven_multilingual_v2") {
      console.warn("⚠️  Modell", preferred, "finnes ikkje. Prøver eleven_multilingual_v2 …");
      const buf2 = await callEleven(text, "eleven_multilingual_v2");
      fs.writeFileSync(outfile, buf2);
    } else {
      throw e;
    }
  }
  console.log(`✅ Generert ${outfile}`);
}

(async () => {
  try {
    const argText = process.argv.slice(2).join(" ").trim();
    const testMessage = process.env.TEST_MESSAGE && process.env.TEST_MESSAGE.trim();
    const { weekday, time } = getNow();
    const weatherText = await getWeatherText();

    if (testMessage || argText) {
      const raw = testMessage || argText;
      const finalText = applyPlaceholders(raw, time, weatherText);
      console.log("[TEST] Tekst til tale:", finalText);
      await makeMp3(finalText, "test.mp3");
      return;
    }

    const baseMessage = pickMessageForDay(weekday);
    const fullText = applyPlaceholders(baseMessage, time, weatherText);
    console.log("[PROD] Tekst til tale:", fullText);
    await makeMp3(fullText, "velkomst.mp3");
  } catch (err) {
    console.error("❌ Feil:", err);
    process.exit(1);
  }
})();
