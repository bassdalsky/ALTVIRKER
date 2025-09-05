import fs from "fs";
import fetch from "node-fetch";

const ELEVEN_API = process.env.ELEVENLABS_API_KEY;
const LANGUAGE_PRIMER = process.env.LANGUAGE_PRIMER ?? "Hei! Dette er en norsk melding.";

const IDS = (process.env.ELEVENLABS_VOICE_IDS || "")
  .split(",").map(s => s.trim()).filter(Boolean);
const LABELS = (process.env.VOICE_LABELS || "Olaf,Mia,Emma")
  .split(",").map(s => s.trim()).filter(Boolean);

function readGoodnightMessages() {
  const raw = fs.readFileSync("meldinger_godkveld.txt", "utf-8");
  const lines = raw.split("\n");
  let active = false;
  const out = [];
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("[")) { active = t.slice(1,-1).toLowerCase() === "godkveld"; continue; }
    if (active && t) out.push(t);
  }
  if (!out.length) throw new Error("Fann ingen meldinger under [godkveld] i meldinger_godkveld.txt");
  return out;
}

async function tts(voiceId, text) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "Accept": "audio/mpeg",
      "Content-Type": "application/json",
      "xi-api-key": ELEVEN_API
    },
    body: JSON.stringify({
      model_id: "eleven_turbo_v2_5",
      text: `${LANGUAGE_PRIMER} ${text}`,
      voice_settings: { stability: 0.45, similarity_boost: 0.8 }
    })
  });
  if (!res.ok) throw new Error(`Feil frå ElevenLabs (${res.status}): ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf;
}

(async () => {
  try {
    if (!ELEVEN_API) throw new Error("Mangler ELEVENLABS_API_KEY");
    if (!IDS.length || LABELS.length !== IDS.length) throw new Error("Sett ELEVENLABS_VOICE_IDS og VOICE_LABELS (samme antall/rekkefølge).");

    const msgs = readGoodnightMessages();
    fs.mkdirSync("godkveld", { recursive: true });

    for (let i = 0; i < IDS.length; i++) {
      const voiceId = IDS[i];
      const label = LABELS[i];
      for (let m = 0; m < msgs.length; m++) {
        const text = msgs[m];
        const buf = await tts(voiceId, text);
        const path = `godkveld/${label}_${m+1}.mp3`;
        fs.writeFileSync(path, buf);
        console.log("✅ Lagde:", path);
      }
    }
    console.log("🎉 Godkveld-klipp ferdig.");
  } catch (e) {
    console.error("❌ Feil:", e);
    process.exit(1);
  }
})();
