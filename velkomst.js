import fs from "fs";
import fetch from "node-fetch";

// === Secrets / env ===
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const LAT = process.env.SKILBREI_LAT;
const LON = process.env.SKILBREI_LON;
const ELEVEN_API = process.env.ELEVENLABS_API_KEY;

// Voice config (som før)
const VOICE_MODE = (process.env.VOICE_MODE || "fixed").toLowerCase(); // fixed | random | weekday
const VOICE_ID_DEFAULT = process.env.ELEVENLABS_VOICE_ID || "";
const VOICE_IDS_LIST = (process.env.ELEVENLABS_VOICE_IDS || "")
  .split(",").map(s => s.trim()).filter(Boolean);
const WEEKDAY_VOICES = {
  monday:    process.env.VOICE_ID_MONDAY    || "",
  tuesday:   process.env.VOICE_ID_TUESDAY   || "",
  wednesday: process.env.VOICE_ID_WEDNESDAY || "",
  thursday:  process.env.VOICE_ID_THURSDAY  || "",
  friday:    process.env.VOICE_ID_FRIDAY    || "",
  saturday:  process.env.VOICE_ID_SATURDAY  || "",
  sunday:    process.env.VOICE_ID_SUNDAY    || ""
};

// Primer (valfri)
const LANGUAGE_PRIMER = process.env.LANGUAGE_PRIMER ?? "Hei! Dette er en norsk melding.";

// ——— Normaliser ukedag (støtt bokmål + nynorsk) ———
const DAY_ALIASES = {
  monday:    ["mandag","måndag"],
  tuesday:   ["tirsdag","tysdag"],
  wednesday: ["onsdag"],
  thursday:  ["torsdag"],
  friday:    ["fredag"],
  saturday:  ["lørdag","laurdag"],
  sunday:    ["søndag"]
};

function nowOslo() {
  const d = new Date();
  const weekday_en = d.toLocaleDateString("en-GB", { weekday: "long", timeZone: "Europe/Oslo" }).toLowerCase();
  const time = d.toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Oslo" }).replace(":", " ");
  return { weekday_en, time };
}

// ——— Vær ———
async function getWeather() {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=no`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Feil fra OpenWeather (${res.status}): ${await res.text()}`);
  const data = await res.json();
  const temp = Math.round(data.main?.temp ?? 0);
  const desc = (data.weather?.[0]?.description ?? "").trim();
  return `${temp} grader og ${desc}`;
}

// ——— Meldinger ———
function pickMessageFor(weekday_en) {
  const raw = fs.readFileSync("meldinger.txt", "utf-8");
  const lines = raw.split("\n");
  const aliases = DAY_ALIASES[weekday_en] || [];
  let active = false;
  const msgs = [];

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("[")) {
      // finn [seksjon] og sjekk om den matcher ein av aliasane
      const header = t.slice(1, -1).toLowerCase();
      active = aliases.includes(header);
      continue;
    }
    if (active && t !== "") msgs.push(t);
  }
  return msgs.length ? msgs[Math.floor(Math.random() * msgs.length)] : "Velkomen heim. Lysa blir tende.";
}

// ——— Velg Voice ID ———
function chooseVoiceId(weekday_en) {
  if (VOICE_MODE === "weekday") {
    const id = WEEKDAY_VOICES[weekday_en] || "";
    if (id) return id;
    if (VOICE_ID_DEFAULT) return VOICE_ID_DEFAULT;
    if (VOICE_IDS_LIST.length) return VOICE_IDS_LIST[0];
    throw new Error("Ingen voice-id funnet for weekday-mode.");
  }
  if (VOICE_MODE === "random") {
    const pool = VOICE_IDS_LIST.length ? VOICE_IDS_LIST : (VOICE_ID_DEFAULT ? [VOICE_ID_DEFAULT] : []);
    if (!pool.length) throw new Error("Ingen voice-ids definert for random-mode.");
    return pool[Math.floor(Math.random() * pool.length)];
  }
  if (!VOICE_ID_DEFAULT) throw new Error("VOICE_MODE=fixed, men ELEVENLABS_VOICE_ID mangler.");
  return VOICE_ID_DEFAULT;
}

// ——— TTS (Eleven Turbo 2.5) ———
async function makeMp3(voiceId, text) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "Accept": "audio/mpeg",
      "Content-Type": "application/json",
      "xi-api-key": ELEVEN_API
    },
    body: JSON.stringify({
      model_id: "eleven_turbo_v2_5",
      text,
      voice_settings: { stability: 0.45, similarity_boost: 0.8 }
    })
  });
  if (!res.ok) throw new Error(`Feil fra ElevenLabs (${res.status}): ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync("velkomst.mp3", buf);
  console.log(`✅ Lagret: velkomst.mp3 (voice: ${voiceId}, model: eleven_turbo_v2_5)`);
}

// ——— MAIN ———
(async () => {
  try {
    const { weekday_en, time } = nowOslo();
    const weather = await getWeather();
    const template = pickMessageFor(weekday_en);

    // Erstatt plasshaldarar i teksten
    let message = template
      .replaceAll("{KLOKKA}", time)
      .replaceAll("{VÆR}", weather)
      .replaceAll("{VAER}", weather); // fallback om du skriv {VAER}

    // Legg på primer først for å sikre nynorsk/norsk uttale
    const fullText = `${LANGUAGE_PRIMER} ${message}`;
    console.log("[DEBUG] TTS-tekst:", fullText);

    const voiceId = chooseVoiceId(weekday_en);
    await makeMp3(voiceId, fullText);
  } catch (err) {
    console.error("❌ Feil:", err);
    process.exit(1);
  }
})();
