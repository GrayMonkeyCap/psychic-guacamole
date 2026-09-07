import { CATALOG, CHAPTERS } from './levelModel.js';
import { componentContract, componentResponsibilities } from './componentContracts.js';

// Read-only guidance: suggestions describe tradeoffs, never grade a preferred topology.
export function componentChoice({ design, type, chapter = CHAPTERS[0], frame, node }) {
  if (!CATALOG[type]) return null;
  const matching = design.nodes.filter(n => n.type === type);
  const apis = design.nodes.filter(n => n.type === 'api');
  const serviceUsers = apis.filter(n => n.strategy === 'service');
  const reasons = {
    api: apis.length ? 'You already have application logic. Consider more compute only if API work is the constraint; another replica needs a traffic-sharing route.' : 'There is no API yet. Visitors need application logic to turn a URL into a saved short link and look it up later.',
    database: matching.length ? 'You already have storage. Connect every API to the same primary; inspect its capacity before adding more pieces.' : 'There is no database yet. A successful creation must save the code → destination mapping so another request can find it.',
    cache: chapter.reads > .5 ? `${Math.round(chapter.reads * 100)}% of forecast requests are redirects. Reusing popular mappings can reduce database reads after warming.` : `${Math.round((1 - chapter.reads) * 100)}% of forecast requests create new links. A cache cannot save these writes; investigate storage and allocation work first.`,
    loadBalancer: apis.length < 2 ? `You have ${apis.length} API ${apis.length === 1 ? 'replica' : 'replicas'}. A balancer alone adds no API capacity; compare upgrading one API with adding routed replicas.` : `You have ${apis.length} API replicas. A balancer can share incoming requests across connected replicas, but all still depend on shared storage.`,
    idGenerator: serviceUsers.length ? `${serviceUsers.length} API ${serviceUsers.length === 1 ? 'uses' : 'use'} the dedicated strategy. Those APIs need a connected allocator—or you can change their strategy.` : 'No API uses the dedicated strategy. Database sequence and random codes both work without this service; placing it alone does not change allocation.',
    cdn: chapter.reads > .5 ? `In the forecast, ${Math.round(chapter.hot * 100)}% of redirect reads revisit the hot link. Cached public redirects can spare both API and database work after warming.` : 'Most forecast requests create links. Edge caching only reuses public redirects; creations and misses still need the origin.',
  };
  const facts = node ? componentContract(design, node.id) : componentResponsibilities(type);
  const observed = node ? [node] : matching;
  const loads = observed.map(n => frame?.loads?.[n.id]).filter(Boolean);
  const number = n => n.toLocaleString(undefined, { maximumFractionDigits: 1 });
  const evidence = frame ? loads.length
    ? `Recorded sample ${Number(frame.time).toFixed(1)}s · ${node ? 'this component' : `across ${loads.length} observed ${CATALOG[type].name.toLowerCase()} component(s)`}: ${number(loads.reduce((sum, l) => sum + l.rate, 0))} ops/s offered; ${number(loads.reduce((sum, l) => sum + l.rejected, 0))} requests/s rejected here. This sample alone does not prove a fix.`
    : 'No work recorded for this choice in the selected sample. It may be absent, unused, or blocked upstream; check its connections.'
    : 'Forecast only—not a measured bottleneck. Send traffic, inspect a failed path, then change one thing and retry.';
  return { reason: reasons[type], alternative: facts.alternative, limit: facts.limit, activity: node ? facts.activity : `${matching.length} on your board. Adding a component does not connect or configure it.`, evidence };
}
