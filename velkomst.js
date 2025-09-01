import fetch from "node-fetch";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const WEATHER_URL = `https://api.openweathermap.org/data/2.5/weather?lat=${process.env.LAT}&lon=${process.env.LON}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric&lang=no`;

async function getWeather() {
  const res = await fetch(WEATHER_URL);
  if (!res.ok) throw new Error(`Feil frå OpenWeather (${res.status})`);
  return res.json();
}

function lagMelding(weather) {
  const temp = Math.round(weather.main.temp);
  const tilstand = weather.weather[0].description;
  const klokkeslett = new Date().toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });

  const meldingar = [
    `Hei og velkomen heim! Klokka er ${klokkeslett}. Ute er det ${temp} grader og ${tilstand}.`,
    `God dag! No er klokka ${klokkeslett}. Temperaturen er ${temp} grader, med ${tilstand}.`,
    `Vel møtt! Klokka har passert ${klokkeslett}. Vêret ute er ${tilstand}, og det er ${temp} grader.`,
    `Hei! Akkurat no er klokka ${klokkeslett}. Det er ${temp} grader ute, og me har ${tilstand}.`,
    `Velkomen! Det er ${temp} grader og ${tilstand} ute. Klokka er ${klokkeslett}.`
  ];

  return meldingar[Math.floor(Math.random() * meldingar.length)];
}

async function lagTale(tekst) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${process.env.VOICE_ID}`, {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text: tekst,
      voice_settings: { stability: 0.5, similarity_boost: 0.7 }
    })
  });

  if (!res.ok) throw new Error(`Feil frå ElevenLabs (${res.status})`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync("velkomst.mp3", buffer);
}

async function main() {
  try {
    const weather = await getWeather();
    const melding = lagMelding(weather);
    console.log("🔊 Generert melding:", melding);
    await lagTale(melding);
    console.log("✅ Lyd lagra: velkomst.mp3");
  } catch (err) {
    console.error("❌ Feil:", err);
    process.exit(1);
  }
}

main();
