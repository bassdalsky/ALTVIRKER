import fetch from "node-fetch";

// Jul: 18. nov – 10. jan
export function isJuleperiode(now = new Date()) {
  const y = now.getFullYear();
  const start = new Date(`${y}-11-18T00:00:00Z`);
  const end   = new Date(`${y + 1}-01-10T23:59:59Z`);
  return now >= start && now <= end;
}

export function datoOgTid(tz = process.env.TIMEZONE || "Europe/Oslo") {
  const now = new Date();
  const dato = now.toLocaleDateString("nn-NO", {
    weekday: "long", day: "numeric", month: "long", timeZone: tz
  });
  const tid = now.toLocaleTimeString("nn-NO", {
    hour: "2-digit", minute: "2-digit", timeZone: tz
  });
  return { dato, tid };
}

export async function hentVaer() {
  const lat = process.env.SKILBREI_LAT;
  const lon = process.env.SKILBREI_LON;
  const key = process.env.OPENWEATHER_API_KEY;
  if (!lat || !lon || !key) throw new Error("Mangler lat/lon/API key til vær");
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${key}&units=metric&lang=no`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Feil ved henting av vær: ${res.status}`);
  const j = await res.json();
  const temp = Math.round(j.main?.temp ?? 0);
  const desc = j.weather?.[0]?.description ?? "";
  return { temp, desc };
}

export function randomVoice() {
  const list = (process.env.ELEVENLABS_VOICE_IDS || "")
    .split(",").map(s => s.trim()).filter(Boolean);
  if (!list.length) throw new Error("Mangler ELEVENLABS_VOICE_IDS");
  return list[Math.floor(Math.random() * list.length)];
}

export async function lesTilfeldigLinje(filbane) {
  const fs = await import("fs/promises");
  const raw = await fs.readFile(filbane, "utf8");
  const lines = raw.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("#"));
  if (!lines.length) throw new Error(`Ingen linjer i ${filbane}`);
  return lines[Math.floor(Math.random() * lines.length)];
}

export async function ttsElevenLabs(text, outFile) {
  const voice = randomVoice();
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model_id: "eleven_turbo_v2_5",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      text
    })
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`ElevenLabs feila: ${res.status} ${t}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const fs = await import("fs/promises");
  await fs.writeFile(outFile, buf);
}
