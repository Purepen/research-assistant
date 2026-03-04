'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { useUserStats } from '@/hooks/useUser'

const IcoLayers  = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
const IcoGrid    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
const IcoFiles   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>
const IcoFlask   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 3h6m-6 0v6l-4 9a1 1 0 0 0 .9 1.5h12.2a1 1 0 0 0 .9-1.5L15 9V3M9 3H6m3 0h6"/></svg>
const IcoPlus    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IcoUser    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
const IcoOut     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>

const NAV = [
  { label:'Dashboard', href:'/dashboard',         icon:IcoGrid,  desc:'Overview',        accent:false },
  { label:'Topic Lab', href:'/dashboard/topics',  icon:IcoFlask, desc:'Find & refine',   accent:true  },
  { label:'Projects',  href:'/dashboard/projects',icon:IcoFiles, desc:'All specs',        accent:false },
  { label:'Generate',  href:'/dashboard/generate',icon:IcoPlus,  desc:'New spec',         accent:false },
  { label:'Profile',   href:'/dashboard/profile', icon:IcoUser,  desc:'Settings',         accent:false },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const { data: stats } = useUserStats()

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'R'
  const used = stats?.total_projects ?? 0
  const freeLimit = 3
  const pct = Math.min((used / freeLimit) * 100, 100)

  return (
    <div style={{ position:'fixed',top:0,left:0,bottom:0,width:'var(--g-sidebar-w)',zIndex:40,display:'flex',flexDirection:'column',background:'#ffffff',borderRight:'1px solid #e8ede8' }}>
      <style>{`
        .sb-logout{transition:all .15s;cursor:pointer;background:none;border:none;width:100%;text-align:left;}
        .sb-logout:hover{background:#fef2f2!important;color:#dc2626!important;}
        .sb-accent-nav:hover{background:#faf5ff!important;border-color:rgba(124,58,237,.2)!important;}
        .sb-accent-nav.active{background:#faf5ff!important;border-color:rgba(124,58,237,.3)!important;}
        .sb-accent-nav.active .sb-nav-text{color:#7c3aed!important;}
        .sb-accent-nav .sb-nav-text{color:#7c3aed;}
      `}</style>

      {/* Logo */}
      <div style={{ padding:'22px 18px 16px' }}>
        <Link href="/" style={{ display:'flex',alignItems:'center',gap:10,textDecoration:'none',width:'fit-content' }}>
          <div style={{ width:34,height:34,borderRadius:10,background:'#16a34a',display:'flex',alignItems:'center',justifyContent:'center',color:'white' }}>
            <IcoLayers/>
          </div>
          <div>
            <div style={{ fontSize:'.88rem',fontWeight:800,color:'#0f1f0f',letterSpacing:'-.02em',lineHeight:1.1 }}>ResearchAI</div>
            <div style={{ fontSize:'.6rem',color:'#16a34a',fontWeight:700,letterSpacing:'.07em',textTransform:'uppercase' }}>SPEC GENERATOR</div>
          </div>
        </Link>
      </div>

      <div style={{ height:1,background:'#f0f4f0',margin:'0 16px' }}/>

      {/* Nav */}
      <div style={{ padding:'12px 10px',flex:1,overflowY:'auto' }}>
        <p style={{ fontSize:'.6rem',fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',color:'#9ca3af',padding:'0 8px',marginBottom:6 }}>MENU</p>
        <div style={{ display:'flex',flexDirection:'column',gap:2 }}>
          {NAV.map(item => {
            const active = pathname===item.href || (item.href!=='/dashboard'&&pathname.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href} className="g-nav">
                <motion.div whileTap={{ scale:.97 }}
                  className={`g-nav-inner ${active?'active':''} ${item.accent?'sb-accent-nav':''}`}>
                  <div style={{ width:30,height:30,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all .15s',
                    background: item.accent
                      ? (active?'#ede9fe':'#f5f3ff')
                      : (active?'#dcfce7':'#f9fafb'),
                    color: item.accent
                      ? (active?'#7c3aed':'#a78bfa')
                      : (active?'#16a34a':'#9ca3af'),
                  }}>
                    <item.icon/>
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div className={`sb-nav-text`} style={{ fontSize:'.83rem',fontWeight:active?700:500,color:active&&!item.accent?'#0f1f0f':'inherit',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize:'.66rem',color:'#9ca3af',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{item.desc}</div>
                  </div>
                  {/* NEW badge for Topic Lab */}
                  {item.accent && (
                    <span style={{ fontSize:'.55rem',fontWeight:800,letterSpacing:'.06em',background:'#7c3aed',color:'white',padding:'2px 6px',borderRadius:999,textTransform:'uppercase',flexShrink:0 }}>
                      NEW
                    </span>
                  )}
                </motion.div>
              </Link>
            )
          })}
        </div>
      </div>

      <div style={{ height:1,background:'#f0f4f0',margin:'0 16px' }}/>

      {/* Usage tier */}
      <div style={{ padding:'12px 16px' }}>
        <div style={{ background:'#f9fafb',borderRadius:12,padding:'12px 14px',border:'1px solid #f0f4f0' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6 }}>
            <span style={{ fontSize:'.72rem',fontWeight:700,color:'#374151' }}>Free tier</span>
            <span style={{ fontSize:'.72rem',fontWeight:700,color: pct>=100?'#dc2626':'#16a34a' }}>{used}/{freeLimit} specs</span>
          </div>
          <div style={{ height:5,background:'#e8ede8',borderRadius:999,overflow:'hidden',marginBottom:5 }}>
            <motion.div initial={{width:0}} animate={{width:`${pct}%`}} transition={{duration:.6,ease:'easeOut'}}
              style={{ height:'100%',borderRadius:999,background: pct>=100?'#dc2626':'linear-gradient(90deg,#16a34a,#22c55e)' }}/>
          </div>
          {pct>=100&&<p style={{ margin:0,fontSize:'.66rem',color:'#dc2626',fontWeight:600 }}>Free limit reached</p>}
        </div>
      </div>

      {/* User */}
      <div style={{ padding:'10px 12px 16px' }}>
        <div style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 8px',borderRadius:10,transition:'all .15s' }}>
          <div style={{ width:34,height:34,borderRadius:10,background:'linear-gradient(135deg,#16a34a,#22c55e)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:'.78rem',fontWeight:800,flexShrink:0 }}>
            {initials}
          </div>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ fontSize:'.8rem',fontWeight:700,color:'#0f1f0f',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{user?.full_name||'Researcher'}</div>
            <div style={{ fontSize:'.66rem',color:'#9ca3af',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{user?.email||''}</div>
          </div>
        </div>
        <button className="sb-logout" onClick={signOut}
          style={{ display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:8,color:'#6b7280',fontSize:'.78rem',fontWeight:600,marginTop:2 }}>
          <IcoOut/> Sign out
        </button>
      </div>
    </div>
  )
}
