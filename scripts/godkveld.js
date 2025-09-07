// scripts/godkveld.js
// Norsk, Oslo-tid, julemodus-kontroll. Primer IKKE med i selve TTS-teksten.

import fs from "fs";
import fetch from "node-fetch";

// ---- config / helpers -------------------------------------------------------
function boolFromEnv(v) {
  if (!v) return false;
  const s = String(v).trim().toLowerCase();
  return s === "1" || s === "true" || s === "on" || s === "yes" || s === "ja";
}

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
if (!ELEVENLABS_API_KEY) throw new Error("Mangler ELEVENLABS_API_KEY");

const VOICE_POOL = (process.env.ELEVENLABS_VOICE_IDS || "")
  .split(",").map(s => s.trim()).filter(Boolean);
if (VOICE_POOL.length === 0) throw new Error("Mangler ELEVENLABS_VOICE_IDS");

const JULEMODUS = boolFromEnv(process.env.JULEMODUS);
// Vi beholder primeren som en intern variabel, men vi sender den IKKE i TTS-teksten.
const LANGUAGE_PRIMER =
  (process.env.LANGUAGE_PRIMER && process.env.LANGUAGE_PRIMER.trim()) ||
  "Dette er ein norsk nynorsk-stemme. Ver naturleg og varm."; // BRUKES IKKE I TEXT

// ---- klokke / tekst ---------------------------------------------------------
function getOsloDate() {
  return new Date(new Date().toLocaleString("en-GB", { timeZone: "Europe/Oslo" }));
}
function getTimeAndDate() {
  const now = getOsloDate();
  const pretty = now.toLocaleString("nb-NO", {
    timeZone: "Europe/Oslo",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  const [weekday, time] = pretty.split(" ");
  const date = now.toLocaleDateString("nb-NO", { timeZone: "Europe/Oslo" });
  return { weekday, time, date };
}

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function loadLines(file) {
  const t = fs.readFileSync(file, "utf-8");
  return t.split("\n").map(l => l.trim()).filter(Boolean);
}

// ---- meldingskjelder --------------------------------------------------------
function getMessageFile() {
  return JULEMODUS ? "messages/meldinger_godkveld_jul.txt"
                   : "messages/meldinger_godkveld.txt";
}

// ---- ElevenLabs -------------------------------------------------------------
function pickVoice() { return pickRandom(VOICE_POOL); }

async function ttsToFile(text, outFile) {
  const voiceId = pickVoice();
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  const body = {
    model_id: "eleven_turbo_v2_5",
    // Viktig: IKKE legg primer inn i text → den blir ikke lest opp
    text,
    voice_settings: { stability: 0.5, similarity_boost: 0.8 },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Feil frå ElevenLabs: ${await res.text()}`);

  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outFile, buf);
}

// ---- main -------------------------------------------------------------------
async function main() {
  const { time } = getTimeAndDate();
  const file = getMessageFile();
  const lines = loadLines(file);
  const melding = pickRandom(lines);

  // Meldinga di er lang (~20–25 s). Klokka til slutt.
  const fullText = `${melding} Klokka er ${time}.`;

  console.log("[DEBUG] Godkveld-fil:", file);
  console.log("[DEBUG] Generert godkveld-tekst:", fullText);

  await ttsToFile(fullText, "godkveld.mp3");
  console.log("✅ Skreiv godkveld.mp3");
}
main().catch(err => { console.error("❌ Feil:", err); process.exit(1); });
