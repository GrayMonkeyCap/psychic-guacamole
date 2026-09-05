import { validate } from './levelModel.js';

export const LINK_LIMIT = 20;
export const createLinkExperiment = () => ({ records: [], caches: {}, sequences: {}, serviceSequence: 100000, randomState: 12345 });
const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const base62 = number => { let code = ''; do { code = alphabet[number % 62] + code; number = Math.floor(number / 62); } while (number); return code; };
const event = (node, title, detail) => ({ node, title, detail });
export function experimentContext(design, apiId) {
  const validity = validate(design);
  if (!validity.valid) return { error: validity.issues[0].text, apis: validity.apis };
  const api = validity.apis.find(n => n.id === apiId) || validity.apis[0];
  const deps = design.edges.filter(e => e.from === api.id).map(e => design.nodes.find(n => n.id === e.to));
  const database = deps.find(n => n.type === 'database'), cache = deps.find(n => n.type === 'cache'), allocator = deps.find(n => n.type === 'idGenerator');
  return { apis: validity.apis, api, database, cache, allocator };
}
const fail = (state, message, events = []) => ({ state, result: { ok: false, message, events } });

export function createExperimentLink(state, design, destination, options = {}) {
  const context = experimentContext(design, options.apiId);
  if (context.error) return fail(state, context.error);
  let url;
  try {
    url = new URL(destination);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.href.length > 2048) throw new Error();
  } catch { return fail(state, 'Use an http or https destination without credentials (up to 2,048 characters). Nothing was saved.'); }
  if (state.records.length >= LINK_LIMIT) return fail(state, `This experiment holds ${LINK_LIMIT} links. Reset the experiment to try again; your architecture and traffic passes are unaffected.`);
  const { api, database, allocator } = context, strategy = api.strategy || 'sequence';
  const next = { ...state, records: [...state.records], sequences: { ...state.sequences } }, events = [];
  const existing = state.records.find(r => r.database === database.id);
  for (let attempt = 0; attempt < 8; attempt++) {
    let code, owner = api.id;
    if (strategy === 'sequence') {
      next.sequences[database.id] = (next.sequences[database.id] || 0) + 1;
      code = base62(next.sequences[database.id]); owner = database.id;
    } else if (strategy === 'service') {
      code = base62(next.serviceSequence++); owner = allocator.id;
    } else {
      // Seeded toy generator for reproducibility, not production randomness.
      next.randomState = (Math.imul(next.randomState, 1664525) + 1013904223) >>> 0;
      code = base62(next.randomState).padStart(7, '0');
      if (options.forceCollision && existing && attempt === 0) code = existing.code;
    }
    events.push(event(owner, 'Allocate a candidate code', `${code} · ${strategy === 'sequence' ? 'database sequence + Base62' : strategy === 'service' ? 'dedicated allocator' : 'seeded toy random generator'}`));
    if (next.records.some(r => r.database === database.id && r.code === code)) {
      events.push(event(database.id, 'UNIQUE rejected the candidate', `${code} already belongs to another mapping. Keep that mapping intact and try another code.`));
      continue;
    }
    next.records.push({ database: database.id, code, destination: url.href });
    events.push(event(database.id, 'Mapping committed to the table', `${code} → ${url.href}`));
    events.push(event(api.id, '201 · Return the short code', 'Success is returned only after the mapping is saved.'));
    return { state: next, result: { ok: true, kind: 'create', code, destination: url.href, message: `Created lnk / ${code}`, events } };
  }
  return fail(next, 'Candidate retry limit reached. No existing mapping was overwritten.', events);
}

export function openExperimentLink(state, design, code, options = {}) {
  const context = experimentContext(design, options.apiId);
  if (context.error) return fail(state, context.error);
  const { api, database, cache } = context, events = [];
  // Cache scope includes the source database, preventing stale demo data after rewiring.
  const cacheKey = cache ? JSON.stringify([cache.id, database.id, code]) : null;
  if (cache && Object.hasOwn(state.caches, cacheKey)) {
    const destination = state.caches[cacheKey];
    events.push(event(cache.id, 'Cache hit', 'Return the cached mapping to the API. No database lookup needed.'));
    events.push(event(api.id, '302 · Return the destination', destination));
    return { state, result: { ok: true, kind: 'open', code, destination, source: 'cache', message: 'Opened from a cached copy', events } };
  }
  if (cache) events.push(event(cache.id, 'Cache miss returns to API', 'The API—not the cache—will call the database.'));
  const record = state.records.find(r => r.database === database.id && r.code === code);
  if (!record) {
    events.push(event(database.id, 'Mapping not found', 'Do not cache a made-up destination.'));
    return fail(state, '404 · No saved mapping for this code in the connected database.', events);
  }
  events.push(event(database.id, 'Read the saved mapping', `${code} → ${record.destination}`));
  const next = cache ? { ...state, caches: { ...state.caches, [cacheKey]: record.destination } } : state;
  if (cache) events.push(event(api.id, 'API fills the cache', `Store a copy in ${cache.id}; the database remains the source.`));
  events.push(event(api.id, '302 · Return the destination', record.destination));
  return { state: next, result: { ok: true, kind: 'open', code, destination: record.destination, source: 'database', message: 'Opened from the saved database mapping', events } };
}

export const clearExperimentCaches = state => ({ ...state, caches: {} });
