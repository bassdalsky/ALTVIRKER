import fs from "fs";
import fetch from "node-fetch";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_IDS = (process.env.ELEVENLABS_VOICE_IDS || "").split(",").map(s => s.trim()).filter(Boolean);

function randomVoice() {
  if (!VOICE_IDS.length) throw new Error("Mangler ELEVENLABS_VOICE_IDS.");
  return VOICE_IDS[Math.floor(Math.random() * VOICE_IDS.length)];
}

function osloTime() {
  return new Date().toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Oslo" });
}

function pickRandomLine(path) {
  const lines = fs.readFileSync(path, "utf-8").split("\n").map(l => l.trim()).filter(Boolean);
  if (!lines.length) throw new Error(`Tom meldingsfil: ${path}`);
  return lines[Math.floor(Math.random() * lines.length)];
}

async function generateMp3(text, outFile) {
  const voice = randomVoice();
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice}`;
  const body = {
    model_id: "eleven_turbo_v2_5",
    text,
    voice_settings: { stability: 0.5, similarity_boost: 0.8 }
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`ElevenLabs-feil (${res.status}): ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outFile, buf);
  console.log(`✅ Skreiv ${outFile} (${(buf.length/1024/1024).toFixed(2)} MB)`);
}

async function main() {
  const base = pickRandomLine("messages/godkveld_jul.txt");
  const timeStr = osloTime();
  const fullText = `${base} Klokka er ${timeStr}. Riktig god jul og god natt 🎄`;

  console.log("🎙️ Genererer godkveld jul:", fullText);
  await generateMp3(fullText, "godkveld.mp3");
}

main().catch(err => {
  console.error("❌ Feil:", err);
  process.exit(1);
});
