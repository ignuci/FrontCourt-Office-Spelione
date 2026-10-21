# FrontCourt Office Spėlionė

Fantasy NBA predictions for the whole season — game picks, season awards, and your own prop bets, with a leaderboard for everyone in your league.

**Stack:** Next.js (static export) · React · TypeScript · Tailwind CSS · `node:test` · GitHub Pages · GitHub Actions

## What it does

- **Game picks** — add matchups, pick winners, optionally guess the margin. Picks lock at tip-off. Enter the final score afterwards.
- **Season picks** — champion, Finals runner-up, top seeds, worst record, MVP and other awards. All lock on a date you choose.
- **Props** — write your own questions with any set of answers and a points value.
- **Leaderboard** — one point per correct winner, +1 if the margin is within 3; season picks and props score their listed points.
- **Several players** — add your league in the Data tab and switch who's predicting from the header.

## Where data is saved

There's no server. Everything is one JSON file:

- It's always kept in your browser (localStorage), so closing the tab never loses picks.
- In Chrome, Edge or Opera you can **link a JSON file** on your computer from the Data tab — every change is written to it automatically, and the link is remembered on your next visit.
- In any browser you can **download** the JSON and **load** it again later (or on another device).
- Optional: commit a `public/data.json` and new visitors start from that file.

## Development

Requires Node 22.18 or newer (for running TypeScript tests directly).

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # node:test on src/**/*.test.ts
npm run typecheck
npm run build      # static site in ./out
```

The prediction logic lives in `src/lib` as plain TypeScript (no React), so it's tested directly with `node --test`. UI components are in `src/components`; browser storage is in `src/lib/storage.ts` and `src/hooks/usePredictions.ts`.

## Deploying

Every push to `main` runs `.github/workflows/deploy.yml`: install → test → build → type-check → publish to GitHub Pages. In the repo's **Settings → Pages**, set **Source** to **GitHub Actions** (once).

The site is served at `https://<user>.github.io/<repo>/`; the workflow passes that path to Next.js as `PAGES_BASE_PATH`.

---

Fan-made; not affiliated with the NBA.
