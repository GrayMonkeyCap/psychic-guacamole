import { connectionError, STRATEGIES } from './levelModel.js';
export function describeConnection(design, from, to) {
  const error = connectionError(design, from, to);
  if (error) return { valid: false, error };
  const caller = design.nodes.find(n => n.id === from), target = design.nodes.find(n => n.id === to);
  const reply = 'The reply returns on this connection. Do not add a reverse wire.';
  if (target.type === 'database') return { valid: true, request: 'Look up a destination or save a new mapping.', response: 'A saved destination, not-found result, or write acknowledgement.', note: 'The API calls storage directly, including after a cache miss.', reply };
  if (target.type === 'cache') return { valid: true, request: 'Look up a cached mapping; fill it after a successful storage read.', response: 'A cached destination or a cache miss.', note: 'On a miss, the API—not the cache—calls the database.', reply };
  if (target.type === 'idGenerator') return { valid: true, request: 'Allocate a code for a new link. Redirects do not call this service.', response: 'A code candidate; the API must still save the mapping.', note: caller.strategy === 'service' ? 'This API selected the dedicated ID service strategy.' : `This wire will be idle while the API uses ${STRATEGIES[caller.strategy || 'sequence'].name}. A separate ID service is optional.`, reply };
  if (target.type === 'loadBalancer') return { valid: true, request: 'Forward visitor requests to one of the connected APIs.', response: 'The result from the chosen API.', note: 'Traffic is shared evenly; each API still needs its own dependencies.', reply };
  if (target.type === 'cdn') return { valid: true, request: 'Ask the edge to handle a redirect or creation.', response: 'A cached redirect, or the origin’s result.', note: 'Misses and creations continue to the origin. A working origin is still required.', reply };
  return { valid: true, request: caller.type === 'cdn' ? 'Forward cache misses and creations to this API.' : 'Send a redirect or creation request to this API.', response: 'A redirect destination, a new short code, or a failure.', note: caller.type === 'loadBalancer' ? 'This API receives its share of the balancer’s traffic.' : 'The API coordinates any storage, cache and allocation calls.', reply };
}
