import axios from "axios";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.VOICE_ID;
const LAT = process.env.LAT;
const LON = process.env.LON;

// Ukedager på norsk
const days = ["Søndag","Mandag","Tirsdag","Onsdag","Torsdag","Fredag","Laurdag"];
const today = new Date();
const weekday = days[today.getDay()];

// Klokkeslett
const timeNow = today.toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });

// Velkomsthilsner (variasjon)
const greetings = [
  "Velkommen heim, eg skrur på alt lys til deg.",
  "Hei der! Kjekt å sjå deg igjen, no blir det lyst og triveleg her.",
  "Velkomen tilbake! Eg har tent lysa for deg.",
  "Hei, huset har sakna deg – lysa er alt skrudd på."
];
const greeting = greetings[Math.floor(Math.random() * greetings.length)];

// Hent værdata
const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=no`;
const weatherRes = await axios.get(weatherUrl);
const { main, weather } = weatherRes.data;

// Få ein humoristisk anbefaling frå OpenAI
const openaiRes = await axios.post(
  "https://api.openai.com/v1/chat/completions",
  {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Du er ein morsom norsk assistent som skriv korte, humoristiske daglege råd på nynorsk. Ver alltid litt leikande, små-ironisk eller rampete, men hald deg til maks 1 setning." },
      { role: "user", content: "Lag eit humoristisk råd for dagen." }
    ]
  },
  {
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    }
  }
);

const advice = openaiRes.data.choices[0].message.content;

// Boss-påminning
let reminder = "";
if (weekday === "Mandag") {
  reminder = "Hugs papirbosset.";
} else if (weekday === "Onsdag") {
  reminder = "Hugs det er bossdag på Sande frå klokka 12 til 18.";
} else if (weekday === "Torsdag") {
  reminder = "Hugs boss spannet.";
}

// Bygg velkomsttekst
const text = `Hei! I dag er det ${weekday}. ${greeting} 
Klokka er ${timeNow}. Temperaturen ute er ${main.temp} grader og været er ${weather[0].description}. 
Temperaturen inne er 22 grader. ${advice} ${reminder}`;

// Lag lyd via ElevenLabs
const ttsRes = await axios.post(
  `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
  {
    text,
    model_id: "eleven_v3",
    voice_settings: { stability: 0.7, similarity_boost: 0.7 }
  },
  {
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json"
    },
    responseType: "arraybuffer"
  }
);

fs.writeFileSync("velkomst.mp3", ttsRes.data);
console.log("[OK] velkomst.mp3 generert!");
