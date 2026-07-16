import Link from 'next/link'

const IconCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

const IconKey = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="8" cy="15" r="4.5"/><path d="m11.5 11.5 8-8M16 7l3 3"/>
  </svg>
)

const FREE_FEATURES = [
  '1 full research specification — free',
  '1 Topic Lab session — discover, scout or vet a topic',
  'Complete 7-phase AI pipeline, examiner-reviewed',
  'CrossRef-verified citations',
  'Formatted DOCX export, ready to submit',
  'No credit card required',
]

export function LandingPricing() {
  return (
    <section className="rai-pricing" id="pricing">
      <div className="rai-container">
        <div className="rai-section-header">
          <span className="rai-tag">Pricing</span>
          <h2 className="rai-h2">Start free. Bring your own key to go further.</h2>
          <p className="rai-section-sub">
            Your first specification and your first Topic Lab session are on us —
            no card, no commitment.
          </p>
        </div>

        <div className="rai-pricing-grid" style={{ gridTemplateColumns: '1fr', maxWidth: 440 }}>
          <div className="rai-price-card featured">
            <div className="rai-popular">Free to start</div>

            <div className="rai-price-tier">Free</div>

            <div className="rai-price-main">£0</div>

            <div className="rai-price-period">No credit card needed</div>
            <p className="rai-price-desc">
              Try the full product — one complete specification and one Topic Lab
              session, generated end-to-end on us.
            </p>

            <Link href="/register" className="rai-btn-price-green">
              Get started free
            </Link>

            <div className="rai-price-features">
              {FREE_FEATURES.map((f, j) => (
                <div key={j} className="rai-price-feature">
                  <span className="rai-check"><IconCheck /></span>
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BYOK — advanced usage */}
        <div style={{
          maxWidth: 640, margin: '26px auto 0', display: 'flex', gap: 14, alignItems: 'flex-start',
          background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '18px 22px',
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11, background: '#dcfce7', color: '#16a34a',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
          }}>
            <IconKey />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '.95rem', color: '#0f1f0f', marginBottom: 4 }}>
              Want more? Bring your own OpenAI key.
            </div>
            <p style={{ margin: 0, fontSize: '.85rem', color: '#374151', lineHeight: 1.65 }}>
              Add your own API key in your profile and generate unlimited specifications
              and Topic Lab sessions — you pay OpenAI directly for what you use, nothing
              to us. Your key is encrypted at rest, and you can choose premium model
              tiers per agent for even stronger results.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
