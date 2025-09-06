name: Velkomst (full)

on:
  workflow_dispatch: {}
  repository_dispatch:
    types: [velkomst-full]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build-and-publish:
    runs-on: ubuntu-latest
    environment:
      name: github-pages

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Build velkomst (Turbo 2.5, Oslo-tid)
        env:
          TZ: Europe/Oslo
          ELEVENLABS_API_KEY:   ${{ secrets.ELEVENLABS_API_KEY }}
          ELEVENLABS_VOICE_IDS: ${{ secrets.ELEVENLABS_VOICE_IDS }} # f.eks Olaf,Mia,Emma
          ELEVEN_MODEL_ID:      eleven_turbo_v2_5
          OPENWEATHER_API_KEY:  ${{ secrets.OPENWEATHER_API_KEY }}
          SKILBREI_LAT:         ${{ secrets.SKILBREI_LAT }}
          SKILBREI_LON:         ${{ secrets.SKILBREI_LON }}
          LANGUAGE_PRIMER:      ${{ secrets.LANGUAGE_PRIMER }}
          JULEMODUS:            ${{ secrets.JULEMODUS }}
        run: |
          node velkomst_full.js
          mkdir -p public
          cp velkomst.mp3 public/

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: public

      - name: Deploy to GitHub Pages
        uses: actions/deploy-pages@v4
