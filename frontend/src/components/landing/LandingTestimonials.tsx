const FACTS = [
  { name: 'CrossRef',   detail: 'every DOI independently verified' },
  { name: 'Examiner AI', detail: 'reviewed against your rubric' },
  { name: 'Your guidelines', detail: 'parsed, not guessed' },
]

const USE_CASES = [
  {
    field: 'Econometrics & Finance',
    desc: 'Causal designs done properly — identification strategy, treatment and outcome variables, robustness checks, and a work plan that matches how empirical economics is actually supervised.',
    color: '#16a34a',
    initials: 'EC',
  },
  {
    field: 'Machine Learning & Systems',
    desc: 'Model selection justified against baselines, evaluation metrics fixed up front, dataset profiling built in — specs that survive a technical supervisor’s first read.',
    color: '#15803d',
    initials: 'ML',
  },
  {
    field: 'Surveys & Qualitative',
    desc: 'Sampling frames, instrument design, ethics and positionality written as original prose from your project’s facts — never boilerplate pasted between students.',
    color: '#22c55e',
    initials: 'SQ',
  },
  {
    field: 'Systematic Reviews',
    desc: 'Search strategy, inclusion criteria and PRISMA-style flow scoped from your guidelines, with a citation pool that’s verified before it’s cited.',
    color: '#059669',
    initials: 'SR',
  },
  {
    field: 'Any department’s format',
    desc: 'Upload the brief your department actually uses — word limits, section structure and marking criteria are read from your document, not assumed.',
    color: '#0f766e',
    initials: 'AF',
  },
]

function UseCaseCard({ t }: { t: typeof USE_CASES[0] }) {
  return (
    <div className="rai-testi-card">
      <p className="rai-testi-text">{t.desc}</p>
      <div className="rai-testi-author">
        <div className="rai-avatar" style={{ background: t.color }}>{t.initials}</div>
        <div>
          <div className="rai-testi-name">{t.field}</div>
        </div>
      </div>
    </div>
  )
}

export function LandingTestimonials() {
  return (
    <section className="rai-testimonials" id="testimonials">
      <div className="rai-container">
        <div className="rai-section-header">
          <span className="rai-tag">Use cases</span>
          <h2 className="rai-h2">Built for how research is actually graded</h2>
          <p className="rai-section-sub">
            The pipeline detects your project&apos;s research paradigm and writes to its
            standards — not to a generic template.
          </p>
        </div>

        {/* Product-facts bar (replaces the review-scores bar) */}
        <div className="rai-reviews-bar">
          {FACTS.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              {i > 0 && <div className="rai-vdivider" />}
              <div className="rai-rp">
                <span className="rai-rp-name">{r.name}</span>
                <span className="rai-rp-score">{r.detail}</span>
              </div>
            </div>
          ))}
        </div>

        {/* First row — 3 cards */}
        <div className="rai-testi-grid">
          {USE_CASES.slice(0, 3).map((t, i) => (
            <UseCaseCard key={i} t={t} />
          ))}
        </div>

        {/* Second row — 2 cards centred */}
        <div className="rai-testi-grid-2">
          {USE_CASES.slice(3).map((t, i) => (
            <UseCaseCard key={i} t={t} />
          ))}
        </div>
      </div>
    </section>
  )
}
