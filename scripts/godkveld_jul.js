// scripts/godkveld_jul.js
// Lager godkveld.mp3 med julehilsingar på nynorsk (ElevenLabs)

import { writeFile } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fetch } from "undici";

const VOICES = (process.env.ELEVENLABS_VOICE_IDS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
const MODEL_ID   = process.env.ELEVEN_MODEL_ID || "eleven_turbo_v2_5";
const PRIMER     = process.env.LANGUAGE_PRIMER || "Snakk NORSK (Nynorsk). IKKJE dansk. Ver naturleg og varm.";

if (!ELEVEN_KEY) {
  console.error("Mangler ELEVENLABS_API_KEY");
  process.exit(1);
}
if (VOICES.length === 0) {
  console.error("Mangler ELEVENLABS_VOICE_IDS (kommaseparert liste med voice-idar).");
  process.exit(1);
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function loadMessages() {
  const file = resolve("messages", "meldinger_godkveld_jul.txt");
  const raw = await readFile(file, "utf8");
  const lines = raw
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && !l.startsWith("#"));
  if (lines.length === 0) {
    throw new Error("Fant ingen linjer i messages/meldinger_godkveld_jul.txt");
  }
  return lines;
}

async function ttsToBuffer({ text, voice }) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice}`;
  const body = {
    model_id: MODEL_ID,
    // primeren først for å tvinge nynorsk-stil, deretter teksten
    text: `${PRIMER}\n\n${text}`,
    voice_settings: {
      stability: 0.55,
      similarity_boost: 0.8
    },
    generation_config: {
      // prøver å hjelpe modellen mot norsk
      language: "no"
    },
    // be om ferdig mp3
    output_format: "mp3_44100_128"
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVEN_KEY,
      "accept": "audio/mpeg",
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`ElevenLabs feil ${res.status}: ${t}`);
  }

  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}

async function main() {
  const messages = await loadMessages();
  const voice = pickRandom(VOICES);
  const msg = pickRandom(messages);

  const finalText =
    `${msg}\n\n` +
    `Slapp heilt av no, slå av lys og skjermar, og gje kroppen ro. ` +
    `Sov godt – me snakkast i morgon. Riktig god jul og god natt.`;

  console.log("🗣️ Brukar voice:", voice);
  console.log("📝 Tekst:", finalText.slice(0, 200), "...");

  const buf = await ttsToBuffer({ text: finalText, voice });
  await writeFile("godkveld.mp3", buf);
  console.log("✅ Skreiv godkveld.mp3");
}

main().catch(err => {
  console.error("❌ Feil:", err);
  process.exit(1);
});
