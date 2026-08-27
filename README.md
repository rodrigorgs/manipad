# ManiPad

ManiPad is a tablet-friendly collaborative canvas for online tutoring. It combines freehand drawing, math manipulatives, two-sided chips, cards, dice, counters, pasted images, and pawns in temporary share-by-link rooms. Drawer objects can be tapped for collision-aware placement or dragged directly to a chosen board position.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite client proxies API and Socket.IO traffic to the Node server on port 3000.

## Production

```bash
npm run build
npm start
```

The production server serves both the compiled client and realtime API on `PORT` (default `3000`). A single-process Dockerfile is included for Render, Railway, or Fly.io. Rooms are intentionally stored in memory and expire 30 minutes after the last participant leaves.

## Verification

```bash
npm test
npx playwright install chromium webkit
npm run test:e2e
```

The server is authoritative for room permissions, revisions, card shuffles, card draws, and dice rolls. Socket payloads are validated with Zod before mutations are applied.
