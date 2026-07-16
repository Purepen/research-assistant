'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

const IcoHome  = () => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>
const IcoFiles = () => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M3 6a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
const IcoFlask = () => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 3h6m-6 0v6l-4 9a1 1 0 0 0 .9 1.5h12.2a1 1 0 0 0 .9-1.5L15 9V3"/></svg>
const IcoUser  = () => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.4-3.6 4.4-5.5 8-5.5s6.6 1.9 8 5.5"/></svg>
const IcoPlus  = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>

const TABS = [
  { label: 'Home',     href: '/dashboard',          icon: IcoHome,  exact: true  },
  { label: 'Projects', href: '/dashboard/projects', icon: IcoFiles, exact: false },
  { label: 'Topics',   href: '/dashboard/topics',   icon: IcoFlask, exact: false },
  { label: 'Profile',  href: '/dashboard/profile',  icon: IcoUser,  exact: false },
]

/* Bottom tab bar — mobile only (shown under 860px via dashboard.css).
   Four destinations + a raised center FAB for Generate, replacing the
   old hamburger + drawer pattern. */
export function TabBar() {
  const pathname = usePathname()
  const isActive = (t: typeof TABS[number]) =>
    t.exact ? pathname === t.href : pathname.startsWith(t.href)

  const renderTab = (t: typeof TABS[number]) => (
    <Link key={t.href} href={t.href} className={`g-tabbar-item ${isActive(t) ? 'active' : ''}`}>
      <t.icon />
      <span>{t.label}</span>
    </Link>
  )

  return (
    <nav className="g-tabbar" aria-label="Primary">
      {TABS.slice(0, 2).map(renderTab)}
      <Link href="/dashboard/generate" className="g-tabbar-fab" aria-label="New specification">
        <span className="g-tabbar-fab-btn"><IcoPlus /></span>
      </Link>
      {TABS.slice(2).map(renderTab)}
    </nav>
  )
}
