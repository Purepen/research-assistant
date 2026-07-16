const STATS = [
  { num: '73',   label: 'Specifications Generated' },
  { num: '7',    label: 'AI Pipeline Phases' },
  { num: '15+',  label: 'Verified Sources Per Spec' },
  { num: '£0',   label: 'Your First Spec' },
]

export function LandingStats() {
  return (
    <section className="rai-stats">
      <div className="rai-container">
        <div className="rai-stats-grid">
          {STATS.map((s, i) => (
            <div key={i} className="rai-stat">
              <div className="rai-stat-num">{s.num}</div>
              <div className="rai-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
