import fs from "fs";
import fetch from "node-fetch";

const ELEVEN_API = process.env.ELEVENLABS_API_KEY;

const VOICE_MODE = (process.env.VOICE_MODE || "fixed").toLowerCase(); // fixed | random
const VOICE_ID_DEFAULT = process.env.ELEVENLABS_VOICE_ID || "";
const VOICE_IDS_LIST = (process.env.ELEVENLABS_VOICE_IDS || "")
  .split(",").map(s => s.trim()).filter(Boolean);

const TEST_TEXT = process.env.TEST_TEXT || "Hei! Dette er en norsk testmelding. Velkommen hjem til Skilbrei.";
const LANGUAGE_PRIMER = process.env.LANGUAGE_PRIMER ?? "Hei! Dette er en norsk melding.";

function chooseVoiceId() {
  if (VOICE_MODE === "random") {
    const pool = VOICE_IDS_LIST.length ? VOICE_IDS_LIST : (VOICE_ID_DEFAULT ? [VOICE_ID_DEFAULT] : []);
    if (!pool.length) throw new Error("Ingen voice-ids definert for random test.");
    return pool[Math.floor(Math.random() * pool.length)];
  }
  if (!VOICE_ID_DEFAULT) throw new Error("VOICE_MODE=fixed, men ELEVENLABS_VOICE_ID mangler.");
  return VOICE_ID_DEFAULT;
}

async function tts(voiceId, text) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "Accept": "audio/mpeg",
      "Content-Type": "application/json",
      "xi-api-key": ELEVEN_API
    },
    body: JSON.stringify({
      model_id: "eleven_turbo_v2_5",                // <- Turbo 2.5 for test også
      text: `${LANGUAGE_PRIMER} ${text}`,
      voice_settings: { stability: 0.45, similarity_boost: 0.8 }
    })
  });

  if (!res.ok) throw new Error(`Feil fra ElevenLabs (${res.status}): ${await res.text()}`);

  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync("velkomst.mp3", buf);
  console.log(`✅ Testfil generert (voice: ${voiceId}, model: eleven_turbo_v2_5)`);
}

(async () => {
  try {
    const voiceId = chooseVoiceId();
    await tts(voiceId, TEST_TEXT);
  } catch (e) {
    console.error("❌ Feil:", e);
    process.exit(1);
  }
})();
