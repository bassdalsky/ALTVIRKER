
// scripts/godkveld.js
// Byggar "godkveld.mp3" frå rette meldingar (vanleg/jul) på nynorsk.
// Brukar ElevenLabs Turbo 2.5. Leser IKKJE LANGUAGE_PRIMER høgt.

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

// --- konfig frå environment/secrets ---
const ELEVEN_API = process.env.ELEVENLABS_API_KEY;
const VOICE_IDS_CSV = process.env.ELEVENLABS_VOICE_IDS || '';   // komma-separerte voice-idar (vel gjerne berre norske stemmer)
const JULEMODUS = String(process.env.JULEMODUS || '').toLowerCase().trim(); // on/true/1/yes = tvungen jul
// Merk: LANGUAGE_PRIMER er *medvite* ikkje brukt i teksten for å hindre at den blir lest opp.

if (!ELEVEN_API) {
  throw new Error('Mangler ELEVENLABS_API_KEY');
}
const VOICES = VOICE_IDS_CSV.split(',').map(v => v.trim()).filter(Boolean);
if (VOICES.length === 0) {
  throw new Error('Mangler ELEVENLABS_VOICE_IDS (minst éi norsk stemme)');
}

// --- hjelp ---
function erJuleperiode(d = new Date()) {
  // 18. nov – 10. jan
  const year = d.getFullYear();
  const start = new Date(`${year}-11-18T00:00:00`);
  const end = new Date(`${year + 1}-01-10T23:59:59`);
  return d >= start || d <= end; // dekker over nyttår
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Les meldingar frå rett fil
function lesMelding() {
  const no = new Date();
  const brukJul = (JULEMODUS === 'on' || JULEMODUS === 'true' || JULEMODUS === '1' || JULEMODUS === 'yes') || erJuleperiode(no);

  const filnavn = brukJul ? 'meldinger_godkveld_jul.txt' : 'meldinger_godkveld.txt';
  const fullPath = path.join(process.cwd(), 'messages', filnavn);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Fann ikkje ${filnavn} i /messages`);
  }
  const rå = fs.readFileSync(fullPath, 'utf8');
  const linjer = rå
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#') && l.length > 8);

  if (linjer.length === 0) {
    throw new Error(`${filnavn} inneheld ingen brukande linjer`);
  }
  let tekst = pickRandom(linjer);

  // Legg til ein høfleg julehale dersom vi er i julemodus og teksten ikkje alt har julehelsing
  if (brukJul && !/god jul/i.test(tekst)) {
    tekst += ' Riktig god jul! 🎄';
  }
  return tekst;
}

// Kall ElevenLabs (Turbo 2.5) og lagre direkte til fil utan .pipe()
async function ttsTilFil(voiceId, text, outFile) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  const body = {
    text,                          // KUN meldinga – ingen primer!
    model_id: 'eleven_turbo_v2_5',
    // valfrie innstillingar – konservative for klar tale
    voice_settings: {
      stability: 0.45,
      similarity_boost: 0.7,
      style: 0.2,
      use_speaker_boost: true
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVEN_API,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errTxt = await res.text().catch(() => '');
    throw new Error(`ElevenLabs feil ${res.status}: ${errTxt}`);
  }

  // Unngå .pipe() → bruk arrayBuffer for å vere kompatibel i Actions
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outFile, buf);
}

// --- hovud ---
async function main() {
  const melding = lesMelding();
  const voiceId = pickRandom(VOICES);
  const out = path.join(process.cwd(), 'godkveld.mp3');

  console.log('▶️  Stemme:', voiceId);
  console.log('📝  Tekst:', melding);

  await ttsTilFil(voiceId, melding, out);
  console.log('✅ Skreiv', out);
}

main().catch(err => {
  console.error('❌ Feil:', err);
  process.exit(1);
});
