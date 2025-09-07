import fetch from "node-fetch";
import fs from "fs";

// Vel tilfeldig stemme frå secrets
function pickRandomVoice() {
  const voices = process.env.ELEVENLABS_VOICE_IDS.split(",");
  return voices[Math.floor(Math.random() * voices.length)];
}

// Hent tid/dato
function getTimeAndDate() {
  const now = new Date();
  const options = { weekday: "long", hour: "2-digit", minute: "2-digit" };
  return now.toLocaleString("no-NO", options);
}

// Bygg tekst frå godkveld.txt (eller godkveld_jul.txt når julemodus = on)
function loadMessage() {
  let path = "messages/meldinger_godkveld.txt";
  if (process.env.JULEMODUS === "on") {
    path = "messages/meldinger_godkveld_jul.txt";
  }
  const lines = fs.readFileSync(path, "utf-8")
    .split("\n")
    .filter(l => l.trim() !== "");
  return lines[Math.floor(Math.random() * lines.length)];
}

// Send tekst til ElevenLabs
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
  fs.writeFileSync("godkveld.mp3", buffer);
}

// Main
(async () => {
  try {
    const melding = loadMessage();
    const time = getTimeAndDate();
    const fullText = `${melding} Klokka er ${time}.`;
    console.log("[DEBUG] Generert tekst:", fullText);
    await generateMp3(fullText);
  } catch (err) {
    console.error("❌ Feil:", err);
    process.exit(1);
  }
})();
