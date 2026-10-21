# FrontCourt Office Spėlionė

Fantasy NBA predictions for the whole season — game picks, season awards, and your own prop bets, with a leaderboard for everyone in your league.

**Stack:** Next.js (static export) · React · TypeScript · Tailwind CSS · `node:test` · GitHub Pages · GitHub Actions

## How it works

- **Pick your name** — the first screen lists the league's players. After confirming, the device remembers you.
- **Four stages** — Ruduo, Kalėdos, All-Star, Pavasaris. Each has 12 questions and its own lock date. Questions are picked from a team list, from a set of options, or answered in your own words (or a number). Every question shows what it's worth.
- **Submit once** — a stage's answers are final once submitted. Drafts are kept on the device while you fill them in.
- **Leaderboard** — the players from the list, points per stage and in total, counted once the correct answers are entered.
- The old Game picks / Season picks / Props pages are kept for inspiration only and will be removed.

## Where answers are saved

In a Google Sheet you own — one row per person per stage. Setup: [`apps-script/README.md`](apps-script/README.md).

- The sheet refuses a second submission for the same stage, names not on the list, and anything after the lock.
- Other people's answers stay hidden until a stage locks.
- A copy stays on the person's device; if the connection drops while submitting, it's sent automatically later.

## Editing the league

Everything lives in [`public/league.json`](public/league.json): `players`, `sheetUrl`, and each stage's `lock` date and `questions`.

- Question types: `team` (optionally `"conf": "E"` or `"W"`), `choice` (with `options`), `text`, `number` (optional `tolerance`).
- Set `answer` when the result is known. For `text` it can be a list of accepted spellings, e.g. `["Nikola Jokić", "Jokic"]`. Teams use codes like `"OKC"`.
- **Never change a question's `id` after people have answered** — answers are stored by id.
- `npm test` checks the file (12 questions per stage, valid answers, no duplicate ids) and the deploy stops if it's wrong.

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
