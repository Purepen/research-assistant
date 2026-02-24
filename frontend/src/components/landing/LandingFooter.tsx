import Link from 'next/link'

const IconLayers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
    <polyline points="2 17 12 22 22 17"/>
    <polyline points="2 12 12 17 22 12"/>
  </svg>
)

const FOOTER_COLS = [
  {
    heading: 'Product',
    links: [
      { label: 'Features',    href: '#features' },
      { label: 'How it works',href: '#how' },
      { label: 'Pricing',     href: '#pricing' },
      { label: 'Dashboard',   href: '/dashboard' },
    ],
  },
  {
    heading: 'Support',
    links: [
      { label: 'Help Center', href: '#' },
      { label: 'Contact us',  href: '#' },
      { label: 'Status',      href: '#' },
      { label: 'Changelog',   href: '#' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy',   href: '#' },
      { label: 'Terms of Service', href: '#' },
      { label: 'Cookie Policy',    href: '#' },
      { label: 'Academic Policy',  href: '#' },
    ],
  },
]

export function LandingFooter() {
  return (
    <footer className="rai-footer">
      <div className="rai-container">
        <div className="rai-footer-grid">

          {/* Brand column */}
          <div>
            <Link href="/" className="rai-logo" style={{ display: 'inline-flex', marginBottom: 14 }}>
              <div className="rai-logo-icon"><IconLayers /></div>
              <span className="rai-logo-text" style={{ color: 'white' }}>
                Research<span>AI</span>
              </span>
            </Link>
            <p className="rai-footer-brand">
              AI-powered academic research specification generator.
              Built for MSc, PhD, and undergraduate students worldwide.
            </p>
          </div>

          {/* Link columns */}
          {FOOTER_COLS.map((col, i) => (
            <div key={i} className="rai-footer-col">
              <h4>{col.heading}</h4>
              <ul>
                {col.links.map((link, j) => (
                  <li key={j}>
                    <a href={link.href}>{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

        </div>

        <div className="rai-footer-bottom">
          <p>© 2026 ResearchAI. All rights reserved.</p>
          <div className="rai-footer-links">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
