import fs from "fs";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

// --- Oslo-time helpers ---
function nowOslo() {
  return new Date(new Date().toLocaleString("en-CA", { timeZone: "Europe/Oslo" }));
}

function weekdayOsloLower() {
  return new Intl.DateTimeFormat("nn-NO", { weekday: "long", timeZone: "Europe/Oslo" })
    .format(nowOslo())
    .toLowerCase();
}

function pickMeldingFile() {
  const w = weekdayOsloLower();
  const map = {
    mandag: "messages/meldinger_mandag.txt",
    tysdag: "messages/meldinger_tysdag.txt",
    tirsdag: "messages/meldinger_tysdag.txt",
    onsdag: "messages/meldinger_onsdag.txt",
    torsdag: "messages/meldinger_torsdag.txt",
    fredag: "messages/meldinger_fredag.txt",
    laurdag: "messages/meldinger_laurdag.txt",
    lørdag: "messages/meldinger_laurdag.txt",
    søndag: "messages/meldinger_sondag.txt",
    sundag: "messages/meldinger_sondag.txt",
  };
  return map[w] ?? "messages/meldinger_vanleg.txt";
}

function pickRandomVoice() {
  const voices = process.env.ELEVENLABS_VOICE_IDS.split(",");
  return voices[Math.floor(Math.random() * voices.length)];
}

async function generateMp3(text) {
  const voiceId = pickRandomVoice();
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  const body = {
    model_id: "eleven_multilingual_v2",
    voice_settings: { stability: 0.5, similarity_boost: 0.8 },
    text,
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Feil frå ElevenLabs: " + (await res.text()));
  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync("velkomst.mp3", Buffer.from(arrayBuffer));
}

async function main() {
  const meldingsFil = pickMeldingFile();
  const meldinger = fs.readFileSync(meldingsFil, "utf-8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const melding = meldinger[Math.floor(Math.random() * meldinger.length)];
  console.log("[DEBUG] Brukt fil:", meldingsFil, " | melding:", melding);

  await generateMp3(melding);
}

main().catch((err) => {
  console.error("Feil:", err);
  process.exit(1);
});
