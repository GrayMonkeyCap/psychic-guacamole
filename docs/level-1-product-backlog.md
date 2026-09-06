# Level 1 product backlog: learn by building, breaking, and explaining

**Product:** System Sandbox · **Level:** The little link (URL shortener)  
**Date:** 5 September 2026 · **Status:** Prioritized proposal, not an implementation log  
**Decision:** Do not create additional playable levels until Level 1 passes the readiness gate in this document. The three existing traffic challenges are stages of this one level, not permission to expand the campaign.

## 1. The product we are trying to make

> Build systems. Send traffic. Watch them break. Learn why.

The strongest version of this idea is an understandable, manipulable system: a player makes a hypothesis, builds something, sees consequences, changes their mind, and wants another attempt. A pretty diagram that turns green is not enough. Neither is a textbook interrupted by wiring exercises.

**North star:** After playing, a learner can build a working URL shortener, explain a request and its response, diagnose an unfamiliar traffic failure, and justify a design trade-off without copying a prescribed topology.

“Best ever” is an ambition, not an evidence-backed claim today. The current implementation has a promising interaction model and automated verification, but no completed learner study establishes comprehension, retention, transfer, or superiority over a conventional tutorial. This backlog is a comprehensive opportunity map, not a claim to enumerate every imaginable feature. Most items should not ship until their value is demonstrated.

### Preserve these foundations

- The clay-like HUD, warm palette, and approachable personality around a legible **2D playing field**.
- Open-ended construction: more than one viable solution, optional components, and meaningful configuration choices.
- Direct manipulation, visible traffic, reversible decisions, and fast feedback.
- A small, coherent URL-shortener problem, with deeper experiments inside it.
- Discovery and competence as the reward. Failure should expose a cause, not punish exploration.

### Product boundaries

Primary audience: curious beginners with a basic idea of a browser and a website, but no system-design training. Experienced engineers are a secondary audience and technical-validity reviewers; their speed is not the novice benchmark.

Level 1 teaches a small set of transferable models. It does **not** certify production readiness or teach all distributed systems. Capacity units, deployment cost, and timing are game abstractions. Replication protocols, consensus, security engineering, deployment operations, and real-world sizing remain outside the core contract.

Do not add new levels, compulsory quizzes, account creation, leaderboards, a campaign currency, streak penalties, or decorative 3D work as substitutes for improving the learning loop. Do not force an ID generator, cache, or load balancer into every passing solution merely because the component exists.

## 2. Audit of what exists

Audit basis: `src/FirstLevel.jsx`, `src/levelModel.js`, `src/levelModel.test.js`, campaign components, browser verification scripts, and [the existing design rationale](first-level-design.md). Observations below distinguish implementation facts from hypotheses requiring reproduction or player research.

| Area | Current strength | Gap or risk |
| --- | --- | --- |
| Sandbox | Configurable API, database, cache, load balancer, ID service, and edge cache; multiple valid graphs | A valid graph and green test do not establish conceptual understanding |
| Contracts | First link, Going viral, Opening day; read/write mix and hot-key demand; deterministic tests | Only three fixed workloads; limited evidence that choices create interesting trade-offs |
| Connections | Typed dependencies, automatic responses, request tracing, cache-aside rules | Traces illustrate a selected path; they are not captured requests from the aggregate simulation |
| Simulation | Capacity, cache warming, approximate latency, overload and recovery | Downstream demand uses offered traffic even when upstream rejects it; queue state is not a conserved backlog of executed work |
| Cache | Misses can reach storage and cache warmth changes over time | Warmth increases from offered reads before downstream success is known; shared-cache update order needs a dedicated reproduction test |
| Metrics | Success/error feedback, timeline, cost and contract thresholds | The displayed p99 is an estimate from path latency, not a percentile of measured requests; pass criteria use worst sample error rather than a request-weighted SLI |
| Identity | Sequence, random codes, and dedicated ID service are accepted alternatives | No request-level key store demonstrating actual uniqueness, collisions, or durable mappings |
| Guidance | First-run welcome, contextual coach, component guides and failure hints | No tested learning progression, explanation assessment, or delayed transfer evidence; hints are largely static |
| Editor | Pointer placement, click connections, keyboard movement and undo | No redo or design branches; geometry edits have inconsistent effects on retained run evidence |
| Persistence | Local save validation and campaign resume | One slot; rolling history retains 12 summaries and also supplies certification, so sufficiently old passes can disappear; no simulation-version binding |
| Accessibility | Some keyboard controls and responsive layouts | Small type and ports need an audit; no equivalent textual graph/traffic view; conformance has not been established |
| Verification | Model tests and browser playthrough scripts cover important flows | Automated interaction success is not proof of accurate mental models or a fun game |

### A concrete balance finding

A read-only model experiment during this audit ran all three current contracts against three designs. These are current-model results, **not production benchmarks or exhaustive balance results**.

| Design | Game cost | All three contracts | Rounded peak estimated p99: first / viral / opening |
| --- | ---: | --- | --- |
| Large API + large database, database sequence | 810 | Pass | 35 / 36 / 36 ms |
| Medium API + medium database + small cache, random codes | 540 | Pass | 38 / 44 / 43 ms |
| Same cached design, dedicated medium ID service instead of random codes | 645 | Pass | 38 / 44 / 43 ms |

Multiple solutions already work: protect that. However, the two cached fixtures give the same rounded latency outcomes at different costs. This does not prove the ID service is globally dominated; it does show that these contracts do little to communicate its possible benefit. Investigate observable trade-offs before adding more components or manufacturing a requirement for an ID service.

## 3. Learning contract

The game must teach causal relationships, not component-name memorization. Each objective needs an observable action and an explanation or prediction that a lucky build alone cannot satisfy.

| Objective | A learner should be able to… | Evidence within this level | Misconception to detect |
| --- | --- | --- | --- |
| O1 · Request lifecycle | Follow a create request, a redirect, and their replies | Trace both operations and identify where the response returns | “I need a second wire for every reply” |
| O2 · Durable identity | Explain code allocation, uniqueness enforcement, and storing the mapping | Create a link, look it up, and explain what survives losing a cache | “An ID service is always required” / “a cache is permanent storage” |
| O3 · Workload | Predict the effect of read/write mix and hot versus scattered keys | Compare two traffic profiles with the same total rate | “Equal RPS means equal work” |
| O4 · Cache behavior | Explain hits, misses, warming and storage fallback | Observe one miss/fill and a later hit; explain a cold-cache run | “Adding cache accelerates every request” |
| O5 · Capacity | Locate the cause of a failed user operation | Use a failed trace and demand/capacity evidence to choose an edit | “The reddest component is always the root cause” |
| O6 · Scaling | Distinguish scaling an API from relieving a shared dependency | Predict and test an extra API behind a load balancer | “More API replicas always solve overload” |
| O7 · Trade-offs | Justify cost, latency and reliability choices against a contract | Compare two viable designs and identify when each is preferable | “There is one universally best architecture” |
| O8 · Transfer and limits | Apply the model to unseen traffic and state what the game omits | Repair an unfamiliar same-level workload without a solution hint | “Passing this simulation proves production readiness” |

