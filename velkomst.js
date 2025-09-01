import axios from "axios";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

// --- Sjekk at alle nødvendige miljøvariabler er satt ---
const requiredEnv = [
  "OPENAI_API_KEY",
  "OPENWEATHER_API_KEY",
  "ELEVENLABS_API_KEY",
  "VOICE_ID",
  "LAT",
  "LON"
];
const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error("[FEIL] Manglar desse variablane i .env:", missing.join(", "));
  process.exit(1);
}

// --- Hjelpefunksjonar ---
const getDayName = () => {
  return new Date().toLocaleDateString("no-NO", { weekday: "long" });
};

const getTimeNow = () => {
  return new Date().toLocaleTimeString("no-NO", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

async function getWeather() {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${process.env.LAT}&lon=${process.env.LON}&units=metric&lang=no&appid=${process.env.OPENWEATHER_API_KEY}`;
  const response = await axios.get(url);
  return {
    temp: Math.round(response.data.main.temp),
    desc: response.data.weather[0].description,
  };
}

function getBossReminder(day) {
  switch (day.toLowerCase()) {
    case "mandag":
      return "Hugs papirbosset i dag.";
    case "onsdag":
      return "Hugs det er bossdag på Sande frå kl 12.00 til 18.00.";
    case "torsdag":
      return "Hugs å sette ut bosspannet.";
    default:
      return "";
  }
}

async function getFunnyAdvice() {
  const prompt = `Lag ein kort, humoristisk norsk melding som passar som avslutning på ein velkomsthelsing. 
Døme: "I dag kan det vere fint å ta seg ein kopp kaffi." 
Meldinga skal vere maks 1 setning, og alltid med ein liten humor-vri.`;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 50,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Feil ved henting av humoristisk melding:", error.message);
    return "I dag er ein perfekt dag å late som du har kontroll på alt.";
  }
}

async function generateWelcome() {
  const day = getDayName();
  const time = getTimeNow();
  const weather = await getWeather();
  const bossReminder = getBossReminder(day);
  const funny = await getFunnyAdvice();

  const greetings = [
    "Velkommen heim!",
    "Hei, godt å sjå deg igjen!",
    "Der er du, velkommen tilbake!",
    "Hyggelig at du er heime igjen!",
  ];
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];

  let text = `${greeting} I dag er det ${day}, klokka er ${time}. `;
  text += `Ute er det ${weather.temp} grader og ${weather.desc}. `;
  text += `Inne er det 22 grader. `;
  if (bossReminder) text += bossReminder + " ";
  text += funny;

  return text;
}

async function textToSpeech(text) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${process.env.VOICE_ID}`;
  const response = await axios.post(
    url,
    {
      text: text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.4, similarity_boost: 0.8 },
    },
    {
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      responseType: "arraybuffer",
    }
  );
  fs.writeFileSync("velkomst.mp3", response.data);
  console.log("✅ Genererte velkomst.mp3");
}

// --- Start ---
generateWelcome()
  .then(async (text) => {
    console.log("Velkomstmelding:", text);
    await textToSpeech(text);
  })
  .catch((err) => console.error("FEIL:", err));
