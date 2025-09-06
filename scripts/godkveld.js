import fs from "fs";
import fetch from "node-fetch";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_IDS = process.env.ELEVENLABS_VOICE_IDS.split(",");
const LANGUAGE_PRIMER = process.env.LANGUAGE_PRIMER || "Snakk nynorsk, ikkje dansk.";

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getMessage() {
  const d = new Date();
  const julemodus = process.env.JULEMODUS === "on" ||
    (d.getMonth() === 11 || d.getMonth() === 0);
  const file = julemodus ? "messages/meldinger_godkveld_jul.txt" : "messages/meldinger_godkveld.txt";
  const lines = fs.readFileSync(file, "utf8").split("\n").filter(l => l.trim());
  return pickRandom(lines);
}

async function makeMp3(text, outFile) {
  const voice = pickRandom(VOICE_IDS);
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_turbo_v2_5",
      voice_settings: { stability: 0.7, similarity_boost: 0.8 },
      language: "no",
      prefill_text: LANGUAGE_PRIMER
    }),
  });

  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outFile, buf);
}

(async () => {
  const msg = getMessage();
  await makeMp3(msg, "godkveld.mp3");
})();
