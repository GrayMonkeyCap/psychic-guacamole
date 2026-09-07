# Player feedback: reach the content, understand the choice

## Priority and scope

Owner-prioritized feedback FB-001–003: landing could not scroll; offer obvious component choices with real-time justification; give a route to deeper cloud configuration learning. No new playable level, deployment integration or prescribed architecture.

## Reproduction and changes

- A desktop wheel-scroll check failed on the original page. An old global `body { overflow: hidden }` rule clipped the campaign even though anchors could move the page. Campaign-only document scrolling now overrides that lock; the game retains its own board/panel scrolling. Automated wheel and keyboard-to-footer checks cover new players, return from the level and 1024/768/390/320px widths.
- **Help me choose** exposes six named jobs before placement. Selecting a choice only changes the explanation. Placement remains explicit, unconnected and undoable; running/paused tests disable it. Keyboard dismissal restores the trigger. Compact dialogs scroll without horizontal clipping.
- **Why consider it now?** appears in the inspector and chooser. Reasons follow board counts, API allocation strategy and current challenge. Facts about the selected recorded sample are distinct from forecast-only hypotheses. No recorded work is not called a proven bottleneck. The guide does not claim a component will fix a failure or calculate hypothetical gains.
- **Go deeper · real-world configuration** is optional in the chooser, inspector and field guide. Descriptive links open a separate tab with `noopener noreferrer`; no document is embedded, fetched automatically, or needed to finish. Game costs/capacities are not cloud quotes or SKU mappings.

## Official reading registry

Pages opened and checked on 7 September 2026. `src/learningResources.js` is the in-game source of truth. Re-check on substantive provider changes or a broken-link report; tests validate navigation/security, not remote page availability.

| Game concept | Official examples | What to investigate |
| --- | --- | --- |
| API compute | [App Runner scaling](https://docs.aws.amazon.com/apprunner/latest/dg/manage-autoscaling.html), [Cloud Run concurrency](https://docs.cloud.google.com/run/docs/about-concurrency) | Concurrent work and instance counts are distinct from requests per second. The game does not autoscale. |
| Shared durable database | [RDS instance classes](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.DBInstanceClass.html), [Cloud SQL settings](https://docs.cloud.google.com/sql/docs/postgres/instance-settings) | Compute, memory, storage and availability are separate configuration decisions, not one universal size knob. |
| Cache-aside | [AWS caching patterns](https://docs.aws.amazon.com/whitepapers/latest/database-caching-strategies-using-redis/caching-patterns.html), [Memorystore memory management](https://docs.cloud.google.com/memorystore/docs/redis/memory-management-best-practices) | Application-managed miss/fill paths, memory limits and eviction. The game approximates warmth rather than simulating individual expiration. |
| Traffic distribution | [ALB target groups](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html), [GCP backend services](https://docs.cloud.google.com/load-balancing/docs/backend-service) | Targets, balancing settings and health checks. The model only splits requests evenly; no health-check failover claim. |
| Code allocation | [PostgreSQL sequences](https://www.postgresql.org/docs/current/functions-sequence.html), [constraints](https://www.postgresql.org/docs/current/ddl-constraints.html) | Allocation and uniqueness are different responsibilities. Sequence values are not promised gapless. A dedicated allocator is custom logic, not a mandatory AWS/GCP product. |
| Public edge caching | [CloudFront expiration](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html), [Cloud CDN caching](https://docs.cloud.google.com/cdn/docs/caching) | TTL, cacheability and public response policies. The game assumes immutable public links, not arbitrary safe-to-cache responses. |

These are conceptual bridges selected for relevance, not service endorsements or complete deployment instructions. Videos can be added after curation; official documentation is easier to maintain and avoids embedded tracking/distraction.

## Verification and remaining uncertainty

Five unit tests cover all choices, optional allocation, write-heavy cache limits, recorded evidence and trusted resource URLs. `verify-component-choices.mjs` checks no accidental placement, undo, keyboard focus, widths 320/390/768, mocked external new-tab navigation without an opener, selected-sample evidence and paused editing locks. `verify-campaign.mjs` catches the original wheel regression and footer access. The new check is in both verification suites.

Review with the feedback author and fresh novices remains necessary. We have not established faster learning, retention, full accessibility conformance or mobile-device/touch-user success. Provider page availability is not part of the deterministic offline regression suite.

Final verification: 170 unit/component tests, production build and all 22 browser scripts passed against an isolated production preview (384 seconds). Campaign input checks include a brief native-scroll/compositor settling interval after viewport changes. Dialog focus wrapping includes disclosure summaries and excludes non-visible links in closed details.
