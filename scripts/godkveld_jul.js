// scripts/godkveld_jul.js
import fs from 'node:fs/promises';

// ---------- konfig frå secrets ----------
const OW_API_KEY   = process.env.OPENWEATHER_API_KEY;
const LAT          = process.env.SKILBREI_LAT;
const LON          = process.env.SKILBREI_LON;
const ELEVEN_KEY   = process.env.ELEVENLABS_API_KEY;
const VOICE_IDS    = (process.env.ELEVENLABS_VOICE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
const PRIMER       = (process.env.LANGUAGE_PRIMER || '').trim();
const JULEMODUS    = (process.env.JULEMODUS || '').toLowerCase();
// ---------------------------------------

const TZ = 'Europe/Oslo';
const MSG_FILE = 'messages/meldinger_godkveld_jul.txt';
const OUT_MP3  = 'godkveld.mp3';

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatNow() {
  const now = new Date();
  const f = new Intl.DateTimeFormat('nb-NO', {
    timeZone: TZ,
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  return f.format(now);
}

async function getWeather() {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${OW_API_KEY}&units=metric&lang=no`;
  const res = await fetch(url);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Feil OpenWeather: ${res.status} ${txt}`);
  }
  const data = await res.json();
  const temp = Math.round(data.main.temp);
  const desc = (data.weather?.[0]?.description || '').toLowerCase();
  return { temp, desc };
}

async function readMessages(path) {
  const raw = await fs.readFile(path, 'utf8');
  const lines = raw.split(/\r?\n/).map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));
  if (lines.length === 0) throw new Error(`Fant ingen meldinger i ${path}`);
  return lines;
}

function buildText(baseLine, dateTimeStr, weather) {
  const julTail = (JULEMODUS === 'on' || JULEMODUS === 'true' || JULEMODUS === '1')
    ? ' Riktig god jul, og takk for at du er innom. Huset dempar lys og system tek kvelden etter kvart, så du kan finne roen.'
    : '';

  const tail = ` Klokka er ${dateTimeStr}. Ute er det ${weather.desc}, omkring ${weather.temp} grader.`;

  const primerPrefix = PRIMER ? `${PRIMER}\n\n` : '';

  return `${primerPrefix}${baseLine}${tail}${julTail}`;
}

async function ttsToFile(text, outFile) {
  if (!ELEVEN_KEY) throw new Error('ELEVENLABS_API_KEY manglar');
  if (!VOICE_IDS.length) throw new Error('ELEVENLABS_VOICE_IDS manglar');

  const voiceId = pick(VOICE_IDS);

  const body = {
    text,
    model_id: 'eleven_turbo_v2_5',
    voice_settings: {
      stability: 0.6,
      similarity_boost: 0.8
    }
  };

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVEN_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Feil TTS: ${res.status} ${txt}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(outFile, buf);
}

async function main() {
  try {
    const [lines, weather] = await Promise.all([
      readMessages(MSG_FILE),
      getWeather()
    ]);

    const base = pick(lines);
    const nowStr = formatNow();
    const fullText = buildText(base, nowStr, weather);

    await ttsToFile(fullText, OUT_MP3);

    console.log('✅ Godkveld (jul) generert:', OUT_MP3);
  } catch (err) {
    console.error('❌ Feil:', err);
    process.exit(1);
  }
}

main();
