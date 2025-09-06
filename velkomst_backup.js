// velkomst_backup.js — supertrygg norsk fallback uten vær.
// Brukes hvis hoved-jobben feiler eller du vil tvangs-kjøre noe som alltid funker.

import fs from "fs";

const ELEVEN_API_KEY = (process.env.ELEVENLABS_API_KEY || "").trim();
const VOICE_ID       = (process.env.ELEVENLABS_VOICE_ID || "").trim(); // den norske ID-en du valgte
const MODEL_ID       = "eleven_turbo_v2_5";

const TZ = "Europe/Oslo";
const OUT = "velkomst.mp3";

function nowOslo_nb() {
  const d = new Date();
  const weekday = new Intl.DateTimeFormat("nb-NO", { timeZone: TZ, weekday: "long" }).format(d);
  const day     = new Intl.DateTimeFormat("nb-NO", { timeZone: TZ, day: "2-digit" }).format(d);
  const month   = new Intl.DateTimeFormat("nb-NO", { timeZone: TZ, month: "long" }).format(d);
  const year    = new Intl.DateTimeFormat("nb-NO", { timeZone: TZ, year: "numeric" }).format(d);
  const time    = new Intl.DateTimeFormat("nb-NO", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  return { weekday, day, month, year, time };
}

async function tts(text) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream?optimize_streaming_latency=0&output_format=mp3_44100_128`;
  const body = {
    model_id: MODEL_ID,
    text,
    voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.2, use_speaker_boost: true }
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": ELEVEN_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`ElevenLabs: ${res.status} ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(OUT, buf);
}

async function main() {
  if (!ELEVEN_API_KEY || !VOICE_ID) throw new Error("Mangler ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID");
  const { weekday, day, month, year, time } = nowOslo_nb();

  const primer = "Dette skal leses på norsk bokmål, ikke dansk.";
  const fallback =
    `Hjertelig velkommen! Jeg slår på lysene og gjør det hyggelig. ` +
    `I dag er det ${weekday} ${day}. ${month} ${year}. Klokka er nå ${time}. ` +
    `Len deg tilbake og finn roen – godt å ha deg hjemme.`;

  await tts(`${primer} ${fallback}`);
  console.log("✅ Lagret fallback:", OUT);
}

main().catch(e => { console.error("❌ Feil (backup):", e); process.exit(1); });
