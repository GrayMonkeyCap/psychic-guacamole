import { componentChoice } from './componentChoices.js';

export default function ComponentAdvice(props) {
  const advice = componentChoice(props);
  if (!advice) return null;
  return <section className="l1-choice-advice" aria-label="Why consider this component">
    <h3>Why consider it now?</h3><p>{advice.reason}</p>
    <p>{advice.activity}</p>
    <p className="l1-choice-evidence">{advice.evidence}</p>
    <details><summary>Trade-off & another way</summary><p>{advice.limit}</p><p>{advice.alternative}</p></details>
  </section>;
}
