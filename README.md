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

For a complete production-build check in one command (installed Playwright + Microsoft Edge required):

```bash
npm run verify -- --runtime /path/to/node_modules
```

Omit `--runtime` if Playwright is installed in this repository, or set `PLAYWRIGHT_NODE_MODULES`. The runner checks dependencies, runs unit/component tests, builds production assets and exercises all 17 browser scripts against its own localhost preview on port 5181. It stops on the first failure and exits nonzero; it never downloads dependencies or stops an existing server. Use `--port 5182` if occupied. Its preview is closed on success, failure or interruption; the player's running development preview and browser profile are not used. Screenshots go to a unique ignored `.test-artifacts/verify-*` directory.

`--suite smoke` explicitly selects six browser checks (campaign, connections, backups, concurrent saves, text navigator and playback), plus all unit tests/build; it is not the full release check. `--help` lists options. Allow several minutes for the full suite. Automated checks do not establish accessibility conformance or learning outcomes.

`node scripts/balance-audit.mjs` reproduces the [representative design-balance audit](docs/level-1-balance-audit.md): seven topology families, all supported tiers/strategies, exact versioned outcomes and a finite cost/error/latency frontier. It prints JSON only; model regression tests check the published snapshot. This is simulator evidence, not production sizing or proof of learning.

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

Starting a wire opens a service-call planner with request/reply explanations and invalid-target reasons. Components can also be moved using **Move without dragging**, then clicking/tapping an empty board position. `scripts/verify-connections.mjs` covers both flows.

**Give me a nudge** opens a contextual question/evidence/experiment ladder. It uses the actual validation issue, budget or rejected-operation evidence and never cycles through a fixed topology recipe. `scripts/verify-help.mjs` verifies staged disclosure, dismissal and state changes.

**Save backups & restore** downloads/imports versioned JSON files entirely on-device. Imports are validated and previewed before confirmation; restoring keeps a downloadable recovery copy. The recovery slot can rescue a corrupt primary save. Backups include the board and pass ledger, not session link destinations or traffic frames. `scripts/verify-backups.mjs` checks export/import, cancellation, recovery, reload and modal focus.

Concurrent tabs use Web Locks to avoid silent last-writer overwrites. A conflicting tab keeps its board and pauses autosave until you explicitly choose a copy in the backup panel. Missing storage/locking shows **Unsaved** and keeps file export available. `scripts/verify-save-conflicts.mjs` tests real two-tab edits, recovery, future-format protection and blocked writes. Use localhost or HTTPS for safe browser storage APIs.

Component inspectors explain **Receives / Returns**, with **State, limits & alternatives** available in place. Explanations follow the current API strategy and distinguish connected-but-unused ID services. `scripts/verify-component-contracts.mjs` checks all component types, keyboard disclosure, strategy updates and compact layouts.

After passing, **Explain this pass** opens an optional inspector recap of the chosen trade-offs and remaining limits. It links to actual recorded creation/redirect groups and credits cache benefits only when evidence supports them. `scripts/verify-completion-recap.mjs` checks the completed-run flow, trace focus, board selection and unchanged certificates.

Capacity cards now select a **preview**, with explicit **Apply** and **Cancel**. Compare cost, whole-board budget and shared capacity limits before changing behavior. `scripts/verify-capacity-preview.mjs` checks that previews preserve recordings/saves and applied edits support undo/redo. The full playthrough accepts an optional screenshot directory as a third argument (for example `.test-artifacts`) to keep generated QA images separate from checked-in artifacts.

**Review connection issues** lists each structural cause and focuses the relevant component, where the same warning is explained locally. Repairs remove stale warnings immediately; valid alternate allocation strategies remain valid. `scripts/verify-structure-review.mjs` covers keyboard selection, focus, non-mutating inspection and compact layouts.

**System list** opens a text navigator while keeping the board visible. Inspect uniquely named replicas and service calls, start wiring through the planner, or read paused/stopped sample admissions and rejections. `scripts/verify-system-navigator.mjs` builds a replicated graph through keyboard-activated list controls and verifies focus, disconnect/undo and compact layouts. This is accessibility progress, not a conformance claim.

**Animate traffic paths** controls particles independently of simulation and evidence. Browser-local preference is remembered when possible; the OS reduced-motion setting overrides animation and is observed live. `scripts/verify-traffic-motion.mjs` checks actual canvas motion/freeze, continued samples, unchanged results and reduced-motion changes during an illustrative trace.

**Playback speed** offers 1×/2×/4× without changing the fixed simulation samples. Pause to **Step 0.2s**; hidden tabs pause and require explicit resume. `scripts/verify-playback.mjs` checks exact stepping, final-step focus, matching results at different speeds, cold-start full-contract transitions, the visibility-event fixture and mobile controls. `src/playback.test.js` compares every generated frame/report with the canonical simulator.
