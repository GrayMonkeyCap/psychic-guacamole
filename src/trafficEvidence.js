import { CATALOG, STRATEGIES } from './levelModel.js';

export function componentLabel(design, id) {
  const node = design.nodes.find(n => n.id === id);
  if (!node) return 'Unknown component';
  if (node.type === 'internet') return 'Visitors';
  const peers = design.nodes.filter(n => n.type === node.type);
  return `${CATALOG[node.type]?.name || 'Component'}${peers.length > 1 ? ` ${peers.findIndex(n => n.id === id) + 1}` : ''}`;
}

// Interpret RECORDED dependency calls, never search the graph for a preferred API.
// Reply steps describe the model's synchronous call contract; not packet timing.
export function traceOutcome(design, outcome) {
  if (!outcome || !Array.isArray(outcome.calls)) return [];
  const nodes = Object.fromEntries(design.nodes.map(n => [n.id, n]));
  if (outcome.reason === 'invalid') return [{ node: outcome.blockedBy, title: 'No request executed', detail: 'The architecture did not satisfy the functional contract. No dependency calls were executed.' }];
  const kind = outcome.kind, stack = [], steps = [];
  const cacheStatus = id => outcome.cacheDecisions?.find(d => d.node === id)?.status;
  const reply = (call, failed = false) => {
    const source = nodes[call.to], status = cacheStatus(call.to);
    let title = failed ? 'Return the rejection' : status === 'miss' && source.type === 'cache' ? 'Cache miss returns to API' : source.type === 'idGenerator' ? 'Return allocated code' : source.type === 'database' ? kind === 'write' ? 'Commit acknowledged' : 'Return stored destination' : status === 'hit' ? 'Return cached destination' : 'Return the result';
    if (call.from === 'internet') title = failed ? 'Request rejected · no successful result' : kind === 'read' ? 'Redirect delivered' : 'Short link created';
    const detail = failed ? 'The rejection returns along the existing call. No successful mapping or redirect is claimed.'
      : status === 'miss' && source.type === 'cache' ? 'No cached mapping was found. The API receives the miss and decides to call storage; the cache does not call the database.'
      : source.type === 'database' && kind === 'write' ? 'The mapping has been accepted by durable storage before the API reports success. Actual keys and disk commits are abstracted by the simulator.'
      : 'The result travels back on the original connection. No reverse wire is needed.';
    steps.push({ node: call.from, from: call.to, reply: true, title, detail });
  };
  for (const call of outcome.calls) {
    if (!nodes[call.from] || !nodes[call.to]) return [];
    // A sibling dependency begins only after the previous one returns to caller.
    while (stack.length && stack.at(-1).to !== call.from) reply(stack.pop());
    const target = nodes[call.to], caller = componentLabel(design, call.from);
    const title = target.type === 'cache' ? 'Check the cache' : target.type === 'idGenerator' ? 'Request a code' : target.type === 'database' ? kind === 'read' ? 'Read the saved mapping' : 'Persist the new mapping' : `Call ${componentLabel(design, call.to)}`;
    const policy = nodes[call.from].type === 'api' ? STRATEGIES[nodes[call.from].strategy || 'sequence'] : null;
    const detail = target.type === 'database' ? `${caller} calls storage directly. ${kind === 'write' && policy ? `Code strategy: ${policy.name}. Uniqueness and durable persistence are required.` : 'A successful read supplies the destination.'}`
      : target.type === 'cache' ? `${caller} checks for a cached mapping. The recorded result is ${outcome.blockedBy === call.to ? 'a capacity rejection' : cacheStatus(call.to) || 'unavailable'}.`
      : `${caller} made this dependency call in the selected traffic sample.`;
    steps.push({ node: call.to, from: call.from, title, detail });
    stack.push(call);
    if (call.to === outcome.blockedBy) {
      steps.push({ node: call.to, title: 'Capacity rejected this work', detail: 'This group of requests stopped here. No later dependency ran for these requests.' });
      break;
    }
  }
  if (!outcome.blockedBy && outcome.calls.length) {
    const terminal = outcome.calls.at(-1).to;
    if (cacheStatus(terminal) === 'hit') steps.push({ node: terminal, title: 'Cache hit · origin skipped', detail: 'This group completed from memory. No downstream origin lookup was made.' });
  }
  while (stack.length) reply(stack.pop(), Boolean(outcome.blockedBy));
  return steps;
}
