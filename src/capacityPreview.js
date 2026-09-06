import { CATALOG, costOf, LIMIT } from './levelModel.js';

export function capacityPreview(design, nodeId, tierIndex) {
  const node = design.nodes.find(n => n.id === nodeId), config = CATALOG[node?.type];
  if (!config || !Number.isInteger(tierIndex) || !config.tiers[tierIndex]) return null;
  const current = config.tiers[node.tier], next = config.tiers[tierIndex];
  const costDelta = next.cost - current.cost, total = costOf(design.nodes) + costDelta;
  const rows = [{ label: 'Component / month', current: current.cost, next: next.cost, unit: '$' },
    { label: node.type === 'database' ? 'All-read ceiling /s' : 'Work capacity /s', current: current.capacity, next: next.capacity }];
  if (current.writes) rows.push({ label: 'All-write ceiling /s', current: current.writes, next: next.writes });
  if (current.coverage) rows.push({ label: 'Hot-key coverage factor', current: Math.round(current.coverage * 100), next: Math.round(next.coverage * 100), unit: '%' });
  const note = node.type === 'database' ? 'Reads and writes share capacity. These ceilings describe all-read or all-write work, not two independent budgets. Allocation can add write work.'
    : ['cache', 'cdn'].includes(node.type) ? 'Coverage is a game-model factor, not a promised hit rate. Repeated demand, cold starts and successful fills determine actual hits; lookups and fills use capacity.'
      : node.type === 'api' ? 'Capacity is modeled work, not always user requests. Code allocation adds compute; a faster API cannot remove a downstream bottleneck.'
        : 'This component has its own work limit. Increasing it does not increase the capacity of the services it calls.';
  return { name: next.name, changed: node.tier !== tierIndex, costDelta, total, overBudget: Math.max(0, total - LIMIT), rows, note };
}
