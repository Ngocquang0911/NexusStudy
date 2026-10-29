export default function BrandLogo({ variant = 'dark', markOnly = false, className = '' }) {
  const asset = markOnly
    ? `nexus-study-icon${variant === 'light' ? '-white' : ''}.png`
    : `nexus-study-logo${variant === 'light' ? '-white' : ''}.png`

  return (
    <img
      className={`brand-image ${className}`.trim()}
      src={`/branding/${asset}`}
      alt={markOnly ? 'Nexus Study' : 'Nexus Study logo'}
      draggable="false"
    />
  )
}
