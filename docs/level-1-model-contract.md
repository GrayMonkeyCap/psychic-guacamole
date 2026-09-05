# Level 1 model and progress contract

Updated 6 September 2026. This documents implemented behavior, including limitations; it is not the target simulator described in the product backlog.

## Identity and compatibility

- `MODEL_VERSION` is currently `admission-v2`. Bump it when simulation, routing, validation, capacity, identity-policy or cache semantics change. Presentation-only changes do not require a bump. Existing `aggregate-v1` passes remain recorded but require a new run for current certification.
- `scenarioVersion(chapter)` identifies the chapter ID, peak traffic, read fraction, key concentration, duration and contract thresholds. Changing any of these automatically produces a different identifier. Changes to hardcoded ramp behavior or other unrepresented semantics require a model-version bump.
- `fingerprint(design)` captures node identities/types, tiers, API strategies and directed dependencies in a stable order. Position, array order and edge IDs do not change certification. This is an identity for an edited board, not a graph-isomorphism detector: rebuilding equivalent components with different node IDs requires a new run.
- Reports include both versions and the design fingerprint. A current pass requires all three to match and its recorded metrics to satisfy the contract. Do not relabel an old result as a current-model result.

## Measurement

Each core run advances in 0.2-second simulation steps, starts with cold caches and ramps from 8% to 100% of peak over five simulation seconds. The browser timer controls playback; throttled/background playback can take longer in wall-clock time. Explicit background behavior and deterministic stepping controls remain backlog work.

**Success:** The model admits proportional shares of read/write request groups at each resource. Only admitted work calls a dependency; every offered request group ends in completion or rejection. Invalid designs reject all offered requests before executing work. The passing threshold is at least 98% success in **every sample**, not 98% averaged over a run. Reports show the worst sample error. This game contract is not a production availability SLO.

**Estimated latency:** The model adds an 18 ms base plus a service estimate at each successfully visited resource: 14 ms for storage or 3 ms otherwise, plus up to 4 ms based on its admitted utilization. It orders successful path delays and selects the delay at the cumulative 99% point of **completed** demand. Frames store the rounded value as `estimatedLatencyMs`; no completions means `null`, never zero-latency success. Reports store the highest available estimate. The inclusive limit remains 300 ms. This is not a request-duration histogram. With the current no-queue policy, overload primarily appears as rejected work, not growing latency; do not claim that the level teaches queue-tail behavior yet.

**Cost:** Every placed component counts, even when it handles no work. The inclusive core limit is 900 game dollars/month. The efficiency target of 650 is an optional achievement, not a core correctness requirement. These costs and capacities are not provider prices or production-sizing advice.

`CONTRACT_RULES` and `meetsMetricContract` define shared thresholds for reports, certificates and the interface. Negative/nonfinite metric records cannot establish a pass. Passing also requires structural validation in the simulator. Local saved progress is not a tamper-proof competitive score or security boundary.

## Known abstractions that still need work

- This is a fluid cohort model: fractional request counts, no individual keys or packets, and instantaneous propagation between stages within a simulation sample.
- The explicit policy is **fail fast with zero queue capacity**. There is no delayed execution, retry, timeout or accumulated waiting backlog. A future queue mechanic must add conservation across samples, deadlines and meaningful latency before enabling it.
- Cache warmth approximates future reuse from successful fills. Key tracking, eviction, TTL and simultaneous-miss coalescing are not implemented.
- The illustrative walkthrough remains separate from the recorded-outcome inspector. Recorded paths describe actual aggregate cohorts; reply steps explain the synchronous call contract rather than packet timings.
- Traffic identity strategies approximate allocation cost; no real keyspace or sampled collisions are simulated under load. The separate bounded link experiment executes uniqueness checks against its own simulated table.
- The failure report selects the component rejecting the most user requests in the worst sample. It does not claim that this is the only cause; per-component/per-operation counts expose additional failures. Largest utilization is retained for heat, not used as the causal diagnosis.

