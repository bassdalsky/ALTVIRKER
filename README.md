# 🎙️ ALTVIRKER – Velkomst & Godkveld

Lagar `velkomst.mp3` og `godkveld.mp3` med ElevenLabs (norsk) + OpenWeather. Publiserer til GitHub Pages for enkel avspeling i Homey Pro / Chromecast.

## 🚀 Oppsett (GitHub)
1. Lag nytt repo og last opp alle filene i denne mappa.
2. Settings → Pages → Source: **GitHub Actions**.
3. Settings → Secrets and variables → Actions → legg inn:
   - `ELEVENLABS_API_KEY`
   - `ELEVENLABS_VOICE_IDS` → f.eks. `xF681s0UeE04gsf0mVsJ,uNsWM1StCcpydKYOjKyu,b3jcIbyC3BSnaRu8avEk`
   - `OPENWEATHER_API_KEY`
   - `SKILBREI_LAT` → `61.4500`
   - `SKILBREI_LON` → `5.8500`
   - (valfritt) `JULEMODUS` → `on`/`off`
   - (valfritt) `TIMEZONE` → `Europe/Oslo` (default)

## ▶️ Køyre
- Actions → **Render & publish (full)** → Run workflow.
- Automatisk kvar natt kl. 00:01 (kan fjernast i workflow om du vil).

## 🔗 URL-ar (bruk i Homey/Chromecast)
- `https://<bruker>.github.io/<repo>/velkomst.mp3?cb=[Date Now]`
- `https://<bruker>.github.io/<repo>/godkveld.mp3?cb=[Date Now]`

`?cb=[Date Now]` tvingar bort cache.

## 🛠️ Detaljar
- Nynorsk, vennlege velkomstlinjer (20–25s) + hale med **dato, klokke og vêr**.
- **Julemodus** automatisk 18. nov – 10. jan, eller manuelt via `JULEMODUS=on`.
- **eleven_turbo_v2_5** for naturleg norsk (unngår dansk-preg).
- Éin TTS-kall per fil (effektivt for kvota).
