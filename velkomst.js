import fs from "fs";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const outputFile = "velkomst.mp3";

// Hjelpefunksjon: hent vær
async function hentVaer() {
  const lat = process.env.LAT;
  const lon = process.env.LON;
  const apiKey = process.env.OPENWEATHER_API_KEY;

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=no&appid=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Feil ved henting av værdata");
  return res.json();
}

// Lag tilfeldig velkomst
function tilfeldigVelkomst() {
  const hilsener = [
    "God morgon! Klar for ein ny dag?",
    "Hei hei, håpar du har sovna frå i går!",
    "Velkommen til ein ny dag i Skilbrei!",
    "Hei! Kaffien ventar, og dagen byrjar no.",
    "Morgon! Hugs å smile før frukost, d
