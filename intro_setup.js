import fs from "fs";
import fetch from "node-fetch";

const ELEVEN_API = process.env.ELEVENLABS_API_KEY;
const LANGUAGE_PRIMER = process.env.LANGUAGE_PRIMER ?? "Hei! Dette er en norsk melding.";
const INTRO_FILE = process.env.INTRO_FILE || "meldinger.txt";
const INTRO_DIR  = process.env.INTRO_DIR  || "intros";

const IDS = (process.env.ELEVENLABS_VOICE_IDS || "")
  .split(",").map(s => s.trim()).filter(Boolean);
const LABELS = (process.env.VOICE_LABELS || "Olaf,Mia,Emma")
  .split(",").map(s => s.trim()).filter(Boolean);

const DAY_ALIASES = {
  monday:    ["mandag","måndag"],
  tuesday:   ["tirsdag","tysdag"],
  wednesday: ["onsdag"],
  thursday:  ["torsdag"],
  friday:    ["fredag"],
  saturday:  ["lørdag","laurdag"],
  sunday:    ["søndag"]
};

function readMessages() {
  const raw = fs.readFileSync(INTRO_FILE, "utf-8");
  return raw.split("\n");
}

function pickRandomIntroFor(weekday_en, lines) {
  const aliases = DAY_ALIASES[weekday_en] || [];
  let active = false; const candidates = [];
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("[")) { active = aliases.includes(t.slice(1,-1).toLowerCase()); continue; }
    if (active && t) candidates.push(t);
  }
  if (!candidates.length) return "Velkomen heim. Lysa blir tende. Her kjem oppdatering.";

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  const sentences = pick.split(/(?<=[.!?])\s+/);
  const filtered = sentences.filter(s => !s.includes("{KLOKKA}") && !s.includes("{VÆR}") && !s.includes("{VAER}"));
  const intro = filtered.join(" ").trim();
  return intro || "Velkomen heim. Lysa blir tende. Her kjem oppdatering.";
}

async function tts(voiceId, text, outPath) {
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
  if (!res.ok) throw new Error(`Feil fra ElevenLabs (${res.status}): ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(INTRO_DIR, { recursive: true });
  fs.writeFileSync(outPath, buf);
  console.log("✅ Laget intro:", outPath);
}

(async () => {
  try {
    if (!ELEVEN_API) throw new Error("Mangler ELEVENLABS_API_KEY");
    if (!IDS.length || LABELS.length !== IDS.length) throw new Error("ELEVENLABS_VOICE_IDS/VOICE_LABELS feil.");

    const lines = readMessages();
    const weekdays = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

    for (let i = 0; i < IDS.length; i++) {
      const voiceId = IDS[i]; const label = LABELS[i];
      for (const wd of weekdays) {
        const introText = pickRandomIntroFor(wd, lines);
        await tts(voiceId, introText, `${INTRO_DIR}/${wd}_${label}.mp3`);
      }
    }
    console.log("🎉 Alle introer generert.");
  } catch (e) {
    console.error("❌ Feil:", e);
    process.exit(1);
  }
})();
