import fs from "fs";
import fetch from "node-fetch";

const ELEVEN_API = process.env.ELEVENLABS_API_KEY;
const VOICE_ID   = process.env.ELEVENLABS_VOICE_ID;

// Valgfri: overskriv testtekst via GitHub Actions input/secrets om du vil
const TEXT = process.env.TEST_TEXT || "Hei! Velkommen hjem til Skilbrei. Dette er en testmelding på norsk.";

async function makeMp3(text) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: "POST",
    headers: {
      "Accept": "audio/mpeg",
      "Content-Type": "application/json",
      "xi-api-key": ELEVEN_API
    },
    body: JSON.stringify({
      // Bruk turbo v2 for stabil norsk uttale
      model_id: "eleven_turbo_v2",
      text,
      voice_settings: { stability: 0.45, similarity_boost: 0.8 }
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Feil fra ElevenLabs (${res.status}): ${err}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync("velkomst.mp3", buf);
  console.log("✅ Testfil generert: velkomst.mp3");
}

(async () => {
  try {
    await makeMp3(TEXT);
  } catch (e) {
    console.error("❌ Feil:", e);
    process.exit(1);
  }
})();
