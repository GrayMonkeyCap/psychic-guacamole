# System Sandbox — URL Shortener

A browser-based system-design game. Build a URL shortener, follow a single request, release repeatable traffic, and diagnose the bottleneck. The first level keeps a clay HUD around a 2D canvas board.

Open `http://127.0.0.1:5173/#system-lab` for the level, or the root URL for the campaign.

Three challenges introduce durable storage, repeated reads, and creation traffic. Database sequences, random API codes, and a dedicated ID service are valid choices. Cache-aside, vertical scaling, balanced replicas, and edge caching have different costs and capacity effects.

## Run locally

```bash
npm install
npm run dev
```

## Verify

```bash
npm test
npm run build
```

The canonical implementation is `src/FirstLevel.jsx` with pure simulation and validation in `src/levelModel.js`. `src/levelModel.test.js` checks functionality, graph routing, caches, overload/recovery, multiple winning designs, and persistence validation.

`scripts/verify-level.mjs` runs an isolated browser playthrough using an existing Playwright installation and Microsoft Edge:

```bash
node scripts/verify-level.mjs /path/to/node_modules
```

It verifies onboarding, wiring, request traces, pause/resume, failure diagnosis, save/reload, strategy changes, all three challenges, full-contract certification, and mobile overflow. Screenshots are saved in `artifacts/`. Tests do not modify the player's browser storage.

`scripts/verify-editor.mjs` additionally exercises pointer dragging, keyboard movement, undo, guide focus, connection removal, validation, and the tablet/mobile layouts with the same runtime argument.

Read [the research and design rationale](docs/first-level-design.md) for sources, alternatives considered, simulation limitations, and the next playtest criteria. Costs/capacities are game units; latency and throughput are approximations, not production sizing advice.
