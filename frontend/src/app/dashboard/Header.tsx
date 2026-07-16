'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'

const IcoPlus  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IcoCaret = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
const IcoMenu  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>

const CRUMBS: Record<string, string> = { '/dashboard':'Dashboard', '/dashboard/projects':'Projects', '/dashboard/generate':'Generate', '/dashboard/profile':'Profile', '/dashboard/topics':'Topic Lab' }

/* Top bar. On mobile (<860px) main navigation is the bottom TabBar; the
   menu button opens the sidebar as a slide-out drawer (trial status,
   account, sign out live there). */
export function Header({ onMenu }: { onMenu?: () => void }) {
  const pathname = usePathname()
  const { user } = useAuth()

  const initials = user?.full_name ? user.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'R'
  const isDetail = pathname.includes('/projects/') && pathname !== '/dashboard/projects'
  const page = CRUMBS[pathname] || (isDetail ? 'Project Detail' : 'Dashboard')

  return (
    <header className="g-header" style={{ position:'sticky', top:0, zIndex:30, height:54, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 32px', background:'rgba(255,255,255,0.95)', backdropFilter:'blur(12px)', borderBottom:'1px solid #e8ede8', boxShadow:'0 1px 0 #f0f4f0' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <button className="g-mobile-menu-btn" onClick={onMenu} aria-label="Open menu"><IcoMenu /></button>
        {isDetail && <>
          <Link href="/dashboard/projects" style={{ fontSize:'.78rem', color:'#9ca3af', textDecoration:'none', fontWeight:500, transition:'color .15s' }}
            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color='#16a34a'}
            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color='#9ca3af'}>Projects</Link>
          <span style={{ color:'#d1d5db' }}><IcoCaret /></span>
        </>}
        <span style={{ fontSize:'.875rem', fontWeight:700, color:'#0f1f0f' }}>{page}</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <Link href="/dashboard/generate" style={{ textDecoration:'none' }} className="g-header-newspec">
          <button className="g-btn" style={{ padding:'7px 14px', fontSize:'.8rem' }}><IcoPlus /> New Spec</button>
        </Link>
        <div title={user?.email} style={{ width:32, height:32, borderRadius:9, background:'linear-gradient(135deg,#16a34a,#22c55e)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.72rem', fontWeight:800, color:'white', cursor:'pointer', border:'2px solid white', boxShadow:'0 0 0 1.5px #16a34a' }}>
          {initials}
        </div>
      </div>
    </header>
  )
}
