# The little link: first-level redesign

**Implementation update, 5 September 2026:** The original rationale below describes the initial redesign. The follow-up trust slice renames the path-based “estimated p99” to **estimated latency** and separates versioned certificates from recent history. See the [current model/progress contract](level-1-model-contract.md) for exact semantics, migration behavior and remaining limitations.

## Product judgment

The strongest version of this idea is a system-design puzzle with observable consequences. The player constructs an explanation of how a request succeeds, tests it under pressure, then revises that explanation. The game should reward identifying unnecessary work, locating bottlenecks, and choosing tradeoffs. A diagram that merely turns green when prescribed boxes are present cannot deliver that experience.

This redesign preserves the clay HUD and planar playing field. It replaces the old monolithic test with three deliberately paced challenges. This is a researched design hypothesis and a tested implementation, not evidence that the first level is “perfect.” That requires novice playtesting.

## What the prototype got right—and what needed replacement

The visual identity, draggable board, traffic animation, budget, and campaign framing provide a useful foundation. The earlier engine and teaching flow undermined them:

- Required node types imposed one answer, including a mandatory ID generator.
- Capacity was pooled across reachable component types. Wiring did not consistently determine which replica actually handled work.
- A constant cache hit rate hid cold starts and the reason repeated traffic benefits from caching.
- The cache-to-database link taught a read-through abstraction while describing a Redis-style cache-aside architecture.
- Adding a queue granted a performance benefit without representing its consumer or a concrete analytics requirement.
- Three consecutive waves left little time to identify and repair an unfamiliar system.
- The first palette introduced seven components at once. Small labels and a generic failure screen gave novices little evidence about their decisions.
- A resilience star and comparative “ghost” price implied replication and population data that the model did not possess.

## Research that shaped the implementation

