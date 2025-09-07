import fetch from "node-fetch";
import fs from "fs";

function pickRandomVoice() {
  const voices = process.env.ELEVENLABS_VOICE_IDS.split(",");
  return voices[Math.floor(Math.random() * voices.length)];
}

function getTimeAndDate() {
  const now = new Date();
  const options = { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" };
  return now.toLocaleString("no-NO", options);
}

function loadMessage() {
  let path = "messages/meldinger.txt";
  if (process.env.JULEMODUS === "on") {
    path = "messages/meldinger_jul.txt";
  }
  const lines = fs.readFileSync(path, "utf-8")
    .split("\n")
    .filter(l => l.trim() !== "");
  return lines[Math.floor(Math.random() * lines.length)];
}

async function getWeather() {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${process.env.SKILBREI_LAT}&lon=${process.env.SKILBREI_LON}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric&lang=no`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Feil ved henting av vêrdata");
  const data = await res.json();
  return `${Math.round(data.main.temp)} grader og ${data.weather[0].description}`;
}

async function generateMp3(text) {
  const voiceId = pickRandomVoice();
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  const body = {
    model_id: "eleven_turbo_v2_5",
    text,
    voice_settings: { stability: 0.5, similarity_boost: 0.8 }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error("Feil frå ElevenLabs: " + err);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync("velkomst.mp3", buffer);
}

(async () => {
  try {
    const melding = loadMessage();
    const time = getTimeAndDate();
    const weather = await getWeather();
    const fullText = `${melding} Klokka er ${time}. Ute er det ${weather}.`;
    console.log("[DEBUG] Generert tekst:", fullText);
    await generateMp3(fullText);
  } catch (err) {
    console.error("❌ Feil:", err);
    process.exit(1);
  }
})();
