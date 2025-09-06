// scripts/render_intros.js
// Les meldinger.txt og lag forhåndsklipp pr. ukedag under clips/<dag>/N.mp3
// Bruker ElevenLabs turbo v2.5. KØYR DENNE ÉIN GONG (eller når du oppdaterer tekstene).

import { readFile, mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICES = (process.env.ELEVENLABS_VOICE_IDS || "")
  .split(",").map(s=>s.trim()).filter(Boolean);
const LANGUAGE_PRIMER = process.env.LANGUAGE_PRIMER || "Hei! Dette er en norsk melding.";

if (!ELEVENLABS_API_KEY) throw new Error("Mangler ELEVENLABS_API_KEY");
if (!VOICES.length) throw new Error("Mangler ELEVENLABS_VOICE_IDS (kommaseparert)");

const days = ["mandag","tirsdag","onsdag","torsdag","fredag","lørdag","søndag"];

function normalizeDay(s) {
  const x = s.toLowerCase().normalize("NFKD").replace(/[^\w]/g,"");
  if (x.startsWith("mandag")) return "mandag";
  if (x.startsWith("tysdag") || x.startsWith("tirsdag")) return "tirsdag";
  if (x.startsWith("onsdag")) return "onsdag";
  if (x.startsWith("torsdag")) return "torsdag";
  if (x.startsWith("fredag")) return "fredag";
  if (x.startsWith("lordag") || x.startsWith("laurdag") || x.startsWith("lørdag")) return "lørdag";
  if (x.startsWith("sondag") || x.startsWith("søndag")) return "søndag";
  return null;
}

function parseMessages(txt) {
  const pools = Object.fromEntries(days.map(d=>[d,[]]));
  const lines = txt.split(/\r?\n/);
  let cur = null, buf = [];
  const flush = () => {
    const chunk = buf.join("\n").trim();
    if (cur && chunk) {
      const parts = chunk.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean);
      pools[cur].push(...parts);
    }
    buf = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    const h = line.match(/^#\s*([A-Za-zæøåÆØÅ\- ]+)\s*$/) || line.match(/^\[([A-Za-zæøåÆØÅ\- ]+)\]\s*$/);
    if (h) { flush(); cur = normalizeDay(h[1]); continue; }
    if (cur) buf.push(raw);
  }
  flush();
  return pools;
}

async function tts(text, voiceId) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "Accept":"audio/mpeg",
      "Content-Type":"application/json",
      "xi-api-key": ELEVENLABS_API_KEY
    },
    body: JSON.stringify({
      model_id: "eleven_turbo_v2_5",
      text: `${LANGUAGE_PRIMER} ${text.replace(/\{KLOKKA\}|\{VÆR\}/g,"")}`
    })
  });
  if (!res.ok) throw new Error(`ElevenLabs feil (${res.status}): ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

const txt = await readFile("meldinger.txt","utf8");
const pools = parseMessages(txt);

for (const day of days) {
  const list = pools[day] || [];
  if (!list.length) continue;
  if (!existsSync(`clips/${day}`)) await mkdir(`clips/${day}`, { recursive:true });
  let idx = 1;
  for (const message of list) {
    const voice = VOICES[(idx-1) % VOICES.length]; // ruller mellom stemmene
    const buf = await tts(message, voice);
    await writeFile(`clips/${day}/${idx}.mp3`, buf);
    console.log(`Lagde clips/${day}/${idx}.mp3`);
    idx++;
  }
}
console.log("✅ Ferdig! Introklipp ligger i ./clips/<dag>/");
