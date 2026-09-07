import { LEARNING_RESOURCES } from './learningResources.js';

export default function LearningResources({ type }) {
  return <details className="l1-learning-resources" key={type}>
    <summary>Go deeper · real-world configuration</summary>
    <p>Optional official reading · opens in a new tab. Your board stays here.</p>
    <ul>{LEARNING_RESOURCES[type]?.map(([label, question, href]) => <li key={href}><a href={href} target="_blank" rel="noopener noreferrer">{label} ↗<span className="sr-only"> (opens in a new tab)</span></a><p>{question}</p></li>)}</ul>
    <p>Game prices, size tiers and ops/s are not AWS/GCP quotes or equivalent configurations. Real systems also need security, monitoring and billing decisions. Nothing is deployed from this game.</p>
  </details>;
}
