import fs from "fs/promises";
import fetch from "node-fetch";

const ELEVEN_API = "https://api.elevenlabs.io/v1/text-to-speech";
const VOICES = (process.env.ELEVENLABS_VOICE_IDS || "").split(",").map(s=>s.trim()).filter(Boolean);
const API_KEY = process.env.ELEVENLABS_API_KEY;
const PRIMER  = process.env.LANGUAGE_PRIMER || "Hei! Dette er ei norsk melding.";

if (!API_KEY || VOICES.length === 0) {
  throw new Error("Mangler ELEVENLABS_API_KEY eller ELEVENLABS_VOICE_IDS");
}

function pickRandom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

async function pickIntroText() {
  const raw = await fs.readFile("meldinger.txt", "utf8");
  const lines = raw.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  // plukk tilfeldig – du kan redigere meldinger.txt fritt
  return pickRandom(lines);
}

async function tts(text, outFile) {
  const voice = pickRandom(VOICES);
  const res = await fetch(`${ELEVEN_API}/${voice}`, {
    method: "POST",
    headers: {
      "xi-api-key": API_KEY,
      "accept": "audio/mpeg",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model_id: "eleven_turbo_v2_5",
      voice_settings: { stability: 0.6, similarity_boost: 0.7, style: 0.4, use_speaker_boost: true },
      text: `${PRIMER} ${text}`
    })
  });
  if (!res.ok) throw new Error(`ElevenLabs intro feila (${res.status}) ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(outFile, buf);
}

(async () => {
  const txt = await pickIntroText();
  await tts(txt, "velkomst_intro.mp3");
  console.log("✅ Intro OK");
})();
