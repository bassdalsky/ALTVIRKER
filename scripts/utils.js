// utils.js – felles hjelp
import { format } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';

// Nynorsk ukedagar / månader
const WEEKDAYS = ['sundag', 'måndag', 'tysdag', 'onsdag', 'torsdag', 'fredag', 'laurdag'];

export function nowOslo() {
  const tz = 'Europe/Oslo';
  const d = utcToZonedTime(new Date(), tz);
  return { d, tz };
}

export function formatClockDateNN(d) {
  const weekday = WEEKDAYS[d.getDay()];
  const hhmm = format(d, 'HH:mm');
  const dd = format(d, 'd');
  const month = format(d, 'LLLL', { locale: undefined }); // system locale, funker på runner
  return { weekday, clock: hhmm, dateText: `${dd}. ${month}` };
}

export function isJulPerDate(d) {
  const year = d.getFullYear();
  const start = new Date(`${year}-11-18T00:00:00+01:00`);
  const end = new Date(`${year + 1}-01-10T23:59:59+01:00`);
  return d >= start || d <= end;
}

export function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function fetchWeather({ lat, lon, apiKey }) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&appid=${encodeURIComponent(apiKey)}&units=metric&lang=no`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenWeather feila: ${res.status} ${await res.text()}`);
  const j = await res.json();
  const temp = Math.round(j.main?.temp ?? 0);
  const feels = Math.round(j.main?.feels_like ?? temp);
  const desc = (j.weather?.[0]?.description ?? '').toLowerCase();
  return { temp, feels, desc };
}

export function buildTailNN({ weekday, clock, dateText, weather }) {
  const w = weather ? ` Vêret er ${weather.desc}, temperaturen er ${weather.temp}° og kjennest som ${weather.feels}°.` : '';
  return ` Klokka er ${clock}, ${weekday} ${dateText}.${w}`;
}
