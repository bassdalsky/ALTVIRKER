# ALTVIRKER – TTS-velkomst og godkveld (nynorsk)

## Bygg
- Køyre manuelt i **Actions**:
  - **Velkomst (bygg)** → lagar `velkomst.mp3`
  - **Godkveld (bygg)** → lagar `godkveld.mp3`

Publiserast til GitHub Pages: `https://<brukar>.github.io/<repo>/velkomst.mp3` og `.../godkveld.mp3`.

## Homey (flow)
**Når**: Webhook "Velkommen"  
**Så**:
1) *HomeyScript (valfritt)*: HTTP POST → `repository_dispatch` med event `velkomst-full` (eller berre køyr workflow i Actions når du vil oppdatere).
2) *Cast audio URL*: `https://<brukar>.github.io/<repo>/velkomst.mp3?cb=[Date Now]`

Liknande for **Godkveld** med `godkveld.mp3`.

## Secrets (Actions)
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_IDS` (f.eks. "21m00Tcm4TlvDq8ikWAM")
- `OPENWEATHER_API_KEY`
- `SKILBREI_LAT`, `SKILBREI_LON`
- `JULEMODUS` = `ON` eller `OFF`
