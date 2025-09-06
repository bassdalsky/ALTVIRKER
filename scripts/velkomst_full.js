import path from "path";
import { fileURLToPath } from "url";
import { isJuleperiode, datoOgTid, hentVaer, lesTilfeldigLinje, ttsElevenLabs } from "./utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tz = process.env.TIMEZONE || "Europe/Oslo";

function weekdayFile() {
  const wd = new Date().toLocaleDateString("nn-NO", { weekday: "long", timeZone: tz }).toLowerCase();
  if (wd.includes("mån")) return "meldinger_mandag.txt";
  if (wd.includes("ons")) return "meldinger_onsdag.txt";
  if (wd.includes("tor") || wd.includes("tors")) return "meldinger_torsdag.txt";
  if (wd.includes("sun") || wd.includes("søn") || wd.includes("sund") || wd.includes("søn")) return "meldinger_sondag.txt";
  if (wd.includes("søn")) return "meldinger_sondag.txt";
  if (wd.includes("søndag")) return "meldinger_sondag.txt";
  if (wd.includes("sundag")) return "meldinger_sondag.txt";
  return "meldinger_vanleg.txt";
}

const juleOn = (process.env.JULEMODUS || "").toLowerCase() === "on";
const brukJul = juleOn || isJuleperiode();

const fil = path.join(__dirname, "..", "messages", weekdayFile());
const intro = await lesTilfeldigLinje(fil);

const { dato, tid } = datoOgTid();
const { temp, desc } = await hentVaer();

let hale = `I dag er det ${dato}. Klokka er ${tid}. Temperaturen ute er ${temp} grader og vêret er ${desc}.`;
if (brukJul && !intro.toLowerCase().includes("riktig god jul")) {
  hale += " Riktig god jul!";
}

const full = `${intro} ${hale}`;
await ttsElevenLabs(full, "velkomst.mp3");
console.log("✅ velkomst.mp3 generert");
