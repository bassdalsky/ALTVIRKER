// velkomst_tail.js – Nynorsk hale (vêr + klokke) -> velkomst_tail.mp3
import fs from "fs/promises";

const ELEVEN_API = "https://api.elevenlabs.io/v1/text-to-speech";
const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_IDS = (process.env.ELEVENLABS_VOICE_IDS || "").split(",").map(s => s.trim()).filter(Boolean);
const PRIMER = process.env.LANGUAGE_PRIMER || "Hei! Dette er ei norsk melding på nynorsk.";
const OW = process.env.OPENWEATHER_API_KEY;
const LAT = process.env.SKILBREI_LAT;
const LON = process.env.SKILBREI_LON;

function pickVoice() {
  if (!VOICE_IDS.length) throw new Error("Mangler ELEVENLABS_VOICE_IDS.");
  return VOICE_IDS[Math.floor(Math.random() * VOICE_IDS.length)];
}

function tidOslo() {
  const s = new Intl.DateTimeFormat("nn-NO", { timeZone: "Europe/Oslo", hour: "2-digit", minute: "2-digit" }).format(new Date());
  return s.replace(":", " "); // "01:37" -> "01 37"
}

async function verNo() {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${OW}&units=metric&lang=no`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Feil frå OpenWeather: ${res.status} ${await res.text()}`);
  const d = await res.json();
  const temp = Math.round(d.main.temp);
  const skildring = d.weather?.[0]?.description || "ukjent vêr";
  // Liten nynorsk-justering av vanlege skildringar:
  const nn = skildring
    .replace("overskyet", "overskya")
    .replace("spredt skydekke", "lettskyet")
    .replace("delvis skyet", "delvis skya")
    .replace("lett regn", "lett regn")
    .replace("regn", "regn")
    .replace("skyet", "skya");
  return { temp, skildring: nn };
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
  if (!res.ok) throw new Error(`Feil frå ElevenLabs (tail): ${res.status} ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(outFile, buf);
  console.log(`✅ Skreiv ${outFile}`);
}

async function main() {
  const { temp, skildring } = await verNo();
  const klokke = tidOslo();
  const text = `Vêret no: ${skildring}, kring ${temp} grader. Klokka er ${klokke}.`;
  await ttsToFile(text, "velkomst_tail.mp3");
}
main().catch(e => { console.error("❌ Feil i velkomst_tail:", e); process.exit(1); });
