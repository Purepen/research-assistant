'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { useUserStats } from '@/hooks/useUser'
import { useTopicHistory } from '@/hooks/useTopics'

const IcoLayers  = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
const IcoGrid    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
const IcoFiles   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>
const IcoFlask   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 3h6m-6 0v6l-4 9a1 1 0 0 0 .9 1.5h12.2a1 1 0 0 0 .9-1.5L15 9V3M9 3H6m3 0h6"/></svg>
const IcoPlus    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IcoUser    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
const IcoOut     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>

export const NAV = [
  { label:'Dashboard', href:'/dashboard',         icon:IcoGrid,  desc:'Overview',      isNew:false },
  { label:'Topic Lab', href:'/dashboard/topics',  icon:IcoFlask, desc:'Find & refine', isNew:true  },
  { label:'Projects',  href:'/dashboard/projects',icon:IcoFiles, desc:'All specs',      isNew:false },
  { label:'Generate',  href:'/dashboard/generate',icon:IcoPlus,  desc:'New spec',       isNew:false },
  { label:'Profile',   href:'/dashboard/profile', icon:IcoUser,  desc:'Settings',       isNew:false },
]

export function Sidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const { data: stats } = useUserStats()

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'R'
  const hasOwnKey    = stats?.has_own_api_key ?? false
  const topicCredit  = stats?.free_topic_credit_used ?? false
  const specCredit   = stats?.free_spec_credit_used ?? false
  const { data: topicData } = useTopicHistory({ limit:1 })
  const topicsUsed = topicData?.total ?? 0

  return (
    <div className={`g-sidebar surface-forest ${open ? 'open' : ''}`} style={{ position:'fixed',top:0,left:0,bottom:0,width:'var(--g-sidebar-w)',display:'flex',flexDirection:'column' }}>
      <style>{`
        .sbd-logout{transition:all .15s;cursor:pointer;background:none;border:none;width:100%;text-align:left;}
        .sbd-logout:hover{background:rgba(220,38,38,.16)!important;color:#fca5a5!important;}
        .sbd-nav{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;border:1px solid transparent;transition:all .15s;text-decoration:none;color:rgba(255,255,255,.55);}
        .sbd-nav:hover{background:rgba(255,255,255,.06);color:rgba(255,255,255,.85);}
        .sbd-nav.active{background:rgba(34,197,94,.16);border-color:rgba(74,222,128,.2);color:#4ade80;}
      `}</style>

      {/* Glow */}
      <div style={{ position:'absolute',top:-100,left:-100,width:320,height:320,borderRadius:'50%',background:'radial-gradient(circle, rgba(34,197,94,0.14) 0%, transparent 70%)',pointerEvents:'none' }}/>

      {/* Logo */}
      <div style={{ padding:'22px 18px 16px',position:'relative' }}>
        <Link href="/" style={{ display:'flex',alignItems:'center',gap:10,textDecoration:'none',width:'fit-content' }}>
          <div style={{ width:34,height:34,borderRadius:10,background:'#16a34a',display:'flex',alignItems:'center',justifyContent:'center',color:'white' }}>
            <IcoLayers/>
          </div>
          <div>
            <div style={{ fontSize:'.88rem',fontWeight:800,color:'white',letterSpacing:'-.02em',lineHeight:1.1,fontFamily:'Sora,sans-serif' }}>Research<span style={{ color:'#4ade80' }}>AI</span></div>
            <div style={{ fontSize:'.6rem',color:'rgba(74,222,128,.75)',fontWeight:700,letterSpacing:'.07em',textTransform:'uppercase' }}>SPEC GENERATOR</div>
          </div>
        </Link>
      </div>

      <div style={{ height:1,background:'rgba(255,255,255,.08)',margin:'0 16px',position:'relative' }}/>

      {/* Nav — flex:1 pushes the footer down on desktop; on mobile the
          sbd-navwrap override collapses this so the trial panel + account +
          sign-out sit directly under the nav and are never pushed off-screen. */}
      <div className="sbd-navwrap" style={{ padding:'12px 10px',flex:1,overflowY:'auto',position:'relative' }}>
        <p style={{ fontSize:'.6rem',fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',color:'rgba(255,255,255,.3)',padding:'0 8px',marginBottom:6 }}>MENU</p>
        <div style={{ display:'flex',flexDirection:'column',gap:2 }}>
          {NAV.map(item => {
            const active = pathname===item.href || (item.href!=='/dashboard'&&pathname.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href} onClick={onClose} style={{ textDecoration:'none',display:'block' }}>
                <motion.div whileTap={{ scale:.97 }} className={`sbd-nav ${active?'active':''}`}>
                  <div style={{ width:30,height:30,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all .15s',
                    background: active?'rgba(34,197,94,.22)':'rgba(255,255,255,.06)',
                    color: active?'#4ade80':'rgba(255,255,255,.45)',
                  }}>
                    <item.icon/>
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:'.83rem',fontWeight:active?700:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize:'.66rem',color:'rgba(255,255,255,.3)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{item.desc}</div>
                  </div>
                  {item.isNew && (
                    <span style={{ fontSize:'.55rem',fontWeight:800,letterSpacing:'.06em',background:'rgba(34,197,94,.25)',color:'#4ade80',padding:'2px 6px',borderRadius:999,textTransform:'uppercase',flexShrink:0,border:'1px solid rgba(74,222,128,.3)' }}>
                      NEW
                    </span>
                  )}
                </motion.div>
              </Link>
            )
          })}
        </div>
      </div>

      <div style={{ height:1,background:'rgba(255,255,255,.08)',margin:'0 16px',position:'relative' }}/>

      {/* Usage tier */}
      <div style={{ padding:'12px 16px',position:'relative' }}>
        <div style={{ background:'rgba(255,255,255,.05)',borderRadius:12,padding:'12px 14px',border:'1px solid rgba(255,255,255,.09)' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8 }}>
            <span style={{ fontSize:'.62rem',fontWeight:700,color:'#4ade80',letterSpacing:'.1em',textTransform:'uppercase' }}>{hasOwnKey ? 'Your API key' : 'Free trial'}</span>
            {hasOwnKey && <span style={{ fontSize:'.68rem',fontWeight:700,color:'#4ade80' }}>Unlimited</span>}
          </div>
          {hasOwnKey ? (
            <p style={{ margin:0,fontSize:'.68rem',color:'rgba(255,255,255,.5)' }}>Generations run on your own OpenAI key.</p>
          ) : (
            <>
              <div style={{ display:'flex',flexDirection:'column',gap:5,marginBottom:8 }}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                  <span style={{ fontSize:'.7rem',color:'rgba(255,255,255,.6)' }}>Topic Lab try</span>
                  <span style={{ fontSize:'.7rem',fontWeight:700,color: topicCredit?'rgba(255,255,255,.35)':'#4ade80' }}>{topicCredit?'Used':'Available'}</span>
                </div>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                  <span style={{ fontSize:'.7rem',color:'rgba(255,255,255,.6)' }}>Spec generation try</span>
                  <span style={{ fontSize:'.7rem',fontWeight:700,color: specCredit?'rgba(255,255,255,.35)':'#4ade80' }}>{specCredit?'Used':'Available'}</span>
                </div>
              </div>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                <span style={{ fontSize:'.66rem',color:'rgba(255,255,255,.35)' }}><span style={{ fontSize:'.6rem',marginRight:3 }}>🧪</span>{topicsUsed} topic{topicsUsed!==1?'s':''} explored</span>
              </div>
              {(topicCredit || specCredit) && (
                <Link href="/dashboard/profile" onClick={onClose} style={{ display:'block',textAlign:'center',fontSize:'.68rem',fontWeight:700,color:'#4ade80',textDecoration:'none',padding:'8px 0 0',marginTop:8,borderTop:'1px solid rgba(255,255,255,.09)' }}>
                  Add your API key for unlimited use →
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      {/* User */}
      <div style={{ padding:'10px 12px 16px',position:'relative' }}>
        <div style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 8px',borderRadius:10 }}>
          <div style={{ width:34,height:34,borderRadius:10,background:'linear-gradient(135deg,#16a34a,#22c55e)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:'.78rem',fontWeight:800,flexShrink:0 }}>
            {initials}
          </div>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ fontSize:'.8rem',fontWeight:700,color:'white',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{user?.full_name||'Researcher'}</div>
            <div style={{ fontSize:'.66rem',color:'rgba(255,255,255,.4)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{user?.email||''}</div>
          </div>
        </div>
        <button className="sbd-logout" onClick={signOut}
          style={{ display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:8,color:'rgba(255,255,255,.5)',fontSize:'.78rem',fontWeight:600,marginTop:2 }}>
          <IcoOut/> Sign out
        </button>
      </div>
    </div>
  )
}
