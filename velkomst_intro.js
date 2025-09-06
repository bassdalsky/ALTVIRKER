// velkomst_intro.js – Nynorsk intro (UTAN vêr/klokke) -> velkomst_intro.mp3
import fs from "fs/promises";

const ELEVEN_API = "https://api.elevenlabs.io/v1/text-to-speech";
const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_IDS = (process.env.ELEVENLABS_VOICE_IDS || "").split(",").map(s => s.trim()).filter(Boolean);
const PRIMER = process.env.LANGUAGE_PRIMER || "Hei! Dette er ei norsk melding på nynorsk.";

function pickVoice() {
  if (!VOICE_IDS.length) throw new Error("Mangler ELEVENLABS_VOICE_IDS.");
  return VOICE_IDS[Math.floor(Math.random() * VOICE_IDS.length)];
}

async function ttsToFile(text, outFile) {
  const voice = pickVoice();
  const res = await fetch(`${ELEVEN_API}/${voice}`, {
    method: "POST",
    headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      model_id: "eleven_turbo_v2_5",
      text,
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      prompt: PRIMER
    })
  });
  if (!res.ok) throw new Error(`Feil frå ElevenLabs (intro): ${res.status} ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(outFile, buf);
  console.log(`✅ Skreiv ${outFile}`);
}

async function main() {
  const raw = await fs.readFile("meldinger.txt", "utf8");
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith("#"));
  if (!lines.length) throw new Error("meldinger.txt er tom.");
  const pick = lines[Math.floor(Math.random() * lines.length)];
  // NB: I introen skal det ikkje stå {VÆR} eller {KLOKKA}.
  await ttsToFile(pick, "velkomst_intro.mp3");
}
main().catch(e => { console.error("❌ Feil i velkomst_intro:", e); process.exit(1); });
