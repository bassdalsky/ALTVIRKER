import fetch from "node-fetch";

// Plukk tilfeldig stemme frå secrets (komma-separert liste)
function pickRandomVoice() {
  const voices = process.env.ELEVENLABS_VOICE_IDS.split(",");
  return voices[Math.floor(Math.random() * voices.length)];
}

// Hent vêr frå OpenWeather
async function getWeather() {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${process.env.SKILBREI_LAT}&lon=${process.env.SKILBREI_LON}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric&lang=no`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Feil ved henting av vêrdata");
  const data = await res.json();
  return `${Math.round(data.main.temp)} grader og ${data.weather[0].description}`;
}

// Formater tid og dato
function getTimeAndDate() {
  const now = new Date();
  const options = { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" };
  return now.toLocaleString("nn-NO", options); // tvungen nynorsk
}

// Lag teksten basert på melding + vêr + klokke
async function buildText() {
  const weather = await getWeather();
  const datetime = getTimeAndDate();
  return `Hjartelig velkommen heim! Lysa blir tende for deg. No er det ${datetime}, og ute er det ${weather}.`;
}

// Send til ElevenLabs og lag mp3
async function generateMp3(text) {
  const voiceId = pickRandomVoice();
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  const body = {
    model_id: "eleven_turbo_v2_5",
    text,
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.8
    },
    language: "no",
    language_code: "nn-NO"
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
  await Bun.write("velkomst.mp3", buffer); // GitHub Actions plukkar opp fila
}

// Main
(async () => {
  try {
    const text = await buildText();
    console.log("[DEBUG] Generert tekst:", text);
    await generateMp3(text);
  } catch (err) {
    console.error("❌ Feil:", err);
    process.exit(1);
  }
})();
