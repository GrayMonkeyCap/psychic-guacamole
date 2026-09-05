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

The campaign landing screen (`src/CampaignHome.jsx` and `src/campaign.css`) shares the level's clay materials and offers a guided first start or an accurate resume view. Its board preview, budget, and challenge progress come from the existing local save. Upcoming levels are explicitly marked as not playable. Reopening the introduction preserves the saved design.

`scripts/verify-campaign.mjs` checks new and returning players, navigation, tutorial replay, current-design milestones, corrupted saves, and widths from 320px to desktop. Run it with the same Playwright runtime argument.

Read [the research and design rationale](docs/first-level-design.md) for sources, alternatives considered, simulation limitations, and the next playtest criteria. Costs/capacities are game units; latency and throughput are approximations, not production sizing advice.

The [Level 1 product backlog](docs/level-1-product-backlog.md) prioritizes simulation trust, learning, sandbox UX, replay, accessibility, and validation. It defines the quality gate to satisfy before creating additional playable levels.

Earned passes are stored independently of the 12 most recent attempts, keyed by behavioral design fingerprint and model/scenario versions. Save schema 3 migrates existing schema-2 records in place under the same browser-storage key. Earlier-rule passes remain recorded but do not certify the current rules. `src/levelProgress.test.js` covers retention, migration and threshold boundaries; `src/progressViews.test.jsx` checks that both screens present the same certification state.

Latency is labelled **estimated latency**, not measured p99. The optional **How tests are measured** panel explains the estimate, per-sample success contract, costs and model limitations. See the [current model contract](docs/level-1-model-contract.md) before changing simulation rules.

The `admission-v2` simulator uses explicit fail-fast capacity: rejected requests stop before the next dependency, shared resources admit proportional work, and cache fills occur only after successful reads with available fill capacity. There is no waiting queue in this model. The inspector shows admitted/rejected requests and successful/skipped fills; terminal outcomes and per-operation accounting are tested in `src/trafficModel.test.js`. Earlier-model passes remain saved but require retesting for current certification.

Pause or finish traffic to inspect **recorded outcomes**: filter completed/rejected groups and follow the actual calls, cache decisions and explained reply path. The illustrative walkthrough stays separate. **Try creating a real mapping** opens a bounded experiment for create/open, uniqueness, collision retry and cache loss; destinations never leave the page, and experiment data is not saved across leaving/reloading the level.

`scripts/verify-outcomes.mjs` and `scripts/verify-link-experiment.mjs` exercise these features in isolated browser contexts. Run them with the same Playwright runtime argument as the other browser checks.

The editor supports undo/redo and scoped keyboard deletion. Layout moves keep traffic recordings intact; behavioral edits invalidate them. `scripts/verify-edit-history.mjs` verifies these interactions using the same runtime argument.
