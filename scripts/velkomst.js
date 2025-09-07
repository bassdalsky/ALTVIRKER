import fetch from "node-fetch";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function nowOslo() {
  return new Date(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Oslo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date())
  );
}

function weekdayOsloLower() {
  return new Intl.DateTimeFormat("nn-NO", {
    weekday: "long",
    timeZone: "Europe/Oslo",
  })
    .format(new Date())
    .toLowerCase();
}

function getTimeAndDate() {
  const now = nowOslo();
  const time = now.toLocaleTimeString("nn-NO", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const date = now.toLocaleDateString("nn-NO", {
    day: "2-digit",
    month: "long",
  });
  const weekday = weekdayOsloLower();
  return { time, date, weekday };
}

async function generateMp3(text) {
  const voices = process.env.ELEVENLABS_VOICE_IDS.split(",");
  const voiceId = pickRandom(voices);

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  const body = {
    model_id: "eleven_turbo_v2_5",
    text: text,
    voice_settings: { stability: 0.5, similarity_boost: 0.8 },
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
  const meldinger = fs
    .readFileSync("messages/meldinger.txt", "utf-8")
    .split("\n")
    .filter((l) => l.trim() !== "");

  const melding = pickRandom(meldinger);
  const { time, date, weekday } = getTimeAndDate();

  const fulltext = `${melding} Det er ${weekday} ${date}, klokka er ${time}.`;
  console.log("🎙️ Genererer velkomst:", fulltext);

  await generateMp3(fulltext);
}

main().catch((err) => {
  console.error("❌ Feil i velkomst:", err);
  process.exit(1);
});