The optional in-game **How tests are measured** panel exposes these boundaries. Individual request capture and broader learner qualification remain open backlog work.

## Admission, fills and accounting

`src/trafficModel.js` batches all callers of a shared resource before admitting a proportional share. Ingress, API work, cache lookups, optional ID allocation, storage and optional fills execute as separate stages. A database's normalized budget combines reads and weighted writes; API generation strategies retain their declared compute costs. Cache lookups and fills share one budget, with lookups prioritized.

All cache callers see beginning-of-sample warmth. Only a completed origin read schedules a fill; only a fill admitted into the remaining cache capacity changes warmth for the next sample. The update is `1 - (1 - previousWarmth) * exp(-successfulFillsPerSecond * dt / 120)`. Skipped fills are counted separately and never retroactively fail a successful redirect. No single caller updates warmth while another is still being evaluated.

Every frame includes `accounting`: offered, completed, rejected, queued and timed-out **request counts for that sample**, plus read/write subtotals. Queued and timed-out counts are zero under the declared policy. Within floating-point tolerance, offered equals completed plus rejected. `outcomes` holds bounded terminal groups with operation, rate, visited resources and rejection location; these are not individual-request traces. `loads` and `edges` remain per-second rates. Inspector request rates exclude optional fills, which have their own counters.

Shared-cache node/edge ordering and 500 mixed-load simulation samples are covered by conservation tests. Synthetic storage unavailability is injected only in model tests; no outage editor or new gameplay mechanic is implied.

## Recorded paths and the link experiment

Frames with `evidenceVersion: 1` record each terminal cohort's actual dependency calls and cache hit/miss decisions. `traceOutcome` consumes those calls; it never chooses a different API by traversing the graph. Sibling dependency calls return to their caller before the next call is displayed, so a cache miss visibly returns to the API before an API-to-database lookup. A rejected allocator cannot show a durable save. Every reply reverses a recorded connection, and failed paths end in failure rather than a success response.

Players inspect outcomes while paused or after a test, filter completion/rejection, and select paths for the actual API replica. Resuming traffic, scrubbing to a different sample or changing the design clears the displayed trace. The inspector distinguishes recorded aggregate evidence from the older illustrative walkthrough. Optional cache fills remain sample-level counters, not invented per-request events. Recordings are session-local; saving/exporting full recordings remains backlog work. This evidence-only addition does not change model results or invalidate `admission-v2` certificates.

**Try creating a real mapping** opens an optional 20-link behavior experiment. It calls a selected reachable API directly, bypassing ingress/edge routing and capacity simulation; this is disclosed in the panel. API strategies choose database-sequence, seeded toy-random or dedicated-service candidates. A per-database uniqueness check retries occupied candidates without overwriting existing mappings; success follows insertion. Random mode can deliberately reuse one code so the protection is observable. Its toy generator is not a security-grade generator and is not evidence about production collision rates.

Opening a code checks the connected memory cache, then the shared database on a miss. Only a found mapping populates cache. Clearing copies preserves the table; APIs sharing the same primary can read each other's links. Rewiring to another database does not expose the previous database's cached entries. Missing mappings produce a not-found result, not a fabricated redirect.

The simulated durable table is held in memory for this experiment: it survives panel close/reopen and cache clearing, but resets when the player leaves/reloads the level. It is not browser-durable storage. URLs are rendered as text, never fetched or navigated to, never included in the level save, and never sent to analytics. Only HTTP(S) destinations without credentials are accepted. Resetting experiment data requires confirmation and cannot alter the architecture or earned passes.

## Durable progress

Editor history holds up to thirty in-session design snapshots with undo/redo. Geometry-only operations preserve current recordings, scrubbing and traces; behavioral edits invalidate them. Undoing a behavioral edit restores certification when a matching certificate exists, but does not resurrect discarded run frames. Pointer drags form one history step. New edits clear the redo branch, while no-op edits do not. Delete operates on the focused component/connection only; text fields and dialogs do not invoke board shortcuts.

