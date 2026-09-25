export default function PollList({ polls = [], onVote }) {
  return <section><h1>Polls</h1>{polls.map((poll) => <article key={poll.id}><h2>{poll.question}</h2>{poll.options?.map((option) => <button key={option.id} onClick={() => onVote?.(poll, option)}>{option.label}</button>)}</article>)}{polls.length === 0 && <p>No active polls.</p>}</section>
}
