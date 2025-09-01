import fetch from "node-fetch";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

// 📌 Hent secrets fra miljø
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Standardstemme
const LAT = process.env.LAT;
const LON = process.env.LON;

if (!OPENAI_API_KEY || !OPENWEATHER_API_KEY || !ELEVENLABS_API_KEY || !LAT || !LON) {
  console.error("[FEIL] Manglar ein eller fleire variablar i .env eller secrets.");
  process.exit(1);
}

async function hentVaer() {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&units=metric&lang=no&appid=${OPENWEATHER_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return {
    temp: Math.round(data.main.temp),
    beskrivelse: data.weather[0].description,
  };
}

async function lagVelkomstMelding() {
  const dato = new Date();
  const dagar = ["søndag", "mandag", "tysdag", "onsdag", "torsdag", "fredag", "laurdag"];
  const dag = dagar[dato.getDay()];
  const klokkeslett = dato.toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });

  const vaer = await hentVaer();

  let ekstra = "";
  if (dag === "mandag") ekstra = "Hugs papirbosset i dag.";
  if (dag === "onsdag") ekstra = "I dag er det bossdag på Sande frå klokka 12 til 18.";
  if (dag === "torsdag") ekstra = "Hugs å setje ut boss spannet.";

  // Gi OpenAI oppdraget med å lage ein morsom avslutning
  const prompt = `Lag ein kort og humoristisk setning på norsk, som kunne vore ei vennleg velkomsthelsing.`;
  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 50,
    }),
  });
  const openaiData = await openaiRes.json();
  const humor = openaiData.choices?.[0]?.message?.content || "I dag kan du ta livet med ro og ein kopp kaffi.";

  return `Velkommen heim! Klokka er ${klokkeslett}. Ute er det ${vaer.temp} grader og ${vaer.beskrivelse}. Inne er det 22 grader. ${ekstra} ${humor}`;
}

async function lagLydfil(tekst) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text: tekst,
      voice_settings: {
        stability: 0.4,
        similarity_boost: 0.7,
      },
    }),
  });

  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync("velkomst.mp3", Buffer.from(arrayBuffer));
  console.log("[OK] velkomst.mp3 generert!");
}

(async () => {
  try {
    const melding = await lagVelkomstMelding();
    console.log("Generert melding:", melding);
    await lagLydfil(melding);
  } catch (err) {
    console.error("[FEIL] Noe gjekk gale:", err);
    process.exit(1);
  }
})();
