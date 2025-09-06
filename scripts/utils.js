// utils.js – felles nyttefunksjonar (Node 20, ESM)

import { writeFile } from 'node:fs/promises';

// Få “no” i Europe/Oslo og ferdigformatert klokkeslett + dato (nynorsk-ish)
export function nowOslo() {
  const tz = 'Europe/Oslo';
  const d = new Date();
  const weekday = new Intl.DateTimeFormat('nn-NO', { weekday: 'long', timeZone: tz }).format(d);
  const day    = new Intl.DateTimeFormat('nn-NO', { day: '2-digit', timeZone: tz }).format(d);
  const month  = new Intl.DateTimeFormat('nn-NO', { month: 'long', timeZone: tz }).format(d);
  const year   = new Intl.DateTimeFormat('nn-NO', { year: 'numeric', timeZone: tz }).format(d);
  const time   = new Intl.DateTimeFormat('nn-NO', { hour: '2-digit', minute: '2-digit', timeZone: tz, hour12: false }).format(d);
  return { weekday, day, month, year, time };
}

// OpenWeather – enkel nåvarsling (temp + tekst)
export async function getWeather({ lat, lon, apiKey }) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&appid=${encodeURIComponent(apiKey)}&units=metric&lang=nn`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenWeather feil: ${res.status} ${await res.text()}`);
  const j = await res.json();
  const temp = Math.round(j.main?.temp ?? 0);
  const desc = (j.weather?.[0]?.description ?? '').toLowerCase();
  return { temp, desc };
}

// Les tilfeldig melding frå ei tekstfil (1 melding per linje)
export async function pickMessageFromFile(path) {
  const text = await (await fetch(`file://${process.cwd()}/${path}`)).text().catch(async () => {
    // fallback når file:// ikkje er lov: bruk fs
    const { readFile } = await import('node:fs/promises');
    return readFile(path, 'utf8');
  });
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).filter(l => !l.startsWith('#'));
  if (!lines.length) throw new Error(`Tom meldingsfil: ${path}`);
  const i = Math.floor(Math.random() * lines.length);
  return lines[i];
}

// ElevenLabs TTS – Turbo v2.5 stream -> lagre til MP3
export async function ttsToMp3({ apiKey, voiceId, modelId, text, outPath }) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?optimize_streaming_latency=4&output_format=mp3_44100_128`;
  const body = {
    model_id: modelId || 'eleven_turbo_v2_5',
    text,
    voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) throw new Error(`ElevenLabs feil ${res.status}: ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());   // <-- ingen .pipe()
  await writeFile(outPath, buf);
}
