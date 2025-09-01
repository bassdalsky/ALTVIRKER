import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.VOICE_ID;
const LAT = process.env.LAT;
const LON = process.env.LON;
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

async function getWeather() {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=no`;
    const response = await fetch(url);
    const data = await response.json();

    // Debug: logg hele svaret til Actions
    console.log("OpenWeather response:", JSON.stringify(data, null, 2));

    if (data.cod !== 200 || !data.main || !data.weather) {
      return {
        temp: null,
        description: null,
        fallback: true,
      };
    }

    return {
      temp: data.main.temp,
      description: data.weather[0].description,
      fallback: false,
    };
  } catch (err) {
    console.error("Feil ved henting av vær:", err);
    return {
      temp: null,
      description: null,
      fallback: true,
    };
  }
}

function getBossmelding() {
  const

