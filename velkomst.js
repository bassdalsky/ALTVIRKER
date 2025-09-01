import fs from "fs";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

async function getWeather() {
  const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${process.env.LAT}&lon=${process.env.LON}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric&lang=no`);
  if (!res.ok) throw new Error(`Vær-API feilet (${res.status})`);
  const data = await res.json();
  return { temp: Math.round(data.main.temp), desc: data.weather[0]?.description || "ukjent vær" };
}

function weekdayNo(d = new Date()) {
  return d.toLocaleDateString("no-NO", { weekday: "long" }).toLowerCase();
}

function buildText(weather) {
  const now = new Date();
  const kl = now.toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });
  const dag = weekdayNo(now);
  let remind = "";
  if (dag === "mandag") remind = "Hugs papirbosset i dag.";
  if (dag === "onsdag") remind = "Bossplassen på Sande er open frå 12-18.";
  if (dag === "torsdag") remind = "Hugs å ta ned bossspannet.";

  return `Velkomen heim! Klokka er ${kl}. Innetemperaturen er 22 grader. Ute er det ${weather.temp} grader og ${weather.desc}. ${remind} Ha ein fin dag!`;
}

async function makeMp3(text) {
  console.log(`🗣 VOICE_ID: ${process.env.ELEVEN_VOICE_ID}, model: ${process.env.ELEVEN_MODEL_ID}`);
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVEN_VOICE_ID}`, {
    method: "POST",
    headers: {
      "Accept": "audio/mpeg",
      "Content-Type": "application/json",
      "xi-api-key": process.env.ELEVEN_API_KEY
    },
    body: JSON.stringify({
      text,
      model_id: process.env.ELEVEN_MODEL_ID,
      voice_settings: { stability: 0.5, similarity_boost: 0.75 }
    })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs error ${res.status}: ${err}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync("velkomst.mp3", buf);
  console.log("✅ velkomst.mp3 lagra!");
}

async function main() {
  try {
    const weather = await getWeather();
    const text = buildText(weather);
    console.log("Tekst:", text);
    await makeMp3(text);
  } catch (e) {
    console.error("Feil:", e);
    process.exit(1);
  }
}

main();
