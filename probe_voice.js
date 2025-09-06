// probe_voice.js – lager korte prøver for hver voice-ID i ELEVENLABS_VOICE_IDS
// Publiseres som public/voice-<id>.mp3 via Pages, så du kan lytte og velge norsk stemme.

import fs from "fs";
import path from "path";

const ELEVEN_API  = process.env.ELEVENLABS_API_KEY || "";
const VOICES_RAW  = (process.env.ELEVENLABS_VOICE_IDS || "").trim(); // kommaseparert liste
const MODEL_ID    = "eleven_turbo_v2_5";

if (!ELEVEN_API) throw new Error("Mangler ELEVENLABS_API_KEY");
if (!VOICES_RAW) throw new Error("Mangler ELEVENLABS_VOICE_IDS");

const voices = VOICES_RAW.split(",").map(s => s.trim()).filter(Boolean);
if (!voices.length) throw new Error("Fant ingen voice-id i ELEVENLABS_VOICE_IDS");

const TEST_TEXT =
  "Hei! Dette er en kort test på norsk bokmål, ikke dansk. " +
  "Si: jeg, ikke, også, klokka, kjøleskap, skje, sjø, øy, æ, ø, å. " +
  "Klokka er 19:49, og været er overskyet.";

async function ttsToFile(voiceId, text, outPath) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?optimize_streaming_latency=4&output_format=mp3_44100_128`;
  const body = {
    model_id: MODEL_ID,
    text,
    voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": ELEVEN_API, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const t = await res.text().catch(()=> "");
    throw new Error(`ElevenLabs ${voiceId}: ${res.status} ${t}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buf);
}

async function main() {
  const outDir = path.join(process.cwd(), "public");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (const id of voices) {
    const out = path.join(outDir, `voice-${id}.mp3`);
    console.log("▶️  Genererer prøve for", id);
    try {
      await ttsToFile(id, TEST_TEXT, out);
      console.log("✅ Lagret:", `public/voice-${id}.mp3`);
    } catch (e) {
      console.error("❌ Feil for", id, "-", e.message);
    }
  }
  console.log("Ferdig. Sjekk GitHub Pages for filene.");
}

main().catch(err => { console.error(err); process.exit(1); });
