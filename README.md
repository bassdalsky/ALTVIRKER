# Velkomst Generator

Dette repoet lager en `velkomst.mp3` automatisk via GitHub Actions.

## Oppsett
1. Gå til **Settings → Secrets and variables → Actions → New repository secret**
   - Legg inn følgende secrets:
     - `OPENAI_API_KEY`
     - `OPENWEATHER_API_KEY`
     - `ELEVENLABS_API_KEY`
     - `VOICE_ID`

2. Gå til **Actions-fanen** → velg **Generer velkomst-melding** → trykk **Run workflow**.

3. Filen `velkomst.mp3` vil dukke opp i repoet ditt.

---
Dette oppsettet bruker ElevenLabs **v3 Alpha** for norsk stemme.
