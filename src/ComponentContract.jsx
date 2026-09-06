import { componentContract } from './componentContracts.js';
export default function ComponentContract({ design, node }) {
  const facts = componentContract(design, node.id);
  if (!facts) return null;
  return <section className="l1-component-contract" aria-label="Component request and reply">
    <dl><dt>Receives</dt><dd>{facts.receives}</dd><dt>Returns</dt><dd>{facts.returns}</dd></dl>
    <details key={node.id}><summary>State, limits & alternatives</summary>
      <dl><dt>Remembers</dt><dd>{facts.state}</dd><dt>In your board</dt><dd>{facts.activity}{facts.strategy && <p>Code allocation: {facts.strategy}.</p>}</dd><dt>Cannot solve</dt><dd>{facts.limit}</dd><dt>Another way</dt><dd>{facts.alternative}</dd></dl>
      <p className="l1-contract-note">These are service responsibilities. Traffic tests model capacity; they do not run real servers or persist real link data.</p>
    </details>
  </section>;
}
