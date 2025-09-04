import fs from "fs";
import fetch from "node-fetch";

// Secrets
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const LAT = process.env.SKILBREI_LAT;
const LON = process.env.SKILBREI_LON;
const ELEVEN_API = process.env.ELEVENLABS_API_KEY;

// Stemme (bruker Olaf hvis du har satt ELEVENLABS_VOICE_ID = xF681s0UeE04gsf0mVsJ)
const VOICE_ID_DEFAULT = process.env.ELEVENLABS_VOICE_ID || "";
const LANGUAGE_PRIMER = process.env.LANGUAGE_PRIMER ?? "Hei! Dette er en norsk melding.";

function nowOslo() {
  const d = new Date();
  const time = d
    .toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Oslo" })
    .replace(":", " "); // mer naturlig norsk uttale
  return time;
}

async function getWeather() {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=no`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Feil fra OpenWeather (${res.status}): ${await res.text()}`);
  const data = await res.json();
  const temp = Math.round(data.main?.temp ?? 0);
  const desc = (data.weather?.[0]?.description ?? "").trim();
  return `${temp} grader og ${desc}`;
}

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
  console.log("✅ Test (live) generert: velkomst.mp3");
}

(async () => {
  try {
    if (!VOICE_ID_DEFAULT) throw new Error("Mangler ELEVENLABS_VOICE_ID (sett Olaf/Mia/Emma).");
    const klokka = nowOslo();
    const vaer = await getWeather();

    const text =
      `${LANGUAGE_PRIMER} Velkommen hjem til Skilbrei. ` +
      `Lysa blir slått på for deg. ` +
      `Klokka er ${klokka}, og ute er det ${vaer}. ` +
      `I dag fortjener du å slappe av med en god kopp kaffe.`;

    console.log("[DEBUG]", text);
    await makeMp3(VOICE_ID_DEFAULT, text);
  } catch (e) {
    console.error("❌ Feil:", e);
    process.exit(1);
  }
})();
