# Level 1 model and progress contract

Updated 5 September 2026. This documents implemented behavior, including limitations; it is not the target simulator described in the product backlog.

## Identity and compatibility

- `MODEL_VERSION` is currently `aggregate-v1`. Bump it when simulation, routing, validation, capacity, identity-policy or cache semantics change. Presentation-only changes do not require a bump.
- `scenarioVersion(chapter)` identifies the chapter ID, peak traffic, read fraction, key concentration, duration and contract thresholds. Changing any of these automatically produces a different identifier. Changes to hardcoded ramp behavior or other unrepresented semantics require a model-version bump.
- `fingerprint(design)` captures node identities/types, tiers, API strategies and directed dependencies in a stable order. Position, array order and edge IDs do not change certification. This is an identity for an edited board, not a graph-isomorphism detector: rebuilding equivalent components with different node IDs requires a new run.
- Reports include both versions and the design fingerprint. A current pass requires all three to match and its recorded metrics to satisfy the contract. Do not relabel an old result as a current-model result.

## Measurement

Each core run advances in 0.2-second simulation steps, starts with cold caches and ramps from 8% to 100% of peak over five simulation seconds. The browser timer controls playback; throttled/background playback can take longer in wall-clock time. Explicit background behavior and deterministic stepping controls remain backlog work.

**Success:** The model bounds a path's success by its most constrained resource, sums estimated successful path demand, and divides by incoming demand. Invalid designs receive 100% error. The passing threshold is at least 98% success in **every sample**, not 98% averaged over a run. Reports show the worst sample error. This game contract is not a production availability SLO.

**Estimated latency:** The model adds an 18 ms base and estimated resource service/queue delays along each request path. It orders those path delays and selects the delay at the cumulative 99% point of offered demand. Frames store this value, rounded to milliseconds, as `estimatedLatencyMs`; reports store the highest frame estimate under the same name. The contract compares that rounded estimate to an inclusive 300 ms limit. It is not a histogram of individual request completion times and must not be labelled as measured p99.

**Cost:** Every placed component counts, even when it handles no work. The inclusive core limit is 900 game dollars/month. The efficiency target of 650 is an optional achievement, not a core correctness requirement. These costs and capacities are not provider prices or production-sizing advice.

`CONTRACT_RULES` and `meetsMetricContract` define shared thresholds for reports, certificates and the interface. Negative/nonfinite metric records cannot establish a pass. Passing also requires structural validation in the simulator. Local saved progress is not a tamper-proof competitive score or security boundary.

## Known abstractions that still need work

- Demand downstream is based on offered upstream work, including work that an overloaded upstream node would reject. It is not admission-controlled or conserved end to end.
- Queue pressure accumulates and drains as a bounded scalar; queued operations are not executed as a conserved backlog.
- Cache warmth grows from offered reads, not confirmed successful fills. Shared-cache evaluation order needs dedicated investigation.
- The request inspector follows an illustrative supported operation, not a request captured from the aggregate traffic test.
- Identity strategies approximate allocation cost; no real keyspace or sampled collisions are simulated.
- Highest utilization is a diagnostic heuristic, not proof of the causal source of a failed request.

The optional in-game **How tests are measured** panel exposes these boundaries. Backlog L1-001–003 and L1-005–008 remain necessary; renaming a metric does not resolve these simulation problems.

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
- Progress tests cover 20 subsequent failures, reload, deduplication, alternate designs, behavioral versus geometry changes, version mismatch, original-save migration, malformed records and inclusive threshold boundaries.
- React static-render tests verify that the landing screen and level consume the same progress, show stale-rule notices, retain first-time entry, and use the new metric labels. These are not browser-interaction or assistive-technology tests.

No new browser interaction study, novice playtest or accessibility qualification is implied by these tests. The broader backlog readiness gate remains open.
