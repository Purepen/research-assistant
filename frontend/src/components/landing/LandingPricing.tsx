import Link from 'next/link'

const IconCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

const PLANS = [
  {
    tier: 'Starter',
    price: 'Free',
    period: 'No credit card needed',
    desc: 'Perfect for trying ResearchAI with your first specification.',
    cta: 'Get started free',
    ctaClass: 'rai-btn-price-outline',
    featured: false,
    features: [
      '1 specification/month',
      'Up to 2 web searches',
      '2 refinement iterations',
      'DOCX export',
    ],
  },
  {
    tier: 'Pro',
    price: '£9',
    priceSuffix: '.99',
    period: 'per specification',
    desc: 'For students who want the best possible spec, fully optimised.',
    cta: 'Get Pro spec →',
    ctaClass: 'rai-btn-price-green',
    featured: true,
    features: [
      'Unlimited specifications',
      'Up to 10 web searches',
      '5 refinement iterations',
      'Past project upload (5 files)',
      'Priority generation queue',
      'DOCX + PDF export',
    ],
  },
  {
    tier: 'Unlimited',
    price: '£24',
    priceSuffix: '.99',
    period: 'per month',
    desc: 'For researchers who need to generate multiple specs regularly.',
    cta: 'Go unlimited',
    ctaClass: 'rai-btn-price-solid',
    featured: false,
    features: [
      'Everything in Pro',
      'Unlimited specifications',
      'Unlimited past projects',
      'Email notifications',
      'Dedicated support',
    ],
  },
]

export function LandingPricing() {
  return (
    <section className="rai-pricing" id="pricing">
      <div className="rai-container">
        <div className="rai-section-header">
          <span className="rai-tag">Pricing</span>
          <h2 className="rai-h2">Simple, transparent pricing</h2>
          <p className="rai-section-sub">
            No hidden fees. Pay once per specification or go unlimited.
          </p>
        </div>

        <div className="rai-pricing-grid">
          {PLANS.map((plan, i) => (
            <div
              key={i}
              className={`rai-price-card${plan.featured ? ' featured' : ''}`}
            >
              {plan.featured && <div className="rai-popular">Most Popular</div>}

              <div className="rai-price-tier">{plan.tier}</div>

              <div className="rai-price-main">
                {plan.price}
                {plan.priceSuffix && (
                  <span style={{ fontSize: '1.05rem', fontWeight: 500 }}>
                    {plan.priceSuffix}
                  </span>
                )}
              </div>

              <div className="rai-price-period">{plan.period}</div>
              <p className="rai-price-desc">{plan.desc}</p>

              <Link href="/register" className={plan.ctaClass}>
                {plan.cta}
              </Link>

              <div className="rai-price-features">
                {plan.features.map((f, j) => (
                  <div key={j} className="rai-price-feature">
                    <span className="rai-check"><IconCheck /></span>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
