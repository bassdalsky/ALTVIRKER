import { isJuleperiode, datoOgTid, lesTilfeldigLinje, ttsElevenLabs } from "./utils.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const juleOn = (process.env.JULEMODUS || "").toLowerCase() === "on";
const brukJul = juleOn || isJuleperiode();

const meldingsFil = brukJul ? path.join(__dirname, "..", "meldinger_godkveld_jul.txt")
                            : path.join(__dirname, "..", "meldinger_godkveld.txt");

const intro = await lesTilfeldigLinje(meldingsFil);
const { dato } = datoOgTid();

let full = `${intro} Det er ${dato} i dag.`;
if (brukJul && !intro.toLowerCase().includes("riktig god jul")) {
  full += " Riktig god jul!";
}

await ttsElevenLabs(full, "godkveld.mp3");
console.log("✅ godkveld.mp3 generert");
