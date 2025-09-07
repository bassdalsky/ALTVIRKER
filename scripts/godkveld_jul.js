import fs from "fs";
import fetch from "node-fetch";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_IDS = (process.env.ELEVENLABS_VOICE_IDS || "").split(",");
const LANGUAGE_PRIMER = process.env.LANGUAGE_PRIMER || "";

function randomVoice() {
  return VOICE_IDS[Math.floor(Math.random() * VOICE_IDS.length)];
}

function getRandomMessage() {
  const path = `messages/meldinger_godkveld_jul.txt`;
  const lines = fs.readFileSync(path, "utf-8").split("\n").filter(l => l.trim());
  return lines[Math.floor(Math.random() * lines.length)];
}

async function makeMp3(text) {
  const voice = randomVoice();
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: LANGUAGE_PRIMER + " " + text,
      model_id: "eleven_turbo_v2_5",
      voice_settings: { stability: 0.5, similarity_boost: 0.8 }
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs-feil (${res.status})`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync("godkveld.mp3", buffer);
  console.log("✅ godkveld (jul) generert!");
}

async function main() {
  const melding = getRandomMessage();
  await makeMp3(`${melding} Riktig god jul! 🎄`);
}

main().catch(err => {
  console.error("❌ Feil:", err);
  process.exit(1);
});
