export default function EvaluationResult({ result }) {
  if (!result) return <p>No evaluation result available.</p>
  return <section><h1>Contribution report</h1><strong>{result.score}%</strong><p>{result.sampleSize} responses included.</p></section>
}
