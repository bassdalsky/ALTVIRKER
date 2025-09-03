# Velkomst-prosjekt (PERFEKT)

**Éi MP3-fil (`velkomst.mp3`)** oppdateres automatisk kvar natt kl. 00:01 (Oslo). Full støtte for `{KLOKKA}` / `{VÆR}` og pen opplesing av klokkeslett.

## Funksjonar
- OpenWeather (norsk, metric) – kan overstyrast med `DUMMY_WEATHER`.
- Klokke i Oslo-tid og **formatering for TTS** via `READABLE_TIME_STYLE`:
  - `colon` → `14:32` (standard)
  - `space` → `14 32` (anbefalt)
  - `og` → `14 og 32`
- Vel tekst frå `meldinger.txt` for dagens ukedag.
- ElevenLabs TTS: modell via secret `ELEVENLABS_MODEL_ID` (default v3), **fallback til v2** automatisk.
- GitHub Actions:
  - **prod:** committer `velkomst.mp3` i repo-rota + artifact.
  - **test:** `test_message` input → genererer `test.mp3` artifact.

## Secrets (Settings → Secrets and variables → Actions)
- `OPENWEATHER_API_KEY`
- `SKILBREI_LAT`
- `SKILBREI_LON`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`
- `ELEVENLABS_MODEL_ID` (t.d. `eleven_multilingual_v3`; fallback til v2 viss v3 ikkje finst)
- *(valfritt)* `LOCATION_NAME` – t.d. “Skilbrei” → “… i Skilbrei.”
- *(valfritt)* `READABLE_TIME_STYLE` – `colon` | `space` | `og`
- *(valfritt)* `DUMMY_WEATHER` – fast testtekst, hoppar over OpenWeather

## Bruk
- **Test i Actions:** Gå til **Actions → velkomst → Run workflow** og skriv inn `test_message`. Last ned `test-mp3` artifact.
- **Produksjon:** Kjør workflow utan `test_message`. `velkomst.mp3` blir committa i repo-rota kvar natt 00:01 (Oslo).

## `meldinger.txt`
Bruk overskrifter `# Mandag` … `# Søndag`. Éi melding per linje. Du kan fritt plassere `{KLOKKA}` og `{VÆR}`.

## Lokal test (frivillig)
```
OPENWEATHER_API_KEY=... SKILBREI_LAT=... SKILBREI_LON=... \
ELEVENLABS_API_KEY=... ELEVENLABS_VOICE_ID=... ELEVENLABS_MODEL_ID=eleven_multilingual_v3 \
READABLE_TIME_STYLE=space LOCATION_NAME=Skilbrei \
TEST_MESSAGE="Hjertelig velkommen! Klokka er {KLOKKA}, og {VÆR}. Ha ein flott dag!" \
node velkomst.js
```
→ Genererer `test.mp3`.


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