O1–O5 are essential for the first successful play session. O6–O8 are essential for graduating the full level. Optional challenges must not conceal missing core teaching.

## 4. Evidence informing the backlog

These sources guide design; none independently validates this product. Recommendations specific to System Sandbox below are product hypotheses unless backed by the local audit.

| Source | Relevant evidence or principle | Application and limitation |
| --- | --- | --- |
| [IES: Organizing Instruction and Study to Improve Student Learning](https://ies.ed.gov/ncee/wwc/PracticeGuide/1) | The guide rates retrieval/re-exposure and deep explanatory questions strongly; spacing, worked-example interleaving and visual/verbal integration moderately; pre-questions minimally | Test short prediction/explanation interactions and faded examples. Do not claim that requiring predictions is proven to make this game effective |
| [Ryan, Rigby & Przybylski: The Motivational Pull of Video Games](https://www.rochester.edu/warner/lida/wp-content/uploads/2022/11/02bfe513dd59366750000000.pdf) | Across four studies, perceived competence and autonomy were associated with enjoyment and preferences | Keep choices real, controls understandable and feedback actionable. This is not a guarantee that a particular reward mechanic causes learning |
| [CAST Universal Design for Learning Guidelines](https://udlguidelines.cast.org/) | Supports agency, varied representations, adjustable support and meaningful feedback | Offer equivalent ways to inspect and act; make help available without mandating a lecture. UDL is a design framework, not proof of efficacy |
| [NN/g: Recognition and Recall](https://www.nngroup.com/articles/recognition-and-recall/) | Visible contextual information reduces interface-memory demands | Show component purpose, connection meaning and available actions. Recalling an obscure keyboard shortcut is not useful retrieval practice |
| [Google SRE: Implementing SLOs](https://sre.google/workbook/implementing-slos/) | User-centered indicators relate good events to eligible events within a measurement window | Distinguish contractual game checks from production SLIs; expose denominators and windows; do not call a path estimate an observed percentile |
| [Microsoft: Cache-Aside pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside) | An application checks cache, fetches a miss from the source and populates the cache | Connect cache warming to successful fetches. Clearly label simplified consistency and expiration behavior |
| [PostgreSQL: Identity Columns](https://www.postgresql.org/docs/current/ddl-identity-columns.html) | Identity generation alone does not guarantee uniqueness; a unique or primary-key constraint enforces it | Teach allocation separately from uniqueness and durable mapping; allow several valid allocation strategies |
| [WCAG 2.2: Dragging](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html), [Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [Contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) | Dragging requires a single-pointer non-drag alternative; minimum targets are 24 CSS px or qualifying exceptions; normal-text contrast is 4.5:1 | Audit actual interactions, spacing and text. Keyboard support alone does not satisfy the non-drag requirement; the optional 44 px touch goal is a product choice |

Use [Mini Motorways](https://dinopoloclub.com/games/mini-motorways/) as inspiration for readable flows and iterative pressure, and [Turing Complete](https://store.steampowered.com/app/1444480/Turing_Complete/) for construction and executable tests. Borrow interaction principles, not distinctive assets, exact screens, or assumptions that circuit wiring accurately represents network protocols.

## 5. The intended play loop

1. **Understand the job.** A tiny client asks for a short link and later opens it. State what must work, not which components to place.
2. **Build a hypothesis.** Choose components and behavior. Hover or inspect to learn purpose, request types, limits and alternatives.
3. **Inspect one operation.** See a create or redirect, its data, and the returning response. This is a low-pressure diagnostic tool, not a mandatory animation.
4. **Predict, optionally.** Offer a one-tap guess about a selected workload. Allow “not sure” and skip; never block traffic behind a quiz.
5. **Send traffic.** Use reproducible demand. Pause, inspect and replay without losing the design.
6. **Understand the failure.** Connect a failed user action to a specific dependency and supporting evidence. Separate structural invalidity from capacity overload.
7. **Change one thing.** Preserve the previous run, compare like-for-like outcomes, and make undo safe.
8. **Explain and choose another goal.** Offer a brief reflection and a meaningful optional remix: cheaper, colder, less concentrated reads, or more creation traffic. Celebrate a justified trade-off, not merely a green light.

Guidance should fade after demonstrated competence, remain manually available, and never silently change the difficulty or simulator. Short sessions need a saved stopping point. Fast learners should be able to bypass the introductory explanation without bypassing contract checks.

## 6. Backlog conventions

### Implementation log · 5 September 2026

First engineering slice is implemented locally. No new levels or simulation-math changes were made.

| Ticket | State | Evidence and remaining work |
| --- | --- | --- |
| L1-049 | Implemented; automated checks pass | Independent certificate ledger, schema-2 migration, design/model/scenario matching, and shared landing/level progress. Tests retain all passes after 20 failures plus reload. Manual browser qualification remains part of the release gate |
| L1-004 | Partial | Renamed runtime/UI metric to estimated latency, centralized thresholds, explained per-sample success/window and covered boundary cases. End-to-end admitted/completed-work accounting still depends on L1-001 |
| L1-007 | Partial | Model/scenario identities are recorded; a player measurement panel and [model contract](level-1-model-contract.md) document assumptions. This does not validate the unresolved cache/queue/causality model |
| L1-052 | Partial | Added persistence/contract regressions and static-render checks for both screens. Remaining editor, replay and full accessibility coverage is not claimed complete |

Verification for this slice: **38 tests passing; production build successful.** React static rendering is not browser interaction testing. No novice-learning results, delayed-retention results or new accessibility qualification have been collected. Next engineering priority is L1-001 → L1-002/003/005; the baseline learner study remains unstarted.

### Priority and acceptance rules

**Completion recap slice · 6 September 2026:** L1-015 now offers an optional in-board pass explanation: tested workload, chosen allocation/capacity trade-offs, real cache-hit evidence, an open transfer question and explicit untested limitations. Creation/redirect follow-ups use recorded outcome references, not a topology-generated story; absent evidence does not earn a cache-benefit claim. Close/trace actions transfer keyboard focus and never change certificates. Selecting a component also exits a stale trace. **118 tests, isolated completed-run/recap browser checks and the production build pass.** No assessed-mastery or learner-study claim is made.

**Component teaching slice · 6 September 2026:** L1-010 now places received work and returned results directly in the inspector, with keyboard-operable disclosure for state, board-specific callers, limitations and alternatives. All six workbench components are covered; API strategy changes update the explanation, and an unused allocator is distinguished from a required one. The board remains visible, the existing longer field guide stays optional, and model responsibilities are distinguished from real running servers. **112 tests, isolated all-component/compact-width browser checks and the production build pass.** Novice comprehension review remains open; this is not a completed learning study.

**Storage coordination slice · 6 September 2026:** L1-051 now uses a shared Web Lock and exact-source comparison for save transactions. Concurrent edits pause autosave without changing the open board; players can download either copy and explicitly choose which to keep. A changed source between review and confirmation aborts replacement. Autosave checkpoints the last valid board before a changed write; failed checkpoint writes leave the primary untouched. Unknown/corrupt primary data is protected from automatic overwrite and preserved verbatim on explicit replacement. Storage/lock unavailability is visibly unsaved with export and retry. **108 tests, isolated two-tab/blocked-storage browser checks, backup regression checks and the production build pass.** This coordinates participating current builds, not arbitrary older code that ignores the lock; account sync and durability after browser-data deletion remain out of scope.

**Portable saves slice · 6 September 2026:** L1-050 now provides versioned JSON export/import with size and graph validation, schema-2 migration, a non-destructive preview, explicit restore confirmation, and a separately downloadable pre-restore recovery copy. Landing and level can recover from a corrupt primary slot. Exports preserve certification identity while excluding traffic frames, experiment URLs and unknown fields. This is a pre-restore checkpoint, not yet comprehensive autosave/concurrent-tab protection. **99 tests, isolated backup browser checks and the production build pass.**

**Contextual help slice · 6 September 2026:** L1-013 now has opt-in question → evidence → experiment stages keyed to the active structural/budget/failure/pass context. Dismissal remains closed for that context; hints do not cycle or silently place a solution. Actual rejected request counts support failure hints, and missing dedicated allocation offers alternative code strategies. A focus action takes the player to the relevant component and sample. This is a deterministic help ladder, not validated adaptive tutoring or a worked-example system. **92 tests, isolated help browser checks and the production build pass.**

**Connection and non-drag movement slice · 6 September 2026:** L1-025 has a target-preview planner explaining requests, responses, cache-aside, allocation and invalid connections before explicit confirmation. Existing quick-connect board actions remain available with descriptive target tooltips. L1-043 is partial: components can now be selected and placed with a click/tap on empty board space, with Escape/cancel and undo/redo. This does not claim a complete target-size or accessibility audit. **87 tests, isolated connection/movement browser checks and the production build pass.**

**Editor safety slice · 6 September 2026:** L1-026 now supports undo/redo buttons and Ctrl/Cmd+Shift+Z (plus Ctrl+Y), thirty gesture snapshots, redo-branch invalidation and no-op preservation. Pointer and keyboard geometry changes retain current run evidence; behavioral edits clear it consistently. Delete is scoped to the focused component/edge, not a previously selected item while operating other controls. Text editors and modal dialogs retain their own keyboard behavior. **82 tests and isolated editor-history browser checks pass; production build succeeds.** Saved design branches and persistent recording restoration remain separate open work.

**Recorded evidence + bounded mapping slices · 6 September 2026:** L1-003 is implemented for the chosen aggregate model: frames record actual dependency calls and cache decisions; players filter outcomes and inspect the actual replica/path, with replies explicitly described as the synchronous return contract rather than packet captures. L1-006 now has an optional create/open experiment with all three allocators, unique insertion, forced random collision/retry, shared-primary reads and cache clearing that preserves the simulated table. The experiment bypasses ingress and load limits, holds up to 20 links in session memory, and discloses these limits. It does not claim production durability or under-load collision simulation. L1-009 is still open: the experiment is optional and has not yet been tested as the novice entry flow. **77 unit/static-render tests and two isolated browser scripts pass; production build succeeds.** Browser checks cover recorded paths, edits, replay, create/open/cache loss/collision, modal focus and mobile overflow. Learner and full accessibility qualification remain open. No new levels were created.

**Second engineering slice · 5 September 2026:** `admission-v2` replaces the offered-demand approximation. L1-001 now has a tested fail-fast/zero-queue implementation with per-operation conservation; L1-002 batches shared-cache lookups and warms only from successful admitted fills. These are implemented under the explicit no-waiting policy, not a claim to simulate production queues. L1-005 is partial: reports identify actual rejected operation counts and locations, but individual recorded-request inspection remains open (L1-003). The HUD exposes admitted/rejected rates and successful/skipped fills. Original-model passes are retained and marked for recertification. **52 tests pass; production build succeeds.** New browser-interaction, accessibility and learner qualification remain open. The audit and balance table above are historical `aggregate-v1` observations, not results for the new model.

Each ticket has an acceptance condition, not merely a feature name. Before implementation, assign an owner and refine estimates using the current architecture.

- **P0 — trust/release blocker:** Wrong lessons, lost evidence, inaccessible core actions or missing release evidence.
- **P1 — core improvement:** High-value work proposed for Level 1; marked **Gate** items are mandatory for graduation.
- **P2 — validate before committing:** Useful improvements or uncertain hypotheses, not automatic scope.
- **P3 — optional depth:** Parked extensions; require evidence that the core is clear and enjoyable.
- **Fix:** Observed implementation gap. **Build:** Proposed capability. **Experiment:** Outcome is uncertain. **Audit:** Determine the actual issue before choosing a fix.
- **S/M/L:** Relative engineering/research complexity, not promised calendar estimates. Research recruitment and follow-up have separate elapsed-time costs.

Dependencies list significant prerequisites, not every incidental connection. Cross-cutting accessibility, observability and tests are part of every implementation ticket; their dedicated tickets establish shared capabilities.

### Epic A — A simulation players can trust

| ID | Priority · kind · size | Work and acceptance condition | Dependencies |
| --- | --- | --- | --- |
| L1-001 | P0 · Fix · L | **Conserve work across the graph.** Specify admitted, queued, completed, rejected and timed-out work per operation. Upstream rejection must not execute phantom downstream work. Automated overload/recovery fixtures reconcile counts and expose queue semantics without pretending to model a full production scheduler. | — |
| L1-002 | P0 · Fix · M | **Make cache state causal.** Warm only from successful eligible fills. Test cold start, storage failure, recovery and two callers sharing a cache. Reproduce and remove any evaluation-order dependence; reads against a failed source must not manufacture later hits. | 001 |
| L1-003 | P0 · Build · L | **Make trace and traffic agree.** Establish one documented behavioral contract for both. Use seeded representative events or a bounded request model; tag illustrative traces explicitly until reconciled. A sampled failure must identify its actual operation/path, not automatically use the first API branch. | 001, 002 |
| L1-004 | P0 · Fix · M | **Tell the truth about metrics.** Until a real request distribution exists, rename p99 to estimated latency and explain its aggregation. Define eligible requests, error denominator, window and pass rule. Test threshold boundaries and mixed read/write traffic; UI, reports and model must agree. | 001 |
| L1-005 | P0 · Build · M | **Connect failure to evidence.** Report the failed user operation, blocking dependency and demand/capacity or validation evidence. A high-utilization unrelated node cannot become the sole explanation. Test structural, overload, budget and cold-cache failures separately. | 003, 004 |
| L1-006 | P1 Gate · Build · M | **Separate allocating a code from storing it.** Provide a bounded create/lookup demonstration with enforced unique mappings for every supported strategy. A duplicate candidate cannot overwrite a different URL; a created code must resolve after cache loss. Clearly distinguish this demonstration from aggregate load. | 003 |
| L1-007 | P0 · Build · M | **Publish and version the model contract.** Document traffic routing, queueing, cache policy, identity assumptions and omissions in code-adjacent tests and an accessible player panel. Record model/scenario versions with runs; changed rules must never silently certify an old design. | 004 |
| L1-008 | P1 Gate · Build · M | **Add adversarial architecture fixtures.** Cover shared storage, optional ID service, an unused component, failed upstream, asymmetric branches and alternative valid designs. Classify each fixture as supported behavior or an explicit limitation. Topology permutation must not change an equivalent result. | 001, 002, 006 |

**Scope constraint:** Choose the smallest model that makes the taught claims true. A bounded seeded hybrid may be sufficient. Do not build a general distributed-systems emulator to earn the label “realistic.”

### Epic B — Understanding without turning play into schoolwork

| ID | Priority · kind · size | Work and acceptance condition | Dependencies |
| --- | --- | --- | --- |
| L1-009 | P1 Gate · Build · M | **Start with the user's job.** Show creating and opening one short link in a small client panel. Explain the contract in plain language without revealing a solution. Novice tests must distinguish create from redirect before the first stress test. | 006 |
| L1-010 | P1 Gate · Build · M | **Teach components at the moment of use.** Each component explains purpose, received work, returned result, stored state, limitation and one alternative. Inspecting an API must make clear that code allocation can live there or use another service. Keep the canvas visible. | 007 |
| L1-011 | P1 · Experiment · M | **Test prediction before traffic.** Offer optional predictions about one changing variable, including “not sure.” Compare comprehension and interruption against a no-prompt version. Ship only if learning improves without materially reducing enjoyment or completion. | 004, 057 |
| L1-012 | P1 · Experiment · M | **Ask a useful question after a surprising result.** Offer “what changed, and why?” with evidence-linked choices or private notes. Feedback addresses reasoning, not intelligence. Skipping never removes progress; evaluate explanation quality, not response count. | 005, 057 |
| L1-013 | P1 Gate · Build · M | **Replace repeating hints with a help ladder.** Escalate from a question, to highlighted evidence, to an optional demonstration. Detect relevant state, allow manual help and stop repeating dismissed hints. A correct alternative architecture must never be told to add an unnecessary component. | 005, 010 |
| L1-014 | P2 · Experiment · M | **Offer worked examples with fading support.** After requested help, compare a tiny failing and working behavior, then ask the player to adapt it. Keep the current board safe. Test against static prose; do not auto-place the final answer in the player's design. | 010, 013 |
| L1-015 | P1 Gate · Build · S | **Make completion a concept recap.** Summarize demonstrated behavior, the chosen trade-off and an unresolved limitation; offer a one-operation trace. Distinguish game contract completion from assessed understanding. Never award a “mastered” label from traffic success alone. | 004, 010 |
| L1-016 | P2 · Experiment · M | **Add optional component micro-experiments.** Explore a cache miss/hit, sequence versus random allocation, or shared database bottleneck in a reversible side panel. Each has one question and observable consequence. Returning restores the board; test whether discovery beats a longer guide. | 003, 006, 057 |

### Epic C — Real choices and satisfying constraints

| ID | Priority · kind · size | Work and acceptance condition | Dependencies |
| --- | --- | --- | --- |
| L1-017 | P1 Gate · Audit · M | **Map the viable design frontier.** Enumerate representative topologies, tiers and strategies against core contracts. Identify dominated and near-identical choices. Preserve at least three structurally or behaviorally distinct passing families; publish fixture costs and outcomes with model version. | 004, 008 |
| L1-018 | P1 Gate · Experiment · M | **Give strategies honest trade-offs.** Test when database allocation, random generation and ID service differ observably. Explain any option with little value in this level instead of forcing it. Acceptance: no “ID generator missing” error unless the player explicitly selected a dependent strategy. | 006, 017 |
| L1-019 | P1 Gate · Build · M | **Make workload shape visible.** Preview creates versus redirects and concentrated versus scattered reads. Two equal-RPS profiles must make their distinct resource demand inspectable. Introduce terminology through concrete requests before relying on percentages and jargon. | 003, 004 |
| L1-020 | P1 Gate · Experiment · M | **Tune the three core challenges as a learning arc.** First prove behavior, then expose repeat reads, then test creation demand. Establish a predictable ramp and readable failure window. Novice playtests must show distinct reasoning, not three arbitrary upgrades to the largest tier. | 017, 019, 057 |
| L1-021 | P1 · Build · M | **Offer optional self-selected contracts.** “Spend less,” “survive a cold start,” and “handle scattered reads” reuse the same system. State conditions before running and never retroactively fail the base contract. At least two goals should favor different viable choices. | 017, 019 |
| L1-022 | P2 · Experiment · M | **Replace one-dimensional scoring with trade-off records.** Compare cost, qualifying success and latency under identical demand. Avoid a universal best-score formula. Test whether personal bests motivate explanation rather than noisy micro-optimization. | 004, 017, 034 |
| L1-023 | P1 Gate · Audit · M | **Prevent recipe and cheese wins.** Search for bypassed durability, phantom caches, irrelevant components earning credit and cheap exploits. Separate legitimate clever solutions from model defects. Add regression fixtures; fix defects without outlawing a sound unanticipated design. | 006, 008, 017 |
| L1-024 | P2 · Experiment · S | **Celebrate the decision, not a component count.** Brief completion feedback references a real achievement such as meeting the same demand with lower cost. No rewards for unnecessary complexity, reading every tooltip, speed alone or repeated failed runs. Test perceived fairness and delight. | 015, 022 |

### Epic D — An editor that stays out of the way

| ID | Priority · kind · size | Work and acceptance condition | Dependencies |
| --- | --- | --- | --- |
| L1-025 | P1 Gate · Build · M | **Explain a connection before committing it.** Preview dependency meaning and valid targets; show why an invalid link is invalid. Clearly distinguish the caller's request from its returning response. Novices must wire create/read dependencies without guessing at input/output terminology. | 010 |
| L1-026 | P1 Gate · Build · M | **Make editing consistently reversible.** Add redo, gesture-level undo and safe deletion. Distinguish layout edits from behavioral edits; preserve valid recordings for geometry-only changes via pointer or keyboard. Test undo across move, connect, configure and remove. | — |
| L1-027 | P1 · Build · M | **Navigate without losing the system.** Fit-to-board, zoom, pan, reset view and selected-node focus must work with keyboard and pointer. Preserve connection targets and readable details at zoom limits. New components must not appear off-screen without a discoverable way to find them. | 041, 043 |
| L1-028 | P1 Gate · Build · M | **Use a progressive component inspector.** Default view answers “what it does here” and “what limits it now”; details expose policy and numeric assumptions. Show cost/capacity deltas before a tier change. Do not hide essential behavior in hover-only content. | 004, 010 |
| L1-029 | P2 · Build · M | **Reduce wiring clutter.** Add optional read, create and response overlays with selected-path emphasis. Line crossings must not look like junctions. Each filtered view states what is hidden; returning to the full graph must be one action. | 003, 025 |
| L1-030 | P1 Gate · Build · S | **Separate edit, running, paused and replay states.** Make the active mode and permitted actions unmistakable. Behavioral edits during a run require an explicit restart or branch; pausing must not discard evidence. UI tests cover each transition and accidental clicks. | 026, 033 |
| L1-031 | P1 · Build · M | **Explain validation locally.** Selecting a structural error focuses the offending component or missing relationship and states its effect on a user operation. Keep a compact global checklist without prescribing a topology. Fixing the cause must remove the stale error immediately. | 005, 025 |
| L1-032 | P2 · Experiment · S | **Offer layout assistance, never architectural assistance by surprise.** Align, tidy or distribute selected nodes without adding components or wires. One undo restores the layout. Test whether it helps readability enough to justify another control in the HUD. | 026, 027 |

### Epic E — Replay as experimentation

| ID | Priority · kind · size | Work and acceptance condition | Dependencies |
| --- | --- | --- | --- |
| L1-033 | P1 Gate · Build · M | **Save named design branches.** Duplicate a design before an experiment, return to a known working version and inspect saved cost/results. A failed experiment cannot overwrite the only passing board. Migration must preserve the existing single-slot save. | 049, 050 |
| L1-034 | P1 Gate · Build · M | **Compare A/B fairly.** Run two branches against identical scenario versions, seed and starting cache state. Show meaningful metric differences alongside the changed components/configuration. Prevent an old-model run or warm/cold mismatch from appearing as a fair direct comparison. | 004, 007, 033 |
| L1-035 | P1 · Build · M | **Preserve useful run evidence.** Save a bounded trace/timeline with the design snapshot and scenario, clearly distinguish summary-only older runs, and provide retention controls. Opening a historical run must not silently replace the editable board. | 003, 007, 050 |
| L1-036 | P1 Gate · Build · M | **Make replay deterministic and controllable.** Restart, pause, step a meaningful event and adjust playback speed without changing outcomes. Define background-tab behavior and show simulation time. Identical seed/design/scenario must reproduce results independent of display frame rate. | 001, 003, 030 |
| L1-037 | P2 · Experiment · M | **Provide a bounded workload workbench.** Let players vary read/write mix, intensity and key concentration with visible presets. Mark custom experiments separately from certification. Save and repeat a chosen seed; include a reset to the original contract. | 019, 034 |
| L1-038 | P2 · Experiment · S | **Offer a private experiment notebook.** One optional sentence records a hypothesis and links to a branch/run. Never grade free text or transmit it by default. Test whether learners use it to change one variable and explain results, rather than making it obligatory. | 033, 035 |
| L1-039 | P2 · Experiment · S | **Make return visits useful.** Resume the exact design with a concise recap and an optional short retrieval prompt. No streaks or loss penalties. Test a seven-day return; the player should be able to recover context without replaying the entire tutorial. | 015, 050, 059 |
| L1-040 | P2 · Experiment · M | **Show contrasts without spoiling discovery.** After completion or explicit help, compare selected valid approaches against the same workload. Explain what each buys and costs. Do not rank one topology as the official answer or make copying count as demonstrated understanding. | 017, 034 |

### Epic F — Inclusive, readable, delightful play

| ID | Priority · kind · size | Work and acceptance condition | Dependencies |
| --- | --- | --- | --- |
| L1-041 | P0 · Audit · M | **Audit readability and contrast.** Test actual HUD, canvas labels, dialogs and disabled states at desktop/mobile widths and text zoom. Meet applicable WCAG AA text contrast; remove tiny essential labels. Keep the clay treatment, but never let shadows or material effects carry essential information. | — |
| L1-042 | P0 · Build · M | **Make status understandable without color or motion.** Combine shape, label and state icon; provide a textual traffic/diagnostics view with equivalent facts. A grayscale or reduced-motion player must identify the failing operation and dependency without chasing animated dots. | 003, 005 |
| L1-043 | P0 · Audit · M | **Provide accessible targets and non-drag operation.** Measure rendered hit areas and spacing against WCAG 2.2. Add select-then-place movement for single-pointer use as well as keyboard movement. Aim for 44 px touch targets where feasible; test ports, resize/zoom controls and dialogs. | — |
| L1-044 | P0 · Build · L | **Complete a keyboard and assistive-technology path.** Provide a semantic node/connection list with inspect, connect, move and delete actions, sensible focus restoration and restrained live announcements. A screen-reader user must complete the core build–run–diagnose loop without canvas-only information. | 025, 042, 043 |
| L1-045 | P1 Gate · Build · M | **Respect motion and sensory preferences.** Honor reduced motion; let traffic animation pause independently of simulation. Avoid flashing failure effects. Any later audio is optional, controllable and redundant with visible feedback; muted play must retain all information. | 042 |
| L1-046 | P1 Gate · Audit · M | **Make compact screens genuinely playable.** Test 320/390/768 px widths, portrait/landscape and browser zoom. Prevent HUD overlap and unreachable actions; allow intentional board panning. Include a readable list/inspector mode rather than simply shrinking the desktop canvas. | 041, 043, 044 |
| L1-047 | P1 Gate · Build · S | **Rewrite intimidating and ambiguous language.** Explain first-use terms, distinguish storage from cache, and make errors specific and nonjudgmental. Run a comprehension review with novices; remove wording that equates sophistication, spending or component count with quality. | 010, 015 |
| L1-048 | P2 · Experiment · M | **Polish with a feedback budget.** Use brief placement, connection and success feedback only where it improves state recognition or satisfaction. Offer optional restrained sound after muted usability succeeds. Measure interruption and performance; no celebration may block inspection or the next experiment. | 030, 045, 054 |

### Epic G — Durable progress and maintainable delivery

| ID | Priority · kind · size | Work and acceptance condition | Dependencies |
| --- | --- | --- | --- |
| L1-049 | P0 · Fix · M | **Separate certificates from rolling history.** Retain contract results by behavioral fingerprint and model/scenario version, independent of the 12-run display limit. Regression: pass all contracts, make 20 more runs, reload, and retain legitimate certification; a behavioral change cannot inherit it incorrectly. | 007 |
| L1-050 | P1 Gate · Build · M | **Make saves recoverable and portable.** Add versioned export/import, validation, migration and a last-known-good recovery point. Reject oversized/malformed imports safely. Existing saves survive upgrades; reset requires an explicit choice and offers export first. | 007, 049 |
| L1-051 | P1 Gate · Build · M | **Handle failed storage and concurrent tabs.** Show unsaved status when storage is blocked/full and protect against silent last-writer overwrites. Test two tabs, corrupted data and interrupted writes. Offer an export/recovery path without requiring an account. | 050 |
| L1-052 | P1 Gate · Build · M | **Make regressions cheap to detect.** Extend automated model and browser coverage for certificates, branch restore, accessibility-critical actions, deterministic replay and alternate valid solutions. Document a one-command verification path and deterministic fixtures; do not substitute screenshot counts for assertions. | 008, 026, 049 |
| L1-053 | P1 · Build · M | **Separate model, evidence and presentation contracts.** Keep simulation, scenario definitions, persistence and UI adapters independently testable. Every recorded metric has a definition and producer; the HUD cannot invent a different diagnosis from the report. Refactor only to support accepted Level 1 work. | 003, 004, 007 |
| L1-054 | P1 Gate · Audit · M | **Set and test a performance envelope.** Establish representative low-end hardware and maximum supported board/load sizes. Target responsive input and smooth playback; measure frame time, input latency and memory before choosing numeric budgets. Long runs and reduced animation must preserve simulation results. | 036, 046 |
| L1-055 | P1 Gate · Build · S | **Keep the preview and release reproducible.** Document startup, production build and verification commands; test refresh/deep links and missing assets. Loading errors should be actionable. No core learning content may depend on an unexplained remote resource or a transient developer session. | 052 |
| L1-056 | P1 Gate · Build · M | **Instrument without surveillance.** Specify opt-in events for meaningful actions, hints, comparisons and contract outcomes, with versions. Default to local diagnostics; exclude entered URLs, free text and raw saved designs from analytics. Document consent, retention and deletion before collecting study data. | 007, 057 |

### Epic H — Prove learning and protect the game

| ID | Priority · kind · size | Work and acceptance condition | Dependencies |
| --- | --- | --- | --- |
| L1-057 | P0 · Audit · M | **Establish a baseline before redesign.** Observe 6–8 target novices using the current level and 3–4 engineers reviewing technical meaning. Record confusion, interventions, time, explanations and enjoyment with consent. Produce a ranked issue log; do not treat the engineers as novice substitutes. | — |
| L1-058 | P0 · Build · M | **Define a learning rubric.** Score O1–O8 using prediction, explanation and behavior on 0–2 anchored scales. Separate assisted and independent performance. Have two reviewers independently score a subset and reconcile disagreements; use the rubric before claiming mastery. | 057 |
| L1-059 | P1 Gate · Experiment · M | **Test transfer and retention.** Use unseen URL-shortener traffic/design faults immediately and again around seven days later. Reword and counterbalance tasks to reduce memorization. Report participant counts, attrition and help received; a repeat of the same visible contract is not a transfer test. | 058 |
| L1-060 | P2 · Experiment · L | **Compare against a credible alternative.** Run an equal-time conventional interactive tutorial comparison with matched objectives and prior-knowledge checks; randomize when feasible. Predefine primary outcomes and size a later study appropriately. Small formative samples cannot establish “best way to learn.” | 058, 059 |
| L1-061 | P1 Gate · Audit · M | **Measure enjoyment alongside learning.** Collect voluntary replay, perceived agency, frustration, confidence calibration and enjoyment. Inspect recordings, not just click counts. Reject mandatory prompts that improve quiz scores while materially harming the build–test–iterate experience. | 057, 058 |
| L1-062 | P0 · Audit · M | **Validate access with actual users.** Recruit relevant keyboard, screen-reader, low-vision and touch users for focused sessions, allowing overlap across participants. Record assistive technology and blockers. Automated scans supplement, not replace, successful task completion and manual review. | 041, 043, 044 |
| L1-063 | P1 Gate · Experiment · M | **Re-test the revised core with fresh novices.** Run a second formative round after P0 fixes, using the same core measures and logging necessary differences. Track issue recurrence and new friction. Report uncertainty and individual outcomes rather than implying statistical certainty from a small cohort. | 057, 058, 061 |
| L1-064 | P0 · Audit · S | **Hold a Level 1 graduation review.** Assemble technical fixtures, accessibility results, learning/retention evidence, unresolved risks and scope decisions against Section 9. Record explicit sign-off or failed criteria with owners. A passing automated build alone cannot unlock new-level production. | All P0; P1 Gate; 063 |

### Epic I — Optional depth inside the same level, not the next level

These are opportunities, not prerequisites. Unlock development only when the relevant misconception or replay need appears in research. Do not pile all of them into the first session.

| ID | Priority · kind · size | Work and acceptance condition | Dependencies |
| --- | --- | --- | --- |
| L1-065 | P3 · Experiment · M | **Expiration and freshness.** An optional editable-link variant contrasts cached speed with stale data and explicit invalidation/TTL policy. Show the simplification and test a changed destination. Keep immutable-link behavior as the core unless evidence supports widening it. | 002, 006, 059 |
| L1-066 | P3 · Experiment · L | **A cold-start stampede.** Compare naive simultaneous misses with bounded/coalesced fetches using observable source demand. Do not present ordinary warming as stampede prevention. Requires a model capable of the concurrency claim and a clear learner need. | 001, 002, 003 |
| L1-067 | P3 · Experiment · M | **Collision and keyspace experiment.** Shrink a labelled toy code namespace to make random collisions visible; show retry and uniqueness enforcement. Explicitly separate toy probability from production values. The lesson must not imply random identifiers inherently overwrite data. | 006, 018 |
| L1-068 | P3 · Experiment · L | **Overload, retry budgets and backoff.** Contrast immediate repeated retries with bounded backoff in a controlled fault. Follow [AWS retry/backoff guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/retry-backoff.html) when specifying semantics. Teach idempotency for writes; do not add retries to the core without modelling their extra work. | 001, 003, 059 |
| L1-069 | P3 · Experiment · L | **Failure versus slowness.** An optional outage distinguishes adding API replicas from removing a shared database failure point. If replication is not implemented, say so; never simulate an independent second writable database as magically coherent storage. | 006, 008, 059 |
| L1-070 | P3 · Experiment · M | **Bridge diagrams to implementation.** Offer readable pseudocode for create, lookup and cache-aside generated from supported behavior. Trace steps and code must agree. No language knowledge is required to finish, and generated code is illustrative rather than deployment-ready. | 003, 006, 010 |
| L1-071 | P3 · Experiment · M | **Share reproducible experiments safely.** Export a compact versioned board/scenario package for peer discussion. Strip entered personal URLs and notes by default; validate imports and treat labels as text. Do not build public hosting, chat or moderation systems under this ticket. | 034, 050, 056 |
| L1-072 | P2 · Audit · M | **Prepare accessible language expansion.** Test jargon, reading level, text expansion and locale-friendly formats; separate player copy from logic as needed. Prioritize actual audience needs before translations. Do not make English reading speed an implicit game difficulty setting. | 010, 041, 047 |

## 7. What to do first

This order balances immediate player protection with evidence collection. Research can run alongside engineering, but recruitment and analytics require appropriate consent. Do not wait until the end to discover that a polished mechanic teaches the wrong thing.

| Wave | Work | Exit condition |
| --- | --- | --- |
| 0 · Establish the baseline | 057–058; initial 041/043 audits; capture current alternate-solution fixtures | Written misconception/UX log, preliminary rubric, accessibility gaps and reproducible model baseline |
| 1 · Protect truth and progress | 007 → 049; 001 → 002/004 → 003/005; begin 044 | Old passes survive; work and cache semantics are tested; reports no longer mislabel estimates or invent causal evidence |
| 2 · Make one request understandable | 006, 008, 009–010, 013, 025–026, 028, 031, 042/047 | A novice can build and explain create/redirect, get targeted help and recover an edit without receiving a prescribed solution |
| 3 · Make another attempt worthwhile | 017–020, 023, 030, 033–036, 050–052 | Meaningful alternatives survive; A/B comparisons are fair; changes and runs are recoverable |
| 4 · Test the teaching and polish | Trial 011–012; finish 015, 045–046, 054–056; 059, 061–063 | Measured evidence supports the core experience; access and performance qualification are documented |
| 5 · Graduate or continue Level 1 | 064, including every remaining P0 and P1 Gate ticket | Explicit decision against the release gate, not an impression that the screen looks finished |

**First implementation slice:** versioned certificates, honest metric labels, then a single correct create/miss/fill/hit path with causal error reporting. This creates a trustworthy foundation for both the tutorial and the replay loop. Do not begin with optional sound, a larger component catalog or campaign work.

Priorities are provisional. A baseline finding that beginners cannot connect anything should move the relevant interaction fix ahead of a sophisticated replay feature. Conversely, no engagement improvement can justify a known incorrect core teaching model.

## 8. Measurement plan

### Two scoreboards, neither replaceable by the other

**Learning:** Can players predict, explain, debug and transfer without a solution hint?  
**Game:** Do players feel in control, understand feedback and voluntarily make another experiment?

Contract pass rate alone rewards guessing. Session length alone can reward confusion. Voluntary replay alone can reward grinding. Measure these together with observed behavior and short interviews.

### Formative study sequence

1. **Baseline:** 6–8 target novices, plus a separate 3–4 engineer accuracy review. Start with a brief prior-knowledge check. Observe an unassisted attempt before giving structured help. Ask about intent retrospectively where concurrent questioning would distort play.
2. **Accessibility:** Focused sessions with approximately 3–5 participants spanning the assistive technologies/input needs available for recruitment. This is an initial practical sample, not coverage of all disabilities or proof of conformance.
3. **Revised build:** A fresh 6–8 novice round using comparable tasks. Keep objectives stable; document changes in simulator or contract difficulty. Small-sample results should report counts and examples, not sweeping percentages without denominators.
4. **Retention:** Invite participants back around day seven. Use unseen same-level traffic and fault variants, not remembered answers. Report the return rate and do not treat missing participants as successful.
5. **Efficacy study, later:** Compare against a credible equal-time tutorial if early evidence warrants it. Pre-register the primary outcome, assess baseline knowledge, plan sample size and report uncertainty before making superiority claims.

These are study tasks and Level 1 scenario variants, not new playable campaign levels. Research involving minors, schools or identifiable participant data needs a separate consent/privacy review before recruitment.

### Rubric and draft targets

For each O1–O8 objective, use a 0–2 scale: **0** incorrect/no usable model; **1** partly correct or needs substantive help; **2** independently correct, with a causal explanation or justified prediction. Write objective-specific examples before collecting scores. Maximum: 16. A valid architecture alone does not earn explanation points.

The following are **proposed product targets**, not observed results or numbers established by the sources. Calibrate them after the baseline and lock the graduation thresholds before evaluating the revised cohort; do not move them afterward to disguise failure.

| Dimension | Proposed target | How to interpret it |
| --- | --- | --- |
| Entry friction | Median time to first valid small build ≤5 minutes; ≥80% do so without the moderator solving it | Log time spent reading versus fighting controls; contextual hints are recorded separately |
| Full core session | ≥80% complete the three contracts within a planned 30–45 minute session without a copied final layout | Offer a saved stopping point; taking longer is not a personal failure or evidence of low ability |
| Independent understanding | ≥80% score at least 12/16, with independent correct O1 and O2 explanations | Report each objective; high totals cannot hide foundational request/durability misconceptions |
| Transfer | ≥70% diagnose and improve an unseen Level 1 workload/fault without a solution hint | Require a justified edit, not just cycling upgrades; use a comparable task difficulty |
| Retention | Returning participants retain at least 80% of their immediate rubric score in aggregate | Report absolute scores and attrition too; a low starting score cannot make weak retention look acceptable |
| Replay | ≥60% voluntarily start one additional meaningful experiment after core completion when time permits | Do not count compulsory runs, incentivized survey tasks or accidental restarts |
| Enjoyment and agency | Median ≥4/5 on separately asked enjoyment and perceived-choice items | Pair ratings with observed frustration and interview examples; politeness bias is possible |
| Accessibility | No unresolved blocker in the supported keyboard, screen-reader, touch and zoom qualification tasks | Publish tested configurations and limitations; do not generalize beyond the review |
| Trust and data safety | All canonical model/persistence fixtures pass; zero observed lost-progress defects in the release qualification matrix | This is a test result with bounded coverage, not a promise that bugs cannot exist |

If explanation prompts help scores but substantially hurt enjoyment or voluntary iteration, redesign or remove the prompts. If players love the game but retain a wrong cache or identity model, fix the model and feedback before expansion. Confidence should be compared with correctness: becoming confidently wrong is a failure.

### Minimal event vocabulary, if consented

Use events such as `session_started`, `component_inspected`, `design_changed`, `connection_rejected`, `hint_requested`, `run_started`, `run_completed`, `trace_inspected`, `comparison_opened`, `branch_restored` and `contract_completed`. Associate scenario/model versions and coarse assistance state. Define “meaningful experiment” as a behavioral/configuration or workload change followed by an inspected result, not a layout drag.

Do not collect actual URLs, private notes, clipboard contents, complete browsing activity or raw diagrams by default. Prefer local exports for early studies. Event counts cannot substitute for observing reasoning.

## 9. Level 1 graduation gate

Level 2+ production remains frozen until this checklist receives an explicit review. Not every P2/P3 ticket must ship; refusing unnecessary scope is part of making Level 1 good.

- [ ] Every P0 and P1 **Gate** item is accepted or explicitly replaced by an equivalent documented solution. The graduation-review ticket itself closes when this review is complete. No silent deferral of a trust/access blocker.
- [ ] Core request, reply, durable mapping, cache and capacity behavior is consistent across simulation, traces, explanations and tests. Remaining abstractions are visible and do not contradict O1–O8.
- [ ] At least three genuinely distinct valid design families pass; fixtures and review show meaningful trade-offs. No universal component checklist or forced ID service. Unsupported topologies receive an honest limitation message.
- [ ] The full build–run–diagnose–edit–compare loop is reversible and usable on the supported input/device matrix. Reduced motion and assistive-technology paths preserve essential information.
- [ ] Save migration, history retention, reload, duplicate-tab and storage-error cases have no unresolved progress-loss blocker. Certificates are tied to the correct design, model and contract.
- [ ] A fresh novice round meets the agreed learning/game targets or provides documented evidence supporting a deliberately revised target for a subsequent round. Delayed results and attrition are available before claiming retention.
- [ ] Technical reviewers find no unresolved foundational misconception in component guidance, traces or failure reports. Novice evidence is not replaced by expert approval.
- [ ] Performance/build/browser tests pass on a documented support matrix; known nonblocking issues have owners and an explicit follow-up decision.
- [ ] The owner signs off on the evidence package and the remaining scope. Any public efficacy claim is limited to what the study design actually supports.

Suggested review roles: product owner, implementation owner, system-design reviewer, learning researcher/reviewer and accessibility/UX reviewer. People may cover multiple roles, but independent technical and learner perspectives matter. Roles are not yet assigned, and this document does not authorize external recruitment or messages.

“Perfect” means this bounded standard is satisfied and players reliably get the intended experience—not that every extension has been built or all imaginable defects have been ruled out. If expansion is approved, Level 1 still keeps a regression and learner-feedback budget.

## 10. Decisions and risks to resolve deliberately

| Question/risk | Recommended position | Evidence that would change it |
| --- | --- | --- |
| Aggregate model versus request simulation | Preserve a lightweight model, but make conservation and taught events truthful; use bounded seeded request evidence where needed | A prototype showing understandable causality cannot be achieved without a different model |
| Reveal solutions or preserve discovery? | Reveal causes first, examples on request, contrasting designs after completion/help | Persistent novice stalls despite clear evidence and a usable editor |
| Always display every component? | Keep genuine options inspectable; stage detail and guidance, not arbitrary mandatory recipes | Novice research showing catalog overload after contextual descriptions improve |
| Adaptive help becoming intrusive | Let players control help; use explainable state triggers and dismissal memory | Evidence that optional help is consistently undiscoverable rather than merely unused |
| Metrics becoming the game | Tie metrics to a user operation and a decision; avoid optimizing an unexplained number | Learners can explain a metric and deliberately seek deeper quantitative analysis |
| Optional depth swallowing the first session | Isolate extensions; core completion never requires every mechanic | Transfer evidence that an omitted behavior creates a foundational misconception |
| Polished HUD hurting readability | Preserve material/color identity, adjust type/spacing and feedback intensity freely | Actual readability and input testing, not aesthetic preference alone |
| Global leaderboard encouraging one answer | Keep personal experiments and multi-objective comparison first | Evidence of a learner need plus a fair, explainable scoring model and moderation plan |
| “AI tutor” added before the model is trustworthy | Defer generative tutoring; start with deterministic, evidence-linked explanations | Validated demand and a tested method to prevent unsupported causal explanations |
| Calling the product educational too early | Describe intended learning outcomes; publish measured results with limitations | A suitably designed evaluation supporting a stronger claim |

## 11. Definition of done for any accepted ticket

1. State the learner/player problem and link the relevant objective or usability need.
2. Describe supported behavior, edge cases and intentional abstractions before changing the interface.
3. Meet the ticket's acceptance condition with appropriate model, integration, manual or study evidence.
4. Verify alternate valid designs, undo/save behavior, keyboard/pointer access and compact-screen impact where affected.
5. Update player copy and model definitions together; never leave a correct model behind a misleading explanation.
6. Evaluate both learning value and interruption cost for teaching/reward mechanics.
7. Record the evidence, remaining uncertainty and decision: ship, revise, remove or defer.

**Bottom line:** The highest-value next investment is not more content. It is a trustworthy causal model, an editor that makes experimentation effortless, feedback that explains failed user requests, and evidence that players can apply the idea without a recipe. Preserve the game by making reasoning the play—not by adding schoolwork around it.
