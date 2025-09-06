// scripts/build_full.js – Éin mp3: intro (~20s) + kort pause + vêr/klokke (nynorsk)

import fs from "fs/promises";
import fetch from "node-fetch";

// Secrets/vars
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
const VOICES = (process.env.ELEVENLABS_VOICE_IDS || "")
  .split(",").map(s => s.trim()).filter(Boolean);
const PRIMER = process.env.LANGUAGE_PRIMER || "Hei! Dette er ei norsk melding på nynorsk.";

const OW_KEY = process.env.OPENWEATHER_API_KEY;
const LAT = process.env.SKILBREI_LAT;
const LON = process.env.SKILBREI_LON;

if (!ELEVEN_KEY || VOICES.length === 0) throw new Error("Manglar ELEVENLABS_API_KEY eller ELEVENLABS_VOICE_IDS");
if (!OW_KEY || !LAT || !LON) throw new Error("Manglar OPENWEATHER_API_KEY / SKILBREI_LAT / SKILBREI_LON");

const ELEVEN_URL = (voiceId) => `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

// Hjelp
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const osloklokke = () => {
  const s = new Intl.DateTimeFormat("nn-NO", { timeZone: "Europe/Oslo", hour: "2-digit", minute: "2-digit" })
    .format(new Date());
  return s.replace(":", " "); // 01:37 -> 01 37
};

async function verNo() {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${OW_KEY}&units=metric&lang=no`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenWeather ${res.status}: ${await res.text()}`);
  const d = await res.json();
  let skildring = d.weather?.[0]?.description || "ukjent vêr";
  // enkel nynorsking
  skildring = skildring
    .replace("overskyet", "overskya")
    .replace("delvis skyet", "delvis skya")
    .replace("spredt skydekke", "lettskya");
  return { temp: Math.round(d.main.temp), skildring };
}

async function hentIntro() {
  const rå = await fs.readFile("meldinger.txt", "utf8");
  const linjer = rå.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith("#"));
  if (!linjer.length) throw new Error("meldinger.txt er tom.");
  return pick(linjer);
}

async function lagFullTekst() {
  const intro = await hentIntro();
  const { temp, skildring } = await verNo();
  const kl = osloklokke();

  // ÉIN tekst til TTS: intro (lang), kort naturlig overgang, så vêr+klokke
  // (bruker “Liten pause.” i teksten for å få bitteliten pust)
  return `${intro} Liten pause. Vêret no: ${skildring}, kring ${temp} grader. Klokka er ${kl}.`;
}

async function ttsElevenLabs(text, outFile) {
  const voice = pick(VOICES);
  const res = await fetch(ELEVEN_URL(voice), {
    method: "POST",
    headers: {
      "xi-api-key": ELEVEN_KEY,
      "Accept": "audio/mpeg",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model_id: "eleven_turbo_v2_5",
      text: `${PRIMER} ${text}`,
      voice_settings: { stability: 0.6, similarity_boost: 0.75, style: 0.4, use_speaker_boost: true }
    })
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(outFile, buf);
}

(async () => {
  const tekst = await lagFullTekst();
  console.log("[DEBUG] Tekst til TTS:\n", tekst);
  await ttsElevenLabs(tekst, "velkomst_full.mp3");
  console.log("✅ Skreiv velkomst_full.mp3");
})();
