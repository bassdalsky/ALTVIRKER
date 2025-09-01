import fs from "fs";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.VOICE_ID;

// Hent værdata
async function getWeather() {
  const lat = process.env.LAT || "61.3977";   // Skilbrei
  const lon = process.env.LON || "5.7894";
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=no&appid=${OPENWEATHER_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return `Det er ${Math.round(data.main.temp)} grader og ${data.weather[0].description} i dag.`;
}

// Generer velkomsttekst med OpenAI
async function generateText(weather) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Du lager en kort og hyggelig velkomstmelding på norsk, med litt humor.",
        },
        {
          role: "user",
          content: `Lag en velkomstmelding. Inkluder dagens værmelding: ${weather}`,
        },
      ],
    }),
  });

  const data = await res.json();
  return data.choices[0].message.content;
}

// Konverter til tale med ElevenLabs
async function textToSpeech(text) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream?model_id=eleven_multilingual_v3_alpha`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      voice_settings: {
