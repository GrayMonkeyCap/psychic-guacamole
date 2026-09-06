import { useState } from 'react';
import { CATALOG, LIMIT } from './levelModel.js';
import { capacityPreview } from './capacityPreview.js';
const number = value => value.toLocaleString(undefined, { maximumFractionDigits: 0 });
const amount = (value, unit) => `${unit === '$' ? '$' : ''}${number(value)}${unit === '%' ? '%' : ''}`;
export default function CapacityPicker({ design, node, disabled, onApply }) {
  const [proposed, setProposed] = useState(node.tier);
  const config = CATALOG[node.type], preview = capacityPreview(design, node.id, proposed);
  return <section className="l1-capacity-picker" aria-label="Capacity planner">
    <div className="l1-section-label">CAPACITY <span>PREVIEW BEFORE APPLYING</span></div>
    <div className="l1-tiers" role="group" aria-label="Preview a capacity tier">{config.tiers.map((tier, i) => <button disabled={disabled} key={i} className={proposed === i ? 'active' : ''} aria-pressed={proposed === i} onClick={() => setProposed(i)}><strong>{tier.name}</strong><b>${tier.cost}</b><small>{number(tier.capacity)} /s</small><small>{node.tier === i ? 'Current' : 'Preview'}</small></button>)}</div>
    <p className="l1-capacity-note">{preview.note}</p>
    {preview.changed ? <div className="l1-capacity-preview" role="region" aria-label="Proposed capacity change">
      <table><caption>{preview.name} tier · not applied yet</caption><thead><tr><th scope="col">Measure</th><th scope="col">Now</th><th scope="col">Preview</th></tr></thead><tbody>{preview.rows.map(row => <tr key={row.label}><th scope="row">{row.label}</th><td>{amount(row.current, row.unit)}</td><td>{amount(row.next, row.unit)}</td></tr>)}</tbody></table>
      <p role="status">{preview.costDelta >= 0 ? '+' : '−'}${Math.abs(preview.costDelta)}/month. Whole board: ${preview.total} / ${LIMIT}.{preview.overBudget > 0 ? ` $${preview.overBudget} over budget; traffic testing will be blocked.` : ` $${LIMIT - preview.total} budget remaining.`}</p>
      <p>Applying changes behavior and clears this traffic recording. Existing earned passes stay recorded; retest this new design.</p>
      <button className="l1-primary" disabled={disabled} onClick={() => onApply(proposed)}>Apply {preview.name} tier</button><button className="l1-text-button" disabled={disabled} onClick={() => setProposed(node.tier)}>Cancel tier preview</button>
    </div> : <p className="l1-capacity-note">Choose a tier to compare its cost and limits. Nothing changes until you apply.</p>}
  </section>;
}
