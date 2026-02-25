'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { useUserStats } from '@/hooks/useUser'
import { useProjects } from '@/hooks/useProjects'

const fu = (d=0) => ({ initial:{opacity:0,y:12}, animate:{opacity:1,y:0}, transition:{duration:.42,delay:d,ease:[.22,1,.36,1]} })

const I = {
  User:  ()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>,
  Mail:  ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>,
  Shield:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Bell:  ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Chart: ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  Check: ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Star:  ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  Lock:  ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Logout:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Info:  ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  Trash: ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Google:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#16a34a"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#22c55e"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#16a34a"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#15803d"/></svg>,
}

type Tab = 'overview'|'security'|'notifications'

function scoreColor(n:number) { return n>=75?'#16a34a':n>=55?'#d97706':'#dc2626' }

function Toggle({ on, onChange, disabled }: { on:boolean; onChange:(v:boolean)=>void; disabled?:boolean }) {
  return (
    <button onClick={()=>!disabled&&onChange(!on)}
      style={{ width:44, height:24, borderRadius:12, background:on?'#16a34a':'#e5e7eb', border:`2px solid ${on?'#16a34a':'#d1d5db'}`, cursor:disabled?'not-allowed':'pointer', position:'relative', transition:'all .2s', opacity:disabled?.5:1, flexShrink:0 }}>
      <div style={{ width:18, height:18, borderRadius:'50%', background:'white', position:'absolute', top:1, left:on?23:1, transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.2)' }}/>
    </button>
  )
}

function ComingSoonOverlay({ label='Coming soon' }: { label?:string }) {
  return (
    <div style={{ position:'absolute', inset:0, borderRadius:'inherit', background:'rgba(255,255,255,.82)', backdropFilter:'blur(2px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2 }}>
      <div style={{ display:'flex', alignItems:'center', gap:7, background:'#f0fdf4', border:'1.5px solid #bbf7d0', borderRadius:9, padding:'8px 16px' }}>
        <I.Lock/><span style={{ fontSize:'.78rem', fontWeight:700, color:'#16a34a' }}>{label}</span>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const { data:stats } = useUserStats()
  const { data:projects } = useProjects({ limit:50 })
  const [tab, setTab] = useState<Tab>('overview')
  const [notifs, setNotifs] = useState({ email:true, weekly:false, tips:true })

  const initials = user?.full_name ? user.full_name.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() : 'R'
  const joined = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}) : '—'
  const avgScore = stats?.average_marks ? Math.round(stats.average_marks) : 0
  const completionRate = stats?.total_projects ? Math.round((stats.completed_projects/stats.total_projects)*100) : 0
  const bestProject = (projects||[]).reduce((best:any,p:any)=>{
    if (p.total_marks!=null && (!best||p.total_marks>best.total_marks)) return p; return best
  }, null)

  const TABS = [
    { key:'overview'      as Tab, label:'Overview',      icon:I.Chart  },
    { key:'security'      as Tab, label:'Security',      icon:I.Shield },
    { key:'notifications' as Tab, label:'Notifications', icon:I.Bell   },
  ]

  return (
    <div style={{ maxWidth:820, margin:'0 auto' }}>
      {/* ── Hero ── */}
      <motion.div {...fu(0)} style={{ background:'white', border:'1.5px solid #e8ede8', borderRadius:18, padding:'24px', marginBottom:18, boxShadow:'0 2px 12px rgba(0,0,0,.06)', position:'relative', overflow:'hidden' }}>
        {/* green tint top-right */}
        <div style={{ position:'absolute', top:-30, right:-30, width:160, height:160, borderRadius:'50%', background:'#f0fdf4', filter:'blur(30px)', pointerEvents:'none' }}/>
        <div style={{ display:'flex', alignItems:'center', gap:18, flexWrap:'wrap', position:'relative' }}>
          {/* Avatar */}
          <div style={{ position:'relative', flexShrink:0 }}>
            <div style={{ width:72, height:72, borderRadius:18, background:'linear-gradient(135deg,#16a34a,#22c55e)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem', fontWeight:800, color:'white', border:'3px solid white', boxShadow:'0 0 0 2px #16a34a' }}>
              {initials}
            </div>
            <div style={{ position:'absolute', bottom:-4, right:-4, width:22, height:22, borderRadius:'50%', background:'white', border:'2px solid #e8ede8', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <I.Google/>
            </div>
          </div>
          {/* Name & email */}
          <div style={{ flex:1, minWidth:0 }}>
            <h1 style={{ margin:'0 0 4px', fontSize:'clamp(1.2rem,2vw,1.5rem)', fontWeight:800, color:'#0f1f0f', fontFamily:'Fraunces,serif' }}>
              {user?.full_name || 'Researcher'}
            </h1>
            <p style={{ margin:'0 0 10px', fontSize:'.86rem', color:'#6b7280', display:'flex', alignItems:'center', gap:6 }}>
              <I.Mail/> {user?.email}
            </p>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:999, background:'#f0fdf4', border:'1px solid #bbf7d0', fontSize:'.72rem', fontWeight:700, color:'#16a34a' }}><I.Google/> Google account</span>
              <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:999, background:'#f9fafb', border:'1px solid #e5e7eb', fontSize:'.72rem', color:'#6b7280' }}>Member since {joined}</span>
            </div>
          </div>
          {/* Quick stats */}
          <div style={{ display:'flex', gap:20, flexShrink:0 }}>
            {[
              { label:'Specs',     value:stats?.total_projects??'—',    color:'#16a34a' },
              { label:'Avg Score', value:avgScore||'—', suffix:avgScore?'/100':'', color:avgScore?scoreColor(avgScore):'#9ca3af' },
              { label:'Completed', value:stats?.completed_projects??'—', color:'#059669' },
            ].map(s=>(
              <div key={s.label} style={{ textAlign:'center' }}>
                <div style={{ display:'flex', alignItems:'baseline', gap:2, justifyContent:'center' }}>
                  <span style={{ fontSize:'1.4rem', fontWeight:800, color:s.color, fontFamily:'Fraunces,serif', lineHeight:1 }}>{s.value}</span>
                  {(s as any).suffix && <span style={{ fontSize:'.68rem', color:'#9ca3af' }}>{(s as any).suffix}</span>}
                </div>
                <p style={{ margin:0, fontSize:'.65rem', color:'#9ca3af', fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Tab bar */}
      <motion.div {...fu(.06)} style={{ display:'flex', gap:3, marginBottom:18, background:'white', border:'1px solid #e8ede8', borderRadius:12, padding:4, boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={()=>setTab(t.key)}
            style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'9px 12px', borderRadius:9, border:'none', cursor:'pointer', fontSize:'.82rem', fontWeight:tab===t.key?700:500, transition:'all .15s',
              background:tab===t.key?'#16a34a':'transparent', color:tab===t.key?'white':'#6b7280' }}>
            <t.icon/>{t.label}
          </button>
        ))}
      </motion.div>

      {/* ── OVERVIEW ── */}
      {tab==='overview' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Stats */}
          <motion.div {...fu(.1)} style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
            {[
              { icon:<I.Star/>,  label:'Total Specs',    value:stats?.total_projects??'—',   color:'#16a34a', bg:'#f0fdf4' },
              { icon:<I.Chart/>, label:'Avg Score',      value:avgScore||'—', suffix:avgScore?'/100':'', color:avgScore?scoreColor(avgScore):'#9ca3af', bg:'#fafcfa' },
              { icon:<I.Check/>, label:'Completion Rate', value:completionRate?`${completionRate}%`:'—', color:'#059669', bg:'#ecfdf5' },
            ].map(s=>(
              <div key={s.label} style={{ background:'white', border:'1px solid #e8ede8', borderRadius:14, padding:'18px', boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
                <div style={{ width:30, height:30, borderRadius:8, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', color:s.color, marginBottom:11 }}>{s.icon}</div>
                <div style={{ display:'flex', alignItems:'baseline', gap:3, marginBottom:2 }}>
                  <span style={{ fontSize:'1.55rem', fontWeight:800, color:'#0f1f0f', fontFamily:'Fraunces,serif', lineHeight:1 }}>{s.value}</span>
                  {(s as any).suffix && <span style={{ fontSize:'.72rem', color:'#9ca3af' }}>{(s as any).suffix}</span>}
                </div>
                <p style={{ margin:0, fontSize:'.71rem', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.07em' }}>{s.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Best spec */}
          {bestProject && (
            <motion.div {...fu(.14)} style={{ background:'white', border:'1px solid #e8ede8', borderRadius:14, padding:'18px', boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
              <p style={{ margin:'0 0 12px', fontSize:'.7rem', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.09em' }}>🏆 Best Spec</p>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:50, height:50, borderRadius:13, background:`${scoreColor(bestProject.total_marks)}10`, border:`1.5px solid ${scoreColor(bestProject.total_marks)}20`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ fontSize:'1.05rem', fontWeight:800, color:scoreColor(bestProject.total_marks), fontFamily:'Fraunces,serif', lineHeight:1 }}>{bestProject.total_marks}</span>
                  <span style={{ fontSize:'.55rem', color:'#9ca3af' }}>/100</span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ margin:'0 0 3px', fontWeight:700, color:'#0f1f0f', fontSize:'.9rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{bestProject.research_topic||bestProject.field_of_study}</p>
                  <p style={{ margin:0, fontSize:'.76rem', color:'#6b7280' }}>{bestProject.field_of_study} · {bestProject.academic_level}</p>
                </div>
                <span style={{ padding:'3px 10px', borderRadius:999, background:`${scoreColor(bestProject.total_marks)}10`, border:`1px solid ${scoreColor(bestProject.total_marks)}25`, fontSize:'.72rem', fontWeight:700, color:scoreColor(bestProject.total_marks), flexShrink:0 }}>
                  {bestProject.total_marks>=75?'Excellent':bestProject.total_marks>=55?'Good':'Fair'}
                </span>
              </div>
            </motion.div>
          )}

          {/* Account info */}
          <motion.div {...fu(.18)} style={{ background:'white', border:'1px solid #e8ede8', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
            <div className="g-section-head">
              <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                <div style={{ width:28, height:28, borderRadius:8, background:'#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center', color:'#16a34a' }}><I.User/></div>
                <span style={{ fontWeight:700, color:'#0f1f0f', fontSize:'.9rem' }}>Account Information</span>
              </div>
            </div>
            {[
              { label:'Full Name',    value:user?.full_name||'—',    icon:<I.User/> },
              { label:'Email',        value:user?.email||'—',        icon:<I.Mail/> },
              { label:'Account Type', value:'Google OAuth 2.0',      icon:<I.Google/> },
              { label:'Member Since', value:joined,                  icon:<I.Shield/> },
            ].map((row,i,arr)=>(
              <div key={row.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 20px', borderBottom:i<arr.length-1?'1px solid #f9fafb':'none' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ color:'#9ca3af', display:'flex' }}>{row.icon}</div>
                  <div>
                    <p style={{ margin:'0 0 1px', fontSize:'.7rem', color:'#9ca3af', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em' }}>{row.label}</p>
                    <p style={{ margin:0, fontSize:'.88rem', color:'#0f1f0f', fontWeight:500 }}>{row.value}</p>
                  </div>
                </div>
                <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:6, background:'#f9fafb', border:'1px solid #e8ede8', fontSize:'.7rem', color:'#9ca3af' }}><I.Lock/> Managed</span>
              </div>
            ))}
            <div style={{ padding:'12px 20px', background:'#fafcfa' }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                <div style={{ color:'#9ca3af', flexShrink:0, marginTop:1 }}><I.Info/></div>
                <p style={{ margin:0, fontSize:'.76rem', color:'#9ca3af', lineHeight:1.6 }}>Profile details are managed via your Google account. Direct editing will be available in a future update.</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── SECURITY ── */}
      {tab==='security' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Auth method */}
          <motion.div {...fu(.1)} style={{ background:'white', border:'1px solid #e8ede8', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
            <div className="g-section-head">
              <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                <div style={{ width:28, height:28, borderRadius:8, background:'#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center', color:'#16a34a' }}><I.Shield/></div>
                <span style={{ fontWeight:700, color:'#0f1f0f', fontSize:'.9rem' }}>Authentication</span>
              </div>
            </div>
            <div style={{ padding:'18px 20px', display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:'#f0fdf4', border:'1px solid #bbf7d0', display:'flex', alignItems:'center', justifyContent:'center' }}><I.Google/></div>
              <div style={{ flex:1 }}>
                <p style={{ margin:'0 0 3px', fontWeight:700, color:'#0f1f0f', fontSize:'.9rem' }}>Google Sign-In</p>
                <p style={{ margin:0, fontSize:'.78rem', color:'#6b7280' }}>Secured via Google OAuth 2.0 — industry-standard authentication</p>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:999, background:'#f0fdf4', border:'1px solid #bbf7d0', fontSize:'.72rem', fontWeight:700, color:'#16a34a', flexShrink:0 }}><I.Check/> Active</div>
            </div>
          </motion.div>

          {/* Upcoming features */}
          <motion.div {...fu(.14)} style={{ background:'white', border:'1px solid #e8ede8', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.04)', position:'relative' }}>
            <div className="g-section-head"><span style={{ fontWeight:700, color:'#0f1f0f', fontSize:'.9rem' }}>Security Features</span></div>
            <ComingSoonOverlay label="Coming in next update"/>
            <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:12, opacity:.35 }}>
              {[
                { icon:<I.Shield/>, label:'Two-Factor Authentication', sub:'Add 2FA for extra security' },
                { icon:<I.Lock/>,   label:'Password Login',            sub:'Enable email + password' },
              ].map(it=>(
                <div key={it.label} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px', background:'#f9fafb', borderRadius:11, border:'1px solid #e8ede8' }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:'#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center', color:'#16a34a' }}>{it.icon}</div>
                  <div style={{ flex:1 }}>
                    <p style={{ margin:'0 0 2px', fontWeight:600, color:'#0f1f0f', fontSize:'.87rem' }}>{it.label}</p>
                    <p style={{ margin:0, fontSize:'.74rem', color:'#9ca3af' }}>{it.sub}</p>
                  </div>
                  <Toggle on={false} onChange={()=>{}} disabled/>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Session */}
          <motion.div {...fu(.18)} style={{ background:'white', border:'1px solid #e8ede8', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
            <div className="g-section-head"><span style={{ fontWeight:700, color:'#0f1f0f', fontSize:'.9rem' }}>Current Session</span></div>
            <div style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:11, background:'#f0fdf4', border:'1px solid #bbf7d0', display:'flex', alignItems:'center', justifyContent:'center', color:'#16a34a' }}><I.Shield/></div>
              <div style={{ flex:1 }}>
                <p style={{ margin:'0 0 2px', fontWeight:600, color:'#0f1f0f', fontSize:'.87rem' }}>Browser session</p>
                <p style={{ margin:0, fontSize:'.76rem', color:'#6b7280' }}>{new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</p>
              </div>
              <span style={{ padding:'3px 9px', borderRadius:999, background:'#f0fdf4', border:'1px solid #bbf7d0', fontSize:'.7rem', fontWeight:700, color:'#16a34a' }}>Active now</span>
            </div>
          </motion.div>

          {/* Danger zone */}
          <motion.div {...fu(.22)} style={{ background:'#fef2f2', border:'1.5px solid #fecaca', borderRadius:14, overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid #fecaca' }}>
              <span style={{ fontWeight:700, color:'#dc2626', fontSize:'.9rem' }}>Danger Zone</span>
            </div>
            <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:14, flexWrap:'wrap' }}>
                <div>
                  <p style={{ margin:'0 0 3px', fontWeight:600, color:'#0f1f0f', fontSize:'.87rem' }}>Sign out</p>
                  <p style={{ margin:0, fontSize:'.76rem', color:'#6b7280' }}>End your current session on this device</p>
                </div>
                <button onClick={signOut} className="g-btn-danger"><I.Logout/> Sign Out</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── NOTIFICATIONS ── */}
      {tab==='notifications' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <motion.div {...fu(.1)} style={{ background:'white', border:'1px solid #e8ede8', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.04)', position:'relative' }}>
            <div className="g-section-head">
              <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                <div style={{ width:28, height:28, borderRadius:8, background:'#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center', color:'#16a34a' }}><I.Bell/></div>
                <span style={{ fontWeight:700, color:'#0f1f0f', fontSize:'.9rem' }}>Email Notifications</span>
              </div>
            </div>
            <ComingSoonOverlay label="Backend coming soon"/>
            <div style={{ padding:'8px 10px', opacity:.3 }}>
              {[
                { key:'email'  as const, label:'Spec complete emails',  sub:'Notified when your spec finishes generating', icon:<I.Mail/> },
                { key:'weekly' as const, label:'Weekly digest',         sub:'Weekly summary of your activity and scores', icon:<I.Chart/> },
                { key:'tips'   as const, label:'Improvement tips',      sub:'Personalised tips to improve spec scores',   icon:<I.Star/> },
              ].map(it=>(
                <div key={it.key} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 10px', borderBottom:'1px solid #f9fafb' }}>
                  <div style={{ width:34, height:34, borderRadius:9, background:'#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center', color:'#16a34a' }}>{it.icon}</div>
                  <div style={{ flex:1 }}>
                    <p style={{ margin:'0 0 2px', fontWeight:600, color:'#0f1f0f', fontSize:'.87rem' }}>{it.label}</p>
                    <p style={{ margin:0, fontSize:'.74rem', color:'#6b7280' }}>{it.sub}</p>
                  </div>
                  <Toggle on={notifs[it.key]} onChange={v=>setNotifs(p=>({...p,[it.key]:v}))}/>
                </div>
              ))}
            </div>
            <div style={{ padding:'12px 20px', background:'#fafcfa', borderTop:'1px solid #f0f4f0' }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                <div style={{ color:'#9ca3af', flexShrink:0, marginTop:1 }}><I.Info/></div>
                <p style={{ margin:0, fontSize:'.76rem', color:'#9ca3af', lineHeight:1.6 }}>Notification preferences will activate once the notifications backend is connected. Shown for preview only.</p>
              </div>
            </div>
          </motion.div>

          {/* Email preview */}
          <motion.div {...fu(.14)} style={{ background:'white', border:'1px solid #e8ede8', borderRadius:14, padding:'20px', boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
            <p style={{ margin:'0 0 12px', fontSize:'.7rem', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.09em' }}>📬 Email preview</p>
            <div style={{ background:'#f9fafb', border:'1px solid #e8ede8', borderRadius:11, padding:'16px', fontFamily:'monospace', fontSize:'.78rem', color:'#374151', lineHeight:1.9 }}>
              <p style={{ margin:'0 0 3px', color:'#16a34a', fontWeight:700 }}>From: ResearchAI &lt;hello@researchai.app&gt;</p>
              <p style={{ margin:'0 0 3px', color:'#374151' }}>Subject: ✅ Your spec is ready — Score: 82/100</p>
              <p style={{ margin:'0 0 6px', color:'#d1d5db' }}>───────────────────────</p>
              <p style={{ margin:0, color:'#6b7280' }}>Hi {user?.full_name?.split(' ')[0]||'Researcher'},<br/>Your spec is complete and scored 82/100 (Excellent). Click to view your full specification…</p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
