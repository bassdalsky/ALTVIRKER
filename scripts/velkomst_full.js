import { isJuleperiode, datoOgTid, hentVaer, lesTilfeldigLinje, ttsElevenLabs } from "./utils.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Julemodus: automatisk (18. nov–10. jan) eller tvinga via secret
const juleOn = (process.env.JULEMODUS || "").toLowerCase() === "on";
const brukJul = juleOn || isJuleperiode();

const meldingsFil = brukJul ? path.join(__dirname, "..", "meldinger_jul.txt")
                            : path.join(__dirname, "..", "meldinger.txt");

const intro = await lesTilfeldigLinje(meldingsFil);
const { dato, tid } = datoOgTid();
const { temp, desc } = await hentVaer();

let hale = `I dag er det ${dato}. Klokka er ${tid}. Temperaturen ute er ${temp} grader og vêret er ${desc}.`;
if (brukJul && !intro.toLowerCase().includes("riktig god jul")) {
  hale += " Riktig god jul!";
}

const full = `${intro} ${hale}`;

await ttsElevenLabs(full, "velkomst.mp3");
console.log("✅ velkomst.mp3 generert");
