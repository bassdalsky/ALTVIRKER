import fs from "fs";
import fetch from "node-fetch";

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const WEATHER_KEY = process.env.OPENWEATHER_API_KEY;
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.VOICE_ID;

async function getWeather() {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=61.45&lon=5.85&units=metric&appid=${WEATHER_KEY}&lang=no`;
  const res = await fetch(url);
  const data = await res.json();
  return `${data.weather[0].description} ${Math.round(data.main.temp)}°C`;
}

async function generateText(weather) {
  const prompt = `Lag en kort og hyggelig velkomstmelding på norsk. 
  Ta med været: ${weather}. 
  Bruk en vennlig tone.`;
  
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }]
    })
  });
  const data = await res.json();
  return data.choices[0].message.content;
}

async function generateTTS(text) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVEN_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v3_alpha",   // ✅ riktig modell
      voice_settings: { stability: 0.5, similarity_boost: 0.7 }
    })
  });

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync("velkomst.mp3", buffer);
  console.log("✅ Lagret velkomst.mp3");
}

async function main() {
  const weather = await getWeather();
  const text = await generateText(weather);
  console.log("📢 Generert tekst:", text);
  await generateTTS(text);
}

main();
