'use client'

import Link from 'next/link'

const IconArrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
)

const IconLayers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
    <polyline points="2 17 12 22 22 17"/>
    <polyline points="2 12 12 17 22 12"/>
  </svg>
)

export function LandingNav() {
  return (
    <nav className="rai-nav">
      <div className="rai-nav-inner">
        <Link href="/" className="rai-logo">
          <div className="rai-logo-icon"><IconLayers /></div>
          <span className="rai-logo-text">Research<span>AI</span></span>
        </Link>

        <ul className="rai-nav-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#how">How it works</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href="#testimonials">Reviews</a></li>
        </ul>

        <div className="rai-nav-ctas">
          <Link href="/signin" className="rai-btn-ghost">Log in</Link>
          <Link href="/register" className="rai-btn-green">
            Get started free <IconArrow />
          </Link>
        </div>
      </div>
    </nav>
  )
}
