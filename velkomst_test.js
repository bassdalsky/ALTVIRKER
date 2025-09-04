name: velkomst-test-live

on:
  workflow_dispatch: {}

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Sjekk ut kode
        uses: actions/checkout@v4

      - name: Sett opp Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Installer avhengigheter
        run: npm install node-fetch@3

      - name: Kjør live test (vær + klokke, Turbo 2.5)
        run: node velkomst_test_live.js
        env:
          OPENWEATHER_API_KEY: ${{ secrets.OPENWEATHER_API_KEY }}
          SKILBREI_LAT: ${{ secrets.SKILBREI_LAT }}
          SKILBREI_LON: ${{ secrets.SKILBREI_LON }}
          ELEVENLABS_API_KEY: ${{ secrets.ELEVENLABS_API_KEY }}
          ELEVENLABS_VOICE_ID: ${{ secrets.ELEVENLABS_VOICE_ID }}
          LANGUAGE_PRIMER: ${{ secrets.LANGUAGE_PRIMER }}

      - name: Last opp MP3 (artifact)
        uses: actions/upload-artifact@v4
        with:
          name: velkomst-test-live-mp3
          path: velkomst.mp3
