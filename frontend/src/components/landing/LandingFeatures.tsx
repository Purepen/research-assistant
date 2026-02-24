const FEATURES = [
  {
    icon: '📋',
    title: 'Guideline-Aware Generation',
    desc: "Upload your university's specific guidelines. ResearchAI understands word limits, structure requirements, and marking criteria — and builds your spec accordingly.",
  },
  {
    icon: '🔍',
    title: 'Intelligent Web Research',
    desc: 'Automatically searches the web for relevant literature and recent research. Every claim in your specification is grounded in real academic sources.',
  },
  {
    icon: '📚',
    title: 'Past Project Learning',
    desc: "Upload past successful projects. ResearchAI learns the patterns, tone, and depth your institution expects — then exceeds them.",
  },
  {
    icon: '🔄',
    title: 'Multi-Iteration Refinement',
    desc: 'Your specification goes through up to 5 review iterations, each improving quality, novelty scores, and completeness — automatically.',
  },
  {
    icon: '📊',
    title: 'Live Progress Tracking',
    desc: 'Watch your specification being built in real time. See each phase complete with live progress updates and quality scores.',
  },
  {
    icon: '⬇️',
    title: 'One-Click Export',
    desc: 'Download your finished specification as a clean, properly formatted Word document — ready to submit or present to your supervisor.',
  },
]

export function LandingFeatures() {
  return (
    <section className="rai-features" id="features">
      <div className="rai-container">
        <div className="rai-section-header">
          <span className="rai-tag">Features</span>
          <h2 className="rai-h2">
            Everything you need for a<br />first-class specification
          </h2>
          <p className="rai-section-sub">
            ResearchAI reads your exact guidelines and generates a structured,
            cited, academically sound specification — in minutes.
          </p>
        </div>

        <div className="rai-features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="rai-feature-card">
              <div className="rai-feature-icon">{f.icon}</div>
              <div className="rai-feature-title">{f.title}</div>
              <p className="rai-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
