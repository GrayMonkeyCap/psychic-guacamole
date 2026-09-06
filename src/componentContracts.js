import { STRATEGIES, validate } from './levelModel.js';
import { componentLabel } from './trafficEvidence.js';

const contracts = {
  api: {
    receives: 'A destination to shorten, or a short code to open.',
    returns: 'A created short code after saving, or a redirect destination. Failed work returns an error.',
    state: 'Request-local work, not the authoritative link table. Replicas share the same database.',
    limit: 'It must still wait for required dependencies. More APIs do not add database capacity.',
    alternative: 'Upgrade one API or route work across replicas. Allocation can use a database sequence, local random generation, or an optional ID service.',
  },
  database: {
    receives: 'Mapping lookups and inserts; sequence allocation when an API chooses it.',
    returns: 'A stored destination, a committed insert, or a uniqueness conflict. Allocation returns a candidate number.',
    state: 'The authoritative short code → destination table, including uniqueness enforcement.',
    limit: 'Reads and writes share capacity. A cache hit can avoid a lookup, but cannot replace saving a new mapping.',
    alternative: 'Compare a larger database, cached reads, or another allocation strategy. Level 1 requires one shared primary, not independent link tables.',
  },
  cache: {
    receives: 'API lookups for short codes and optional fills after successful database reads.',
    returns: 'A cached destination or a miss back to the API—not a database call.',
    state: 'Disposable copies of mappings. Losing a cached copy does not delete the saved link.',
    limit: 'Starts cold. Misses still need storage; new creations still need durable writes. Fills can be skipped under pressure.',
    alternative: 'Use database capacity for uncached reads, or cache at the edge to spare API work too. This component is optional.',
  },
  loadBalancer: {
    receives: 'Create and redirect requests from the public entry or edge.',
    returns: 'The chosen API’s response along the same connection.',
    state: 'A set of connected API destinations, not link mappings.',
    limit: 'Shares work evenly in this model; it has its own capacity. Replicas still share database demand. No health-check failover is simulated.',
    alternative: 'Send traffic directly to one larger API. A balancer with one replica does not create extra API capacity.',
  },
  idGenerator: {
    receives: 'Allocation calls from APIs using the dedicated ID service strategy. No redirect reads.',
    returns: 'A candidate short code to the API; it does not save the destination.',
    state: 'Allocation progress, not the link table. The mapping experiment uses a simplified shared allocator counter.',
    limit: 'An extra dependency on the creation path. Storage must still commit the mapping and enforce uniqueness.',
    alternative: 'Choose database sequence or random codes on the API. A separate ID service is never a universal requirement.',
  },
  cdn: {
    receives: 'Public redirects and creation requests before they reach the origin.',
    returns: 'A cached redirect on a hit; otherwise the origin’s response. Creations always go to the origin.',
    state: 'Disposable copies of public redirect destinations, not authoritative mappings.',
    limit: 'Starts cold and needs a working origin. This model assumes immutable public links; edits, privacy and invalidation policies are not simulated.',
    alternative: 'Use an API-side memory cache or more origin capacity. An API-side cache still spends API work on every request.',
  },
};

export function componentContract(design, id) {
  const node = design.nodes.find(n => n.id === id), facts = contracts[node?.type];
  if (!facts) return null;
  const incoming = design.edges.filter(e => e.to === id).map(e => design.nodes.find(n => n.id === e.from)).filter(Boolean);
  const callers = node.type === 'idGenerator' ? incoming.filter(n => n.type === 'api' && n.strategy === 'service') : incoming;
  const connected = callers.map(n => componentLabel(design, n.id));
  const reachable = validate(design).reachable.has(id);
  const activity = node.type === 'idGenerator' && !callers.length ? 'No API is configured to request codes here. A wire alone does not select this allocation strategy.'
    : !reachable ? 'Not reachable from visitors. It adds cost but serves no public traffic.'
    : `Called by ${connected.join(', ') || 'no configured caller'}. Replies return on those same connections.`;
  return { ...facts, activity, strategy: node.type === 'api' ? STRATEGIES[node.strategy || 'sequence'].name : null };
}
