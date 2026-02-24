const STATS = [
  { num: '4,500+', label: 'Specifications Generated' },
  { num: '94%',    label: 'Average Completeness Score' },
  { num: '3 min',  label: 'Average Generation Time' },
  { num: '4.8 ★',  label: 'Student Rating' },
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
