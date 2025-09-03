# Velkomst – Norsk only (låst til v2)

Denne varianten er **hardlåst** til `eleven_multilingual_v2` for rein norsk uttale.
- Ignorerer `ELEVENLABS_MODEL_ID` heilt.
- Støttar `READABLE_TIME_STYLE` (default = space) og `LANGUAGE_PRIMER`.

## Bruk
1) Legg inn secrets i repoet:
   - `OPENWEATHER_API_KEY`, `SKILBREI_LAT`, `SKILBREI_LON`
   - `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`
   - *(valfritt)* `LOCATION_NAME` (t.d. Skilbrei)
   - *(valfritt)* `READABLE_TIME_STYLE` (colon | space | og)
   - *(valfritt)* `LANGUAGE_PRIMER` (t.d. "Hei!")

2) **Test i Actions** → Run workflow med `test_message`. Artifact: `test-mp3`.

3) **Produksjon** → Køyres 00:01 Oslo, committer `velkomst.mp3` i repo-rota.
