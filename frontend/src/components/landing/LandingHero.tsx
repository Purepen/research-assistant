'use client'

import Link from 'next/link'

const IconArrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
)

const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

export function LandingHero() {
  return (
    <section className="rai-hero">
      <div className="rai-container">
        <div className="rai-hero-inner">

          {/* ── Left copy ── */}
          <div>
            <div className="rai-badge">✦ AI-Powered Research Specifications</div>

            <h1 className="rai-h1">
              Generate your{' '}<br />
              <em>perfect research</em>{' '}<br />
              spec in minutes
            </h1>

            <p className="rai-sub">
              Upload your university guidelines, let ResearchAI do the heavy lifting.
              Get a fully structured, academically sound project specification — ready to submit.
            </p>

            <div className="rai-hero-ctas">
              <Link href="/register" className="rai-btn-hero">
                Start for free <IconArrow />
              </Link>
              <a href="#how" className="rai-btn-outline">See how it works</a>
            </div>

            <div className="rai-trust">
              <span className="rai-trust-item"><IconCheck /> No credit card required</span>
              <span className="rai-trust-item"><IconCheck /> MSc &amp; PhD ready</span>
              <span className="rai-trust-item"><IconCheck /> First spec free</span>
            </div>
          </div>

          {/* ── Right mockup card ── */}
          <div className="rai-hero-right">

            {/* Top floating badge */}
            <div className="rai-float-a">
              <div className="rai-float-icon" style={{ background: '#dcfce7' }}>🎓</div>
              <div>
                <div className="rai-float-sub">Score</div>
                <div>94% Completeness</div>
              </div>
            </div>

            {/* Main card */}
            <div className="rai-hero-card">
              <div className="rai-card-hdr">
                <div className="rai-dot" style={{ background: '#fc8181' }} />
                <div className="rai-dot" style={{ background: '#f6c90e' }} />
                <div className="rai-dot" style={{ background: '#48bb78' }} />
                <span className="rai-card-title">ResearchAI — Generating Spec</span>
              </div>

              <div className="rai-prog-label">
                <span>Generating your specification...</span>
                <span style={{ color: '#16a34a', fontWeight: 700 }}>78%</span>
              </div>
              <div className="rai-prog-bg">
                <div className="rai-prog-fill" />
              </div>

              <div className="rai-phases">
                <div className="rai-phase done">
                  <div className="rai-phase-dot" />✓ &nbsp;Guidelines analyzed
                </div>
                <div className="rai-phase done">
                  <div className="rai-phase-dot" />✓ &nbsp;Past projects reviewed
                </div>
                <div className="rai-phase active">
                  <div className="rai-phase-dot" />⚙ &nbsp;Writing specification...
                </div>
                <div className="rai-phase pending">
                  <div className="rai-phase-dot" />○ &nbsp;Quality review
                </div>
                <div className="rai-phase pending">
                  <div className="rai-phase-dot" />○ &nbsp;Final export
                </div>
              </div>
            </div>

            {/* Bottom floating badge */}
            <div className="rai-float-b">
              <div className="rai-float-icon" style={{ background: '#eff6ff' }}>📄</div>
              <div>
                <div className="rai-float-sub">Output</div>
                <div>3,200 words ready</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}