**Let players reason about a growing network.** Dinosaur Polo Club describes Mini Motorways in terms of drawing roads, managing increasing demand, and upgrading the network. Its traffic-management premise supports the broad build–observe–revise direction. Our inference: repeatable workloads are more useful than endless random growth for a first lesson about identifying a specific bottleneck. [Developer’s game description](https://dinopoloclub.com/games/mini-motorways/).

**Teach through construction, but keep the representation honest.** Turing Complete’s store description centers constructing circuits and learning by building. Our adaptation is to make a single request inspectable before testing many requests. HTTP/RPC calls require an explicit reply model; they do not behave like continuously driven logic wires. [Official store page](https://store.steampowered.com/app/1444480/Turing_Complete/).

**Reveal complexity in stages.** NN/g recommends presenting essential choices first and making less common options available on demand. The first workbench shows API and database; later challenges foreground cache, balancer, and edge. “Show all tools” lets experienced players access the complete first-level palette. Component guides remain optional. [Progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/).

**Make consequences visible and recovery easy.** NN/g’s heuristics call for visible system state, user control, recognition, and useful error recovery. The implementation provides per-node load, a read/write legend, pause, undo, a scrubbed recording, and an error explanation tied to a specific node. Invalid connections explain the service contract. [Usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/).

**Evaluate the puzzle, not just its interface.** Jolie Menzel’s GDC session overview emphasizes refining and evaluating puzzles to avoid frustration. Elyot Grant’s overview emphasizes deliberate puzzle construction techniques. These overviews informed the review lens, not claims about having watched the complete talks. We test multiple successful architectures, a useful initial failure, and fair replays. [Solving Puzzle Design](https://gdcvault.com/play/1023139/Level-Design-Workshop-Solving-Puzzle), [30 Puzzle Design Lessons](https://www.gdcvault.com/play/1027306).

**Model cache-aside correctly.** The application checks cache, fetches from the primary on a miss, and fills cache. This requires two API dependencies, not a cache that magically calls storage. Hit rate depends on the workload and warmed entries. [Microsoft architecture pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside), [Redis cache-aside](https://redis.io/docs/latest/develop/use-cases/cache-aside/).

**Require uniqueness, not a dedicated allocator.** PostgreSQL documents that identity columns use an implicit sequence, and that an identity column alone does not enforce uniqueness. The game makes sequences an API strategy and specifies a UNIQUE constraint on storage. Random-code retries and an optional ID service provide alternative allocations. [PostgreSQL identity columns](https://www.postgresql.org/docs/current/ddl-identity-columns.html).

## The playable first level

| Challenge | Workload | Discovery | Player can respond by… |
| --- | --- | --- | --- |
| First link | 100 req/s; 80% reads | Logic, unique code, durable mapping, request/reply | Connecting an API and database; choosing an ID strategy |
| Going viral | 2,400 req/s; 98% reads; 92% hot-link reads | Repeated work and independent bottlenecks | Caching, upgrading storage/compute, balancing API replicas, or adding an edge |
| Opening day | 1,400 req/s; 85% creations | Cache cannot replace durable writes | Resizing storage, moving allocation work, and comparing strategies |

Each test lasts 12–16 seconds, ramps for five seconds, and starts with cold caches. A challenge passes with at least 98% estimated success in every sample, estimated p99 at most 300 ms, and cost at most $900. The limits are visible before testing. Editing preserves unlocked challenges but requires the modified design to re-earn its passing results. A complete contract run checks all three workloads against one unchanged architecture.

One star recognizes a working first link; two recognize a design passing all challenges; three add a published $650 efficiency target. This is a fixed game target, not a fabricated community percentile. There is no resilience award without a real failure/replication model.

Independent valid designs are covered in tests: large API + database with sequence allocation; API random codes with cache-aside; and dedicated allocation. A two-replica balanced variant also succeeds. These are test fixtures, not solutions exposed to the player.

## Simulation boundaries

`levelModel.js` is the canonical model. It computes **offered workload** along directed service dependencies. Each API branch has its own capacity, while shared dependencies accumulate their callers’ demand. Database utilization adds normalized reads and writes; queues grow above capacity and drain below it. Path success is bounded by its most constrained resource, and estimated latency includes resource service and queue time.

This is a deterministic teaching approximation, not a discrete-event network simulator or production sizing tool. In particular:

- Downstream offered demand is not reduced by upstream admission or cancellation. Response backpressure and retry storms are not modeled.
- Cached popularity and warming are aggregate approximations. TTL, eviction traces, invalidation races, and stampedes are deferred. Every test resets caches.
- Random allocation uses a small fixed retry budget; it does not sample real collisions or model namespace occupancy.
- Capacity, monthly prices, and allocation CPU/DB coefficients are deliberately balanced game units. Estimated p99 is derived from weighted paths, not a histogram of individual requests.
- A trace is explicitly an illustrative single request based on the same graph and configured strategy. It is not a sampled packet captured from the aggregate model.
- All APIs use one shared primary. Independent databases are rejected with an explanation because replication and partition routing are not implemented.
- Links are public and immutable. Authentication, edits, expiry, abuse protection, security properties of short codes, and geographical latency are outside this lesson.

These boundaries should remain visible in documentation and component explanations. Increasing fidelity is useful only where it changes a choice the player can understand.

## Options considered and next improvements

| Direction | Decision |
| --- | --- |
| Full 3D or literal factory | Keep the useful clay presentation; use a clear 2D graph for tracing dependencies. |
| Forced recipe tutorial | Use action-sensitive guidance and a first success. Make deeper hints optional. |
| Completely blank, fully exposed expert sandbox | Retain open placement and all-tools access, but use a small initial palette. |
| Persistent random traffic | Defer until the player can interpret deterministic tests. Later add named workload variants and seeded challenges. |
| Analytics queue | Move to a lesson with an explicit analytics requirement, worker, backlog, and delivery policy. |
| High availability stars | Move to a lesson with real replication, failure injection, and recovery semantics. |
| Request trace versus live packets | Provide both, but label trace as illustrative and live edges as aggregate operations. |
| More code strategies | Later add hash/dedup policies, allocated ranges, distributed IDs, and namespace occupancy when those tradeoffs are playable. |
| Replay incentives | Ship local comparisons and a fixed efficiency target. Later offer cold-start, shuffled keys, stricter latency, and low-cost contracts. |
| Social leaderboards | Defer until server verification and honest comparability exist. |

## Playtest gate before calling the design successful

Run observed sessions with at least five newcomers and a few practicing engineers. Record time to the first completed request, invalid-wire attempts, voluntary trace use, time to explain the viral bottleneck, independent solutions, and whether players replay without prompting. Ask players to predict what changes when reads become writes **before** the third test. Check whether they can explain why an ID service is optional and why replies need no reverse wire.

The important next iteration is based on those observations. If newcomers cannot explain a failure, simplify the feedback or lesson sequence before adding more services. If experienced players find one dominating design, introduce a clear workload tradeoff rather than a hidden rule that bans their solution.
