// scripts/make_intro_now.js
import { readFile, writeFile } from "fs/promises";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICES = (process.env.ELEVENLABS_VOICE_IDS || "")
  .split(",").map(s=>s.trim()).filter(Boolean);
const LANGUAGE_PRIMER = process.env.LANGUAGE_PRIMER || "Hei! Dette er en norsk melding.";

if (!ELEVENLABS_API_KEY) throw new Error("Mangler ELEVENLABS_API_KEY");
if (!VOICES.length) throw new Error("Mangler ELEVENLABS_VOICE_IDS");

function weekday() {
  const tz = "Europe/Oslo";
  return new Date().toLocaleDateString("no-NO",{weekday:"long", timeZone:tz}).toLowerCase();
}
function normalizeDay(s) {
  const x = s.toLowerCase().normalize("NFKD").replace(/[^\w]/g,"");
  if (x.startsWith("mandag")) return "mandag";
  if (x.startsWith("tysdag") || x.startsWith("tirsdag")) return "tirsdag";
  if (x.startsWith("onsdag")) return "onsdag";
  if (x.startsWith("torsdag")) return "torsdag";
  if (x.startsWith("fredag")) return "fredag";
  if (x.startsWith("lordag") || x.startsWith("laurdag") || x.startsWith("lørdag")) return "lørdag";
  if (x.startsWith("sondag") || x.startsWith("søndag")) return "søndag";
  return "mandag";
}
function parsePools(txt) {
  const pools = { mandag:[], tirsdag:[], onsdag:[], torsdag:[], fredag:[], lørdag:[], søndag:[] };
  const lines = txt.split(/\r?\n/);
  let cur=null, buf=[];
  const flush=()=>{ const c=buf.join("\n").trim(); if(cur&&c){ pools[cur].push(...c.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean)); } buf=[]; };
  for (const raw of lines) {
    const line = raw.trim();
    const h = line.match(/^#\s*([A-Za-zæøåÆØÅ\- ]+)\s*$/) || line.match(/^\[([A-Za-zæøåÆØÅ\- ]+)\]\s*$/);
    if (h) { flush(); cur = normalizeDay(h[1]); continue; }
    if (cur) buf.push(raw);
  }
  flush();
  return pools;
}
function pick(a){ return a[Math.floor(Math.random()*a.length)] }

const txt = await readFile("meldinger.txt","utf8");
const pools = parsePools(txt);
const day = normalizeDay(weekday());
const pool = pools[day]?.length ? pools[day] : pools["mandag"];
const message = pick(pool).replace(/\{KLOKKA\}|\{VÆR\}/g,"").replace(/\s+/g," ").trim();

const voice = pick(VOICES);
const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`,{
  method:"POST",
  headers:{
    "Accept":"audio/mpeg",
    "Content-Type":"application/json",
    "xi-api-key": ELEVENLABS_API_KEY
  },
  body: JSON.stringify({ model_id:"eleven_turbo_v2_5", text: `${LANGUAGE_PRIMER} ${message}` })
});
if (!res.ok) throw new Error(`ElevenLabs feil (${res.status}): ${await res.text()}`);
const buf = Buffer.from(await res.arrayBuffer());
await writeFile("intro_now.mp3", buf);
console.log("✅ Skapte intro_now.mp3 (fallback)");
