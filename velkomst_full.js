// velkomst_full.js – Bygg EITT spor "velkomst.mp3" (intro + klokke + dato + vær)
// Språk: nynorsk. Tidssone: Europe/Oslo. ElevenLabs Turbo 2.5.

import { ttsToMp3, nowOslo, getWeather, pickMessageFromFile } from './utils.js';
import { existsSync } from 'node:fs';

const {
  OPENWEATHER_API_KEY,
  SKILBREI_LAT,
  SKILBREI_LON,
  ELEVENLABS_API_KEY,
  ELEVENLABS_VOICE_IDS,
  LANGUAGE_PRIMER,
  JULEMODUS
} = process.env;

if (!ELEVENLABS_API_KEY) throw new Error('Mangler ELEVENLABS_API_KEY');
if (!ELEVENLABS_VOICE_IDS) throw new Error('Mangler ELEVENLABS_VOICE_IDS');

const voiceId = (ELEVENLABS_VOICE_IDS.split(',')[0] || '').trim();
if (!voiceId) throw new Error('Fant ingen voiceId i ELEVENLABS_VOICE_IDS');

const tzNow = nowOslo(); // { weekday, day, month, year, time }

// Vel meldingsfil etter ukedag – fell tilbake til vanleg
const weekdayMap = {
  'måndag': 'messages/meldinger_mandag.txt',
  'mandag': 'messages/meldinger_mandag.txt',
  'tysdag': 'messages/meldinger_tysdag.txt',
  'tirsdag': 'messages/meldinger_tysdag.txt',
  'onsdag': 'messages/meldinger_onsdag.txt',
  'torsdag': 'messages/meldinger_torsdag.txt',
  'fredag': 'messages/meldinger_fredag.txt',
  'laurdag': 'messages/meldinger_laurdag.txt',
  'lørdag': 'messages/meldinger_laurdag.txt',
  'sundag': 'messages/meldinger_sondag.txt',
  'søndag': 'messages/meldinger_sondag.txt'
};

const wk = tzNow.weekday.toLowerCase();
const msgPath = weekdayMap[wk] && existsSync(weekdayMap[wk]) ? weekdayMap[wk] : 'messages/meldinger_vanleg.txt';

// Hent basemelding
const baseMessage = await pickMessageFromFile(msgPath);

// Julesignatur (18. nov – 10. jan) når JULEMODUS=ON
let juleHelsing = '';
if ((JULEMODUS || '').toUpperCase() === 'ON') {
  // berre legg på ei lita venleg helsing – du kan utvide som du vil
  juleHelsing = ' Riktig god jul, og takk for at du stikk innom!';
}

// Vêr (valfritt – om nøklane finst)
let vaerTekst = '';
if (OPENWEATHER_API_KEY && SKILBREI_LAT && SKILBREI_LON) {
  const w = await getWeather({ lat: SKILBREI_LAT, lon: SKILBREI_LON, apiKey: OPENWEATHER_API_KEY });
  vaerTekst = ` Vêret ute er ${w.desc}, og rundt ${w.temp} plussgrader.`;
}

// Primer for å låse nynorsk – hindrar “dansk” lyd
const primer = (LANGUAGE_PRIMER && LANGUAGE_PRIMER.trim().length)
  ? LANGUAGE_PRIMER.trim()
  : 'Snakk naturleg nynorsk (ikkje dansk), med norsk uttale på tal, ukedagar og stader.';

const klokkeDato = `Klokka er ${tzNow.time}. Det er ${tzNow.weekday} ${tzNow.day}. ${tzNow.month} ${tzNow.year}.`;

// Bygg eitt samanhengande manus
const manus =
  `${primer}\n` +
  `${baseMessage}\n` +
  `…\n` + // liten pustepause
  `${klokkeDato}${vaerTekst}${juleHelsing}`;

// Køyre TTS til fil
await ttsToMp3({
  apiKey: ELEVENLABS_API_KEY,
  voiceId,
  modelId: 'eleven_turbo_v2_5',
  text: manus,
  outPath: 'velkomst.mp3'
});

console.log('✅ velkomst.mp3 generert.');
