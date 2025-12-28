# TRAVoices

Real-time AI Voice Translation powered by Gemini AI and LiveKit.

## Features

- Real-time voice translation across 12+ languages
- Multi-participant rooms for group conversations
- Live transcription display
- Low-latency audio streaming via WebRTC

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```
   npm install
   ```

2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key

3. Run the app:
   ```
   npm run dev
   ```

## Deployment

This app is configured for deployment on Render as a static site. See `render.yaml` for configuration.
