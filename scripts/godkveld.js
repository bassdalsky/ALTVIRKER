// godkveld.js — Nynorsk, med julemodus og ElevenLabs Turbo 2.5
// Lagar godkveld.mp3 frå meldinger_godkveld*.txt og publiserer via Pages-workflowen.

import fs from "node:fs/promises";
import path from "node:path";

// ---- Konfig / secrets (må vere satt i GitHub Secrets) ----
const ELEVENLABS_API_KEY   = (process.env.ELEVENLABS_API_KEY || "").trim();
const ELEVENLABS_VOICE_IDS = (process.env.ELEVENLABS_VOICE_IDS || "").trim(); // komma-separert liste
const LANGUAGE_PRIMER      = (process.env.LANGUAGE_PRIMER || "Snakk NORSK (Nynorsk). IKKJE dansk. Bruk norske ord og uttalar. Ver naturleg og varm.").trim();
const JULEMODUS_SECRET     = /^(on|true|1|yes)$/i.test(process.env.JULEMODUS || "");

// ---- Stiar / konstantar ----
const MSG_DIR  = "messages";
const OUT_FILE = "godkveld.mp3";
const MODEL_ID = "eleven_turbo_v2_5";

// ---- Hjelp ----
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function isJulPerDato(now = new Date()) {
  // Jul frå 18. november → 10. januar (inklusive), eller manuelt via secret
  if (JULEMODUS_SECRET) return true;
  const y = now.getFullYear();
  const start = new Date(Date.UTC(y, 10, 18, 0, 0, 0));     // 18. nov (månad 10)
  const end   = new Date(Date.UTC(y + 1, 0, 10, 23, 59, 59)); // 10. jan neste år
  // NB: now i lokal tid, men periode er romslig – dette held i praksis
  return (now >= start || now <= end);
}

async function readLines(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return raw
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(s => s && !s.startsWith("#"));
}

function pickVoiceId() {
  const list = ELEVENLABS_VOICE_IDS.split(",").map(s => s.trim()).filter(Boolean);
  if (!list.length) throw new Error("ELEVENLABS_VOICE_IDS er tom – legg inn minst éin voice-id i Secrets.");
  return pickRandom(list);
}

async function ttsElevenLabs({ text, voiceId }) {
  if (!ELEVENLABS_API_KEY) throw new Error("Mangler ELEVENLABS_API_KEY");

  // Stream-endepunkt gir lyd direkte, raskt
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream?optimize_streaming_latency=0&output_format=mp3_44100_128`;
  const body = {
    model_id: MODEL_ID,
    text,
    voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.2, use_speaker_boost: true }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
      "Accept": "audio/mpeg"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errTxt = await res.text().catch(() => "");
    throw new Error(`ElevenLabs feila (${res.status}): ${errTxt}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(OUT_FILE, buf);
}

// ---- Hovud ----
(async function main() {
  try {
    const useJul = isJulPerDato(new Date());
    const file = path.join(
      MSG_DIR,
      useJul ? "meldinger_godkveld_jul.txt" : "meldinger_godkveld.txt"
    );

    const lines = await readLines(file);
    if (!lines.length) throw new Error(`Fant ingen linjer i ${file}`);

    const base = pickRandom(lines);

    // Anti-dansk “gjerde” + primer først i manuset
    const hardAnchor = "Les dette på norsk nynorsk, ikkje dansk. Sei: eg, ikkje, også, sjø, skje, øy, æ, ø, å.";
    const manuscript = [hardAnchor, LANGUAGE_PRIMER, base]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ");

    const voiceId = pickVoiceId();

    console.log("↪️ Godkveld-fil:", path.basename(file));
    console.log("↪️ Julemodus:", useJul ? "ON" : "OFF");
    console.log("↪️ Stemme:", voiceId.slice(0, 8) + "…");
    console.log("↪️ Tekst-start:", manuscript.slice(0, 160), "...");

    await ttsElevenLabs({ text: manuscript, voiceId });
    console.log("✅ Skreiv", OUT_FILE);
  } catch (e) {
    console.error("❌ Feil:", e);
    process.exit(1);
  }
})();
