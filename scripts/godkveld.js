import fetch from "node-fetch";

function pickRandomVoice() {
  const voices = process.env.ELEVENLABS_VOICE_IDS.split(",");
  return voices[Math.floor(Math.random() * voices.length)];
}

function getTimeAndDate() {
  const now = new Date();
  const options = { weekday: "long", hour: "2-digit", minute: "2-digit" };
  return now.toLocaleString("nn-NO", options);
}

async function buildText() {
  const datetime = getTimeAndDate();
  return `God kveld. Klokka er ${datetime}. Lysa blir sløkte, og systema går i kvile. Sov godt og ha ei roleg natt.`;
}

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
  await Bun.write("godkveld.mp3", buffer);
}

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
