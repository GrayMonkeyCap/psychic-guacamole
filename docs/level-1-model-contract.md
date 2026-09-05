# Level 1 model and progress contract

Updated 5 September 2026. This documents implemented behavior, including limitations; it is not the target simulator described in the product backlog.

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
- The request inspector follows an illustrative supported operation, not a request captured from the aggregate traffic test.
- Identity strategies approximate allocation cost; no real keyspace or sampled collisions are simulated.
- The failure report selects the component rejecting the most user requests in the worst sample. It does not claim that this is the only cause; per-component/per-operation counts expose additional failures. Largest utilization is retained for heat, not used as the causal diagnosis.

The optional in-game **How tests are measured** panel exposes these boundaries. Request-level tracing, durable identity demonstrations and broader learner qualification remain open backlog work.

## Admission, fills and accounting

`src/trafficModel.js` batches all callers of a shared resource before admitting a proportional share. Ingress, API work, cache lookups, optional ID allocation, storage and optional fills execute as separate stages. A database's normalized budget combines reads and weighted writes; API generation strategies retain their declared compute costs. Cache lookups and fills share one budget, with lookups prioritized.

All cache callers see beginning-of-sample warmth. Only a completed origin read schedules a fill; only a fill admitted into the remaining cache capacity changes warmth for the next sample. The update is `1 - (1 - previousWarmth) * exp(-successfulFillsPerSecond * dt / 120)`. Skipped fills are counted separately and never retroactively fail a successful redirect. No single caller updates warmth while another is still being evaluated.

Every frame includes `accounting`: offered, completed, rejected, queued and timed-out **request counts for that sample**, plus read/write subtotals. Queued and timed-out counts are zero under the declared policy. Within floating-point tolerance, offered equals completed plus rejected. `outcomes` holds bounded terminal groups with operation, rate, visited resources and rejection location; these are not individual-request traces. `loads` and `edges` remain per-second rates. Inspector request rates exclude optional fills, which have their own counters.

Shared-cache node/edge ordering and 500 mixed-load simulation samples are covered by conservation tests. Synthetic storage unavailability is injected only in model tests; no outage editor or new gameplay mechanic is implied.

## Durable progress

Save schema is now **3**. The browser key remains `system-sandbox:first-level:v2` deliberately so existing boards are found without moving or deleting user data.

The save contains two separate collections:

- `history`: at most 12 recent run summaries, for attempt comparison.
- `certificates`: deduplicated passing summaries per design fingerprint, chapter and model/scenario versions. Failed attempts do not delete certificates. This collection is not trimmed with recent history.

Both the landing screen and level call `passedChapters` against the same certificate ledger. Editing component behavior requires a matching pass; restoring an already-certified behavior restores its certification. Historical first-link recognition is distinct from the current-design full contract.

Schema-2 migration accepts valid original `p99`-shaped summaries and renames that field. Unversioned legacy reports are bound to **frozen identifiers for the original simulator and scenarios**, never to whatever the current constants happen to be in a future release. Explicit older versions are preserved. Schema 3 does not silently reconstruct missing certificates from history or assume that unversioned evidence is current.

Migration can preserve only evidence that still exists. Passes already evicted by an older build cannot be recovered from no record. Certificates also consume storage; storage-failure recovery, portable backups and duplicate-tab conflict handling remain open work. The existing interface warns if browser storage cannot be written. Cross-device or account persistence is not provided.

## Verification for this slice

Run `npm test` and `npm run build`.

- Model tests preserve multiple winning architectures and deterministic estimates.
- Traffic tests cover upstream admission, stopped allocations, shared-resource budgets, successful-only fills, skipped optional fills, node/edge permutation invariance, zero demand, unavailable storage, recovery and rejection-based diagnosis.
- Progress tests cover 20 subsequent failures, reload, deduplication, alternate designs, behavioral versus geometry changes, version mismatch, original-save migration, malformed records and inclusive threshold boundaries.
- React static-render tests verify that the landing screen and level consume the same progress, show stale-rule notices, retain first-time entry, and use the new metric labels. These are not browser-interaction or assistive-technology tests.

No new browser interaction study, novice playtest or accessibility qualification is implied by these tests. The broader backlog readiness gate remains open.
