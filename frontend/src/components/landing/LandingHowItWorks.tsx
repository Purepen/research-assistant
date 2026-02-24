const IconCheck = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

const STEPS = [
  {
    num: '1',
    title: 'Enter your research details',
    desc: 'Tell us your field, topic, and academic level (BSc, MSc, PhD). Takes under 60 seconds.',
  },
  {
    num: '2',
    title: 'Upload your guideline documents',
    desc: "Drop in your university's guideline PDF or DOCX and any past project examples you want the AI to learn from.",
  },
  {
    num: '3',
    title: 'Configure & launch',
    desc: 'Set effort level, max iterations, and web search depth. Hit generate and watch ResearchAI work live.',
  },
  {
    num: '4',
    title: 'Review, refine & download',
    desc: 'Review your scored specification, request refinements if needed, and export a polished Word document.',
  },
]

export function LandingHowItWorks() {
  return (
    <section className="rai-how" id="how">
      <div className="rai-container">
        <div className="rai-section-header">
          <span className="rai-tag">How it works</span>
          <h2 className="rai-h2">
            From guidelines to<br />submission-ready in 4 steps
          </h2>
          <p className="rai-section-sub">
            No technical skills needed. Just upload, configure, and download.
          </p>
        </div>

        <div className="rai-how-grid">
          {/* Steps list */}
          <div className="rai-steps">
            {STEPS.map((s, i) => (
              <div key={i} className="rai-step">
                <div className="rai-step-num">{s.num}</div>
                <div>
                  <div className="rai-step-title">{s.title}</div>
                  <p className="rai-step-desc">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Spec preview visual */}
          <div className="rai-spec-box">
            <div className="rai-spec-emoji">🤖</div>
            <div className="rai-spec-title">AI is writing your specification</div>
            <p className="rai-spec-sub">
              Powered by advanced language models, guided by your actual university requirements.
            </p>
            <div className="rai-spec-preview">
              <div className="rai-spec-line" style={{ width: '92%' }} />
              <div className="rai-spec-line" style={{ width: '74%', animationDelay: '0.2s' }} />
              <div className="rai-spec-line" style={{ width: '61%', animationDelay: '0.4s' }} />
              <div className="rai-spec-line" style={{ width: '85%', animationDelay: '0.6s' }} />
              <div className="rai-spec-tag">
                <IconCheck /> 94% completeness · Novelty: High
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
