// Genererer godkveld.mp3 direkte frå meldinger_godkveld.txt
// Krever: npm install node-fetch@3 (gjøres i workflow)
import fetch from "node-fetch";
import fs from "fs";

const ELEVEN_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_IDS = (process.env.ELEVENLABS_VOICE_IDS || "")
  .split(",").map(s => s.trim()).filter(Boolean);
const LANGUAGE_PRIMER = process.env.LANGUAGE_PRIMER || "Hei! Dette er en norsk melding.";

function pick(a){ return a[Math.floor(Math.random()*a.length)] }

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
    if (!fs.existsSync("meldinger_godkveld.txt")) {
      throw new Error("Fant ikke meldinger_godkveld.txt i repo-roten.");
    }

    const lines = fs.readFileSync("meldinger_godkveld.txt", "utf8")
      .split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (!lines.length) throw new Error("meldinger_godkveld.txt er tom.");

    const msg = pick(lines);           // random melding
    const voice = pick(VOICE_IDS);     // random stemme (Olaf/Mia/Emma)
    await tts(voice, msg, "godkveld.mp3");

    console.log("✅ godkveld.mp3 generert:", msg);
  } catch (e) {
    console.error("❌ Feil:", e);
    process.exit(1);
  }
})();
