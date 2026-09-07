// Official reading, checked 2026-09-07. These are conceptual bridges, not deployment recipes.
export const LEARNING_RESOURCES = {
  api: [
    ['AWS · App Runner scaling', 'Compare concurrency thresholds with minimum and maximum instance counts.', 'https://docs.aws.amazon.com/apprunner/latest/dg/manage-autoscaling.html'],
    ['GCP · Cloud Run concurrency', 'Learn why simultaneous requests per instance differ from requests per second.', 'https://docs.cloud.google.com/run/docs/about-concurrency'],
  ],
  database: [
    ['AWS · RDS instance classes', 'See how compute and memory shape a database instance; storage is another decision.', 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.DBInstanceClass.html'],
    ['GCP · Cloud SQL settings', 'Explore machine, storage and availability settings beyond the game’s size tiers.', 'https://docs.cloud.google.com/sql/docs/postgres/instance-settings'],
  ],
  cache: [
    ['AWS · Cache-aside pattern', 'Follow application lookup, database fallback and cache fill; notice the cold-miss cost.', 'https://docs.aws.amazon.com/whitepapers/latest/database-caching-strategies-using-redis/caching-patterns.html'],
    ['GCP · Memorystore memory management', 'Explore memory limits and eviction: a cached copy is not a permanent mapping.', 'https://docs.cloud.google.com/memorystore/docs/redis/memory-management-best-practices'],
  ],
  loadBalancer: [
    ['AWS · ALB target groups', 'Learn how targets and health checks affect routing. This game does not model health-check failover.', 'https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html'],
    ['GCP · Backend services', 'Explore backend capacity and balancing settings beyond this game’s even split.', 'https://docs.cloud.google.com/load-balancing/docs/backend-service'],
  ],
  idGenerator: [
    ['PostgreSQL · Sequences', 'Understand atomic allocation and why a sequence need not be gapless. An allocator is custom logic, not a required cloud product.', 'https://www.postgresql.org/docs/current/functions-sequence.html'],
    ['PostgreSQL · Unique constraints', 'See how storage enforces uniqueness even when the application chooses the candidate code.', 'https://www.postgresql.org/docs/current/ddl-constraints.html'],
  ],
  cdn: [
    ['AWS · CloudFront cache expiration', 'Explore TTL and cache headers; real redirect caching requires policy decisions.', 'https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html'],
    ['GCP · Cloud CDN caching', 'Check cacheability rules before assuming a response can be shared publicly.', 'https://docs.cloud.google.com/cdn/docs/caching'],
  ],
};
