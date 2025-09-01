import 'dotenv/config';
import fs from 'fs';
import fetch from 'node-fetch';

const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${process.env.LAT}&lon=${process.env.LON}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric&lang=no`;

async function getWeather() {
  const res = await fetch(weatherUrl);
  if (!res.ok) throw new Error(`Feil frå OpenWeather (${res.status})`);
  return res.json();
}

async function main() {
  const weather = await getWeather();
  const meldingar = [
    "Hei, kjekt å sjå deg igjen!",
    "Velkomen heim, håper du får ein fin dag.",
    "God dag! Eg er klar med siste nytt.",
    "Hei, her er dagens oppdatering.",
    "Velkomen! La oss sjekke kva som skjer i dag."
  ];
  const tilfeldig = meldingar[Math.floor(Math.random() * meldingar.length)];
  const tekst = `${tilfeldig} Klokka er ${new Date().toLocaleTimeString('no-NO', { timeStyle: 'short' })}. Temperaturen ute er ${Math.round(weather.main.temp)} grader og været er ${weather.weather[0].description}.`;
  
  fs.writeFileSync("velkomst.txt", tekst, "utf-8");
  console.log("✅ Generert melding:", tekst);
}

main().catch(err => {
  console.error("❌ Feil:", err);
  process.exit(1);
});
