import Link from 'next/link'

const IconArrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
)

export function LandingCTA() {
  return (
    <section className="rai-cta">
      <div className="rai-container rai-cta-inner">
        <h2 className="rai-cta-h2">
          Ready to write your best<br />specification yet?
        </h2>
        <p className="rai-cta-sub">
          Stop struggling with research specs — your first one is free, generated end-to-end in minutes.
        </p>
        <div className="rai-cta-btns">
          <Link href="/register" className="rai-btn-white">
            Start for free <IconArrow />
          </Link>
          <a href="#how" className="rai-btn-outline-w">See how it works</a>
        </div>
      </div>
    </section>
  )
}
