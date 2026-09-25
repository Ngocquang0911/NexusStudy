import { ArrowRight } from 'lucide-react'

export default function PlaceholderPage({ eyebrow = 'NEXUS STUDY', title, description, action }) {
  return <section className="placeholder-page"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p>{action && <button className="primary-action">{action}<ArrowRight size={16} /></button>}</section>
}