Save schema is now **3**. The browser key remains `system-sandbox:first-level:v2` deliberately so existing boards are found without moving or deleting user data.

The save contains two separate collections:

- `history`: at most 12 recent run summaries, for attempt comparison.
- `certificates`: deduplicated passing summaries per design fingerprint, chapter and model/scenario versions. Failed attempts do not delete certificates. This collection is not trimmed with recent history.

Both the landing screen and level call `passedChapters` against the same certificate ledger. Editing component behavior requires a matching pass; restoring an already-certified behavior restores its certification. Historical first-link recognition is distinct from the current-design full contract.

Schema-2 migration accepts valid original `p99`-shaped summaries and renames that field. Unversioned legacy reports are bound to **frozen identifiers for the original simulator and scenarios**, never to whatever the current constants happen to be in a future release. Explicit older versions are preserved. Schema 3 does not silently reconstruct missing certificates from history or assume that unversioned evidence is current.

Migration can preserve only evidence that still exists. Passes already evicted by an older build cannot be recovered from no record. Versioned portable JSON backups preserve the board/settings/certificates, exclude session experiment data and traffic frames, and accept raw schema-2/3 saves. Imports are size-limited, validated, previewed and explicitly confirmed.

Participating tabs coordinate compare-and-write using the browser Web Locks API. A stale tab pauses autosave and retains its local board; explicit conflict resolution can load the saved copy or replace it after saving a recovery checkpoint. A source changed since review aborts the replacement. Changed autosaves checkpoint the previous valid save, while no-op writes do not discard recovery. Unknown/corrupt primary data is not automatically overwritten; explicit replacement first preserves its original bytes under `system-sandbox:first-level:protected-original`. Recovery and protected-original slots each retain only their latest copy; download files for durable branches.

Unavailable storage or Web Locks disables automatic writes, displays an unsaved warning and leaves file export usable. Restoring requires successful checkpoint/primary writes. A retry action is available; keep the tab open or export before leaving while unsaved. The coordination protocol cannot constrain older builds or outside scripts that ignore its lock. Clearing browser data removes all browser-local slots. Cross-device/account persistence, browser-crash guarantees and automatic conflict merging are not provided.

## Verification for this slice

Run `npm test` and `npm run build`.

- Model tests preserve multiple winning architectures and deterministic estimates.
- Traffic tests cover upstream admission, stopped allocations, shared-resource budgets, successful-only fills, skipped optional fills, node/edge permutation invariance, zero demand, unavailable storage, recovery and rejection-based diagnosis.
- Progress tests cover 20 subsequent failures, reload, deduplication, alternate designs, behavioral versus geometry changes, version mismatch, original-save migration, malformed records and inclusive threshold boundaries.
- React static-render tests verify that the landing screen and level consume the same progress, show stale-rule notices, retain first-time entry, and use the new metric labels. These are not browser-interaction or assistive-technology tests.
- Evidence tests cover actual replica selection, cache hit/miss semantics, allocation rejection, successful persistence ordering, edge hits, real reverse connections and unsupported evidence versions.
- Link experiment tests cover every allocation strategy, cache loss, collision retry, shared-primary visibility, database changes, invalid input, missing mappings and the bounded table.

`scripts/verify-outcomes.mjs` checks pause/resume, filters, recorded miss/hit paths, scrubbing, editing invalidation and actual rejection feedback in an isolated browser context. `scripts/verify-link-experiment.mjs` checks create/open, cache loss, collision protection, modal focus, close/reopen, reset confirmation and absence of URL requests/persistence. Both check mobile overflow. Pass the bundled Playwright package directory as their argument, as with the existing browser scripts.

108 unit/static-render tests pass as of 6 September 2026; the production build succeeds. Additional browser scripts cover edit history, connection previews, contextual help, portable backups and two-tab/blocked-storage behavior. These checks do not establish novice learning, full assistive-technology access or comprehensive visual QA. The broader backlog readiness gate remains open.
