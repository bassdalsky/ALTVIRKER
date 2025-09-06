// velkomst_full.js – velkomst med intro + klokke + vær (Nynorsk)
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { nowOslo, formatClockDateNN, isJulPerDate, pickRandom, fetchWeather, buildTailNN } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..');               // repo-rot
const MSG_DIR = path.join(ROOT, 'messages');              // /messages
const OUT_FILE = path.join(ROOT, 'velkomst.mp3');

const ELEVEN_API = 'https://api.elevenlabs.io/v1';
const MODEL_ID = 'eleven_turbo_v2_5'; // tvungen Turbo 2.5 (rask + norsk)

function getEnv(name, fallback = '') {
  return (process.env[name] ?? fallback).toString().trim();
}

async function readLines(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return raw
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('#'));
}

function weekdayFileName(weekdayIndex) {
  // 0=søndag..6=lørdag
  const map = ['sondag', 'mandag', 'tysdag', 'onsdag', 'torsdag', 'fredag', 'laurdag'];
  return `meldinger_${map[weekdayIndex]}.txt`;
}

function ensureNorwegianPrimer(base) {
  // Tving Nynorsk, unngå dansk
  const hard = 'Snakk NORSK (Nynorsk). IKKJE dansk. Bruk norske uttalar og ord. Hald ein naturleg, varm tone.';
  return base ? `${hard} ${base}` : hard;
}

async function ttsToFile({ text, voiceId, apiKey, modelId, primer }, outPath) {
  const body = {
    model_id: modelId,
    text,
    // Tving norsk; "voice_settings" valfritt, vi held det enkelt
    // prompt/language primer
    'language': 'Norwegian',
    'voice_settings': { stability: 0.4, similarity_boost: 0.7 }
  };

  // Eleven støttar "preprompt"/"pronunciation" på Pro – vi legg primer i texten som systemhint:
  const payload = {
    ...body,
    text: `[SYSTEM: ${primer}] ${text}`
  };

  const res = await fetch(`${ELEVEN_API}/text-to-speech/${encodeURIComponent(voiceId)}/stream?optimize_streaming_latency=0&output_format=mp3_44100_128`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`ElevenLabs feila: ${res.status} ${t}`);
    }

  // Skriv buffer til fil
  const ab = await res.arrayBuffer();
  const buf = Buffer.from(ab);
  await fs.writeFile(outPath, buf);
}

async function main() {
  const { d } = nowOslo();
  const { weekday, clock, dateText } = formatClockDateNN(d);

  // Finn riktig meldingsfil
  const julemodusOn = /^on|true|1$/i.test(getEnv('JULEMODUS', ''));
  const inSeason = isJulPerDate(d);
  const useJul = julemodusOn || inSeason;

  const fileName = useJul ? 'meldinger_jul.txt' : weekdayFileName(d.getDay());
  const filePath = path.join(MSG_DIR, fileName);

  // Les og vel ei tilfeldig melding
  const lines = await readLines(filePath);
  if (!lines.length) throw new Error(`Tom meldingsfil: ${fileName}`);
  const intro = pickRandom(lines);

  // Hent vær (valfritt, men vi prøver)
  let weather = null;
  const lat = getEnv('SKILBREI_LAT');
  const lon = getEnv('SKILBREI_LON');
  const owKey = getEnv('OPENWEATHER_API_KEY');
  if (lat && lon && owKey) {
    try {
      weather = await fetchWeather({ lat, lon, apiKey: owKey });
    } catch (e) {
      console.warn('⚠️ Klarte ikkje hente ver:', e.message);
    }
  }

  const tail = buildTailNN({ weekday, clock, dateText, weather });
  const fullText = `${intro}${tail}`;

  // Stemmer – random frå Secret-lista
  const voicesCsv = getEnv('ELEVENLABS_VOICE_IDS');
  if (!voicesCsv) throw new Error('Mangler ELEVENLABS_VOICE_IDS (kommaseparert liste med voice-idar).');
  const voices = voicesCsv.split(',').map(s => s.trim()).filter(Boolean);
  const voiceId = pickRandom(voices);

  const apiKey = getEnv('ELEVENLABS_API_KEY');
  if (!apiKey) throw new Error('Mangler ELEVENLABS_API_KEY');

  const primer = ensureNorwegianPrimer(getEnv('LANGUAGE_PRIMER', ''));

  console.log('↪️  Velger fil:', fileName);
  console.log('↪️  Ukedag/dato:', weekday, dateText, clock);
  console.log('↪️  Stemma:', voiceId.slice(0, 8) + '…');
  console.log('↪️  Julemodus:', useJul ? 'ON' : 'OFF');

  await ttsToFile({ text: fullText, voiceId, apiKey, modelId: MODEL_ID, primer }, OUT_FILE);

  console.log('✅ Skreiv:', OUT_FILE);
}

main().catch(err => {
  console.error('❌ Feil:', err);
  process.exit(1);
});
