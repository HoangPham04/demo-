# Google Meet Bot - recovered self-host code

This package contains the old self-host Google Meet bot flow:

Google Meet link -> Playwright/Chromium opens Meet -> bot asks to join -> records tab using MediaRecorder -> saves WebM chunks to local disk.

Important:
- `src/bots/GoogleMeetBot.ts` is copied from the file you uploaded.
- The support files are reconstructed from the imports and the previous flow so the project structure is complete enough to review/run.
- This is the heavy local/Docker approach. For production, Recall.ai is lighter because Recall runs the bot for you.

## Run locally

```powershell
cp .env.example .env
npm install
npx playwright install chromium
npm run dev
```

## Run Docker

```powershell
docker compose up --build
```

## Output

Recordings are saved to:

```text
./recordings
```

Debug screenshots are saved to:

```text
./debug-images
```
