# Level 1: representative design-balance audit

6 September 2026 · model `admission-v2` · game budget 900 · L1-017

## Finding

The sandbox supports multiple answers: all seven tested architecture families have passing designs, and direct origin, origin cache and edge cache each have nondominated examples. A cache or dedicated ID service is **not required** to pass. However, the ID service has no cost/error/latency frontier example in this grid. Balanced replicas and two cache layers can pass, but do not reach this frontier either. These are limitations to teach honestly and investigate, not reasons to force extra components into the contract.

This is a finite simulator audit, not a global optimum, production benchmark, or evidence of learner comprehension. Costs are game units and latency is a modeled estimate.

## Reproduce

Run `node scripts/balance-audit.mjs` from the repository root. It prints JSON without modifying files. The checked-in [snapshot](level-1-balance-audit.json) records exact metrics, options, model version, scenario identities, frontier and counts. `src/balanceAudit.test.js` reproduces the snapshot and checks fixture validity, alternate solutions and dominance rules. A deliberate balance/model change requires reviewing this audit, not blindly updating a snapshot.

## Method and boundary

Enumerate direct origin, API-side shared cache, edge cache, both caches, balanced APIs, balanced APIs plus shared cache, and balanced APIs plus edge. For every family, vary every relevant component across all three tiers. Balanced designs have two APIs, including unordered asymmetric tier pairs. All APIs within one candidate use the same allocation strategy: database sequence, random API codes, or dedicated service. Service candidates additionally enumerate all three allocator tiers. Every API uses one shared database; the optional API cache is shared. No unused components are added.

Validate every candidate. Exclude over-budget designs before running traffic. Test all three canonical challenges independently from cold state using the existing fixed-sample simulator. Passing means satisfying the published contract in **each** challenge, not zero rejected requests.

The frontier includes passing candidates for which no tested passing candidate is at least as good in cost, all three worst-sample rejection percentages and all three peak estimated latencies, and strictly better in at least one. Comparison tolerance is 1e-9. Identical metric vectors are retained as alternate architectures/strategies; unique metric-point counts use six decimal places. This does not include complexity, recovery, security, reliability under faults or other unmodeled dimensions.

Not enumerated: arbitrary graphs, more than two APIs, mixed allocation strategies, per-replica caches, every combination of edge/balancer/cache, redundant components, custom traffic, queues, retries, faults or warm-start tests. Counts are coverage of this grid, not probabilities of a strategy succeeding.

## Results

2,610 candidates enumerated; 1,980 excluded over budget; **630 tested; 144 pass all three challenges**. Nine candidates occupy seven distinct frontier metric points. The cheapest passing example in each family is below. Latencies are first / viral / opening; rejection is the highest sample percentage across the three challenges, rounded here only. Exact values are in the JSON.

| Family | Tested / passing | Cheapest passing configuration | Cost | Estimated latency (ms) | Worst rejection |
| --- | ---: | --- | ---: | --- | ---: |
| Direct origin | 43 / 12 | Medium API, medium DB, random | 445 | 35 / 43 / 41 | 1.189% |
| Origin cache | 102 / 25 | Medium API, medium DB, small cache, random | 540 | 38 / 45 / 44 | 0% |
| Edge cache | 73 / 14 | Medium API, medium DB, small edge, random | 595 | 38 / 42 / 46 | 0% |
| Edge + origin cache | 111 / 17 | Medium API, medium DB, both small caches, random | 690 | 41 / 44 / 49 | 0% |
| Balanced APIs | 107 / 28 | Two small APIs, medium DB, small balancer, random | 560 | 38 / 49 / 46 | 1.189% |
| Balanced + shared cache | 127 / 33 | Two small APIs, medium DB, small balancer/cache, random | 655 | 42 / 51 / 49 | 0.478% |
| Balanced + edge | 67 / 15 | Two small APIs, medium DB, small balancer/edge, random | 710 | 42 / 45 / 50 | 0% |

| Allocation strategy | Tested / passing | Frontier candidates | Cheapest passing example |
| --- | ---: | ---: | --- |
| Database sequence | 165 / 45 | 2 | Medium API/DB + small cache, cost 540 |
| Random API codes | 165 / 58 | 7 | Medium API/DB, cost 445 |
| Dedicated service | 300 / 41 | 0 | Medium API/DB + medium allocator, cost 550 |

Service candidates have additional tier variants and different budget exclusions; do not compare these ratios as success rates. Grouping candidates by identical non-allocator hardware yields **zero** configurations for which only the dedicated service passes. This does not mean that an allocator can never have advantages outside this model or grid.

## Product decisions and follow-up

- Preserve the legitimate 445-cost direct random-code solution. Its worst rejection is within the published 2% limit. Do not label a passing system as missing a cache or ID generator.
- Explain the actual cache trade-off: the 540-cost origin-cache example removes rejections for these workloads at +95 cost and an extra-hop latency penalty. More components need not make every metric better.
- Keep the current base contracts stable. An optional zero-rejection target could encourage a meaningful replay without retroactively invalidating a pass; validate its discoverability and comprehension before treating it as a learning win.
- Present allocator separation as an architectural choice with a dependency/cost, not a free scalability upgrade. Consider a focused experiment with measured benefits before expanding its role. Do not imply unmodeled failover benefits for API replicas.
- Keep exact solutions in developer evidence, not unsolicited novice hints. Use player-selected comparisons to expose trade-offs without prescribing topology.
- Continue L1-033/034 (safe branches and fair comparison) and L1-052 (one-command verification). This audit completes representative enumeration, but does not complete balance research, expert review, or the learner-study readiness gate.

The initial three-design table in the product backlog is historical, before the causal admission-model changes. Use this versioned audit for current balance decisions.
