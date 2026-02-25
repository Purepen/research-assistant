'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useProjects } from '@/hooks/useProjects'
import { useUserStats } from '@/hooks/useUser'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'

const fu = (d = 0) => ({ initial:{opacity:0,y:14}, animate:{opacity:1,y:0}, transition:{duration:.45,delay:d,ease:[.22,1,.36,1]} })

const I = {
  Plus:  ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Arrow: ()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
  File:  ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  Check: ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Star:  ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  Clock: ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Zap:   ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Book:  ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  Trend: ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
  Spark: ()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>,
}

const STATUS: Record<string, { color:string; bg:string; border:string; label:string; pulse?:boolean }> = {
  complete:   { color:'#16a34a', bg:'#f0fdf4', border:'#bbf7d0', label:'Complete' },
  generating: { color:'#2563eb', bg:'#eff6ff', border:'#bfdbfe', label:'Generating', pulse:true },
  reviewing:  { color:'#d97706', bg:'#fffbeb', border:'#fde68a', label:'Reviewing',  pulse:true },
  queued:     { color:'#6b7280', bg:'#f9fafb', border:'#e5e7eb', label:'Queued' },
  failed:     { color:'#dc2626', bg:'#fef2f2', border:'#fecaca', label:'Failed' },
  draft:      { color:'#7c3aed', bg:'#faf5ff', border:'#e9d5ff', label:'Draft' },
}

function Pill({ status }: { status:string }) {
  const s = STATUS[status] || STATUS.draft
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:999, background:s.bg, border:`1px solid ${s.border}`, fontSize:'.71rem', fontWeight:700, color:s.color }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:s.color, flexShrink:0, animation:s.pulse?'g-pulse 1.4s infinite':'none' }}/>
      {s.label}
    </span>
  )
}

function ScoreRing({ score }: { score:number }) {
  const size=120, r=48
  const c = 2*Math.PI*r
  const color = score>=75 ? '#16a34a' : score>=55 ? '#d97706' : '#dc2626'
  const label = score>=75 ? 'Excellent' : score>=55 ? 'Good' : 'Fair'
  return (
    <div style={{ position:'relative', width:size, height:size, margin:'0 auto 10px' }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth="9"/>
        <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset:c }}
          animate={{ strokeDashoffset:c-(score/100)*c }}
          transition={{ duration:1.4, delay:.4, ease:[.22,1,.36,1] }}/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:1 }}>
        <span style={{ fontSize:'1.6rem', fontWeight:800, color:'#0f1f0f', lineHeight:1, fontFamily:'Fraunces,serif' }}>{score}</span>
        <span style={{ fontSize:'.62rem', color, fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase' }}>{label}</span>
      </div>
    </div>
  )
}

function MiniBar({ v, max, color }: { v:number; max:number; color:string }) {
  return (
    <div style={{ height:3, background:'#e5e7eb', borderRadius:2, flex:1, overflow:'hidden' }}>
      <motion.div initial={{ width:0 }} animate={{ width:`${max>0?(v/max)*100:0}%` }} transition={{ duration:1, delay:.7, ease:[.22,1,.36,1] }}
        style={{ height:'100%', background:color, borderRadius:2 }}/>
    </div>
  )
}

function ago(s:string) {
  const d=Date.now()-new Date(s).getTime(), m=Math.floor(d/60000)
  if(m<1) return 'just now'; if(m<60) return `${m}m ago`
  const h=Math.floor(m/60); if(h<24) return `${h}h ago`
  return `${Math.floor(h/24)}d ago`
}
function greeting() { const h=new Date().getHours(); return h<12?'Good morning':h<18?'Good afternoon':'Good evening' }
function scoreColor(n:number) { return n>=75?'#16a34a':n>=55?'#d97706':'#dc2626' }

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { data:projects, isLoading:pL } = useProjects({ limit:8 })
  const { data:stats,    isLoading:sL } = useUserStats()

  const firstName = user?.full_name?.split(' ')[0] || 'Researcher'
  const avgScore = stats?.average_marks ? Math.round(stats.average_marks) : 0
  const completionRate = stats?.total_projects ? Math.round((stats.completed_projects/stats.total_projects)*100) : 0
  const active = useMemo(() => projects?.find((p:any)=>['generating','reviewing','queued'].includes(p.status)), [projects])
  const recent = useMemo(() => (projects||[]).slice(0,5), [projects])
  const levelDist = useMemo(() => {
    const d:Record<string,number> = {BSc:0,MSc:0,PhD:0}
    ;(projects||[]).forEach((p:any)=>{ if(d[p.academic_level]!==undefined) d[p.academic_level]++ })
    return d
  }, [projects])

  const cards = [
    { label:'Total Specs',  value:sL?'—':(stats?.total_projects??0),     sub:`${stats?.total_projects??0} created`,   icon:<I.File/>,  accent:'#16a34a', bg:'#f0fdf4' },
    { label:'Completed',    value:sL?'—':(stats?.completed_projects??0),  sub:`${completionRate}% rate`,               icon:<I.Check/>, accent:'#059669', bg:'#ecfdf5' },
    { label:'Avg. Score',   value:sL?'—':(avgScore||'—'), suffix:avgScore?'/100':'', sub:avgScore?'out of 100':'No data yet', icon:<I.Star/>,  accent:avgScore?scoreColor(avgScore):'#9ca3af', bg:avgScore?`${scoreColor(avgScore)}10`:'#f9fafb' },
    { label:'Time Saved',   value:sL?'—':(stats?.total_generation_time_hours?`${stats.total_generation_time_hours}h`:'—'), sub:'vs manual drafting', icon:<I.Clock/>, accent:'#7c3aed', bg:'#faf5ff' },
  ]

  return (
    <div style={{ maxWidth:1140 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:12 }}>
        <div>
          <motion.p {...fu(0)} style={{ fontSize:'.78rem', color:'#9ca3af', marginBottom:3 }}>
            {greeting()}, {new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}
          </motion.p>
          <motion.h1 {...fu(.06)} style={{ fontSize:'clamp(1.6rem,2.5vw,2.1rem)', fontWeight:800, color:'#0f1f0f', fontFamily:'Fraunces,serif', lineHeight:1.1, margin:0 }}>
            {firstName} 👋
          </motion.h1>
          <motion.p {...fu(.1)} style={{ fontSize:'.86rem', color:'#6b7280', marginTop:5 }}>
            {active
              ? <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                  <span style={{ width:7,height:7,borderRadius:'50%',background:'#2563eb',animation:'g-pulse 1.4s infinite',display:'inline-block' }}/>
                  Spec generating — <Link href={`/dashboard/projects/${active.id}`} style={{ color:'#16a34a',textDecoration:'none',fontWeight:700 }}>watch live</Link>
                </span>
              : 'Your research command centre is ready.'
            }
          </motion.p>
        </div>
        <motion.div {...fu(.12)} style={{ display:'flex', gap:8 }}>
          <Link href="/dashboard/projects" style={{ textDecoration:'none' }}>
            <button className="g-btn-outline" style={{ fontSize:'.83rem' }}><I.Book/> All projects</button>
          </Link>
          <Link href="/dashboard/generate" style={{ textDecoration:'none' }}>
            <button className="g-btn" style={{ fontSize:'.85rem' }}><I.Plus/> New Specification</button>
          </Link>
        </motion.div>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        {cards.map((c,i) => (
          <motion.div key={c.label} {...fu(.1+i*.06)} className="g-card" style={{ padding:'18px 20px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-10, right:-10, width:60, height:60, borderRadius:'50%', background:c.bg, filter:'blur(20px)', pointerEvents:'none' }}/>
            <div style={{ width:32,height:32,borderRadius:9,background:c.bg,border:`1px solid ${c.accent}18`,display:'flex',alignItems:'center',justifyContent:'center',color:c.accent,marginBottom:12 }}>
              {c.icon}
            </div>
            <div style={{ display:'flex', alignItems:'baseline', gap:3, marginBottom:3 }}>
              {sL ? <div className="g-sk" style={{ width:44,height:28 }}/> : <>
                <span style={{ fontSize:'1.8rem', fontWeight:800, color:'#0f1f0f', fontFamily:'Fraunces,serif', lineHeight:1 }}>{c.value}</span>
                {c.suffix && <span style={{ fontSize:'.78rem', color:'#9ca3af' }}>{c.suffix}</span>}
              </>}
            </div>
            <p style={{ margin:'0 0 1px', fontSize:'.74rem', fontWeight:700, color:'#374151' }}>{c.label}</p>
            <p style={{ margin:0, fontSize:'.68rem', color:'#9ca3af' }}>{c.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* 2-col: recent projects + right panel */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 308px', gap:18, alignItems:'start' }}>

        {/* Recent projects */}
        <motion.div {...fu(.3)}>
          <div className="g-card-flat" style={{ overflow:'hidden' }}>
            <div className="g-section-head">
              <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                <div style={{ width:28,height:28,borderRadius:8,background:'#f0fdf4',display:'flex',alignItems:'center',justifyContent:'center',color:'#16a34a' }}><I.File/></div>
                <span style={{ fontWeight:700, color:'#0f1f0f', fontSize:'.9rem' }}>Recent Specifications</span>
              </div>
              <Link href="/dashboard/projects" style={{ display:'flex', alignItems:'center', gap:4, fontSize:'.76rem', fontWeight:700, color:'#16a34a', textDecoration:'none' }}>View all <I.Arrow/></Link>
            </div>

            {pL ? (
              <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:10 }}>
                {[0,1,2].map(i=><div key={i} className="g-sk" style={{ height:58 }}/>)}
              </div>
            ) : recent.length === 0 ? (
              <div style={{ padding:'52px 20px', textAlign:'center' }}>
                <div style={{ width:48,height:48,borderRadius:13,background:'#f0fdf4',border:'1px solid #bbf7d0',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',color:'#16a34a' }}><I.File/></div>
                <p style={{ fontWeight:700, color:'#0f1f0f', marginBottom:5 }}>No specifications yet</p>
                <p style={{ fontSize:'.84rem', color:'#9ca3af', marginBottom:18 }}>Generate your first AI-powered research spec in minutes.</p>
                <Link href="/dashboard/generate" style={{ textDecoration:'none' }}>
                  <button className="g-btn" style={{ fontSize:'.84rem', padding:'9px 18px' }}><I.Plus/> Generate First Spec</button>
                </Link>
              </div>
            ) : recent.map((p:any,i:number) => (
              <motion.div key={p.id} initial={{ opacity:0,x:-8 }} animate={{ opacity:1,x:0 }} transition={{ delay:.36+i*.05 }}
                className="g-row" onClick={()=>router.push(`/dashboard/projects/${p.id}`)}
                style={{ padding:'12px 20px', borderBottom:i<recent.length-1?'1px solid #f0f4f0':'none', display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:28,height:28,borderRadius:8,background:'#f9fafb',border:'1px solid #e8ede8',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.68rem',fontWeight:700,color:'#9ca3af',flexShrink:0 }}>
                  {String(i+1).padStart(2,'0')}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ margin:'0 0 3px', fontWeight:600, color:'#0f1f0f', fontSize:'.87rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {p.research_topic || p.field_of_study}
                  </p>
                  <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                    <span style={{ fontSize:'.68rem', color:'#6b7280', background:'#f3f4f6', padding:'1px 7px', borderRadius:5, fontWeight:600 }}>{p.academic_level}</span>
                    <span style={{ fontSize:'.68rem', color:'#9ca3af' }}>{p.field_of_study}</span>
                    <span style={{ fontSize:'.68rem', color:'#9ca3af' }}>· {ago(p.created_at)}</span>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                  {p.status==='complete' && p.total_marks!=null ? (
                    <span style={{ fontSize:'.95rem', fontWeight:800, color:scoreColor(p.total_marks), fontFamily:'Fraunces,serif' }}>{p.total_marks}<span style={{ fontSize:'.65rem', color:'#9ca3af', fontWeight:400 }}>/100</span></span>
                  ) : <Pill status={p.status}/>}
                  {['generating','reviewing'].includes(p.status) && (
                    <div style={{ width:52 }}>
                      <p style={{ fontSize:'.62rem', color:'#9ca3af', marginBottom:2 }}>{p.progress_percentage??0}%</p>
                      <MiniBar v={p.progress_percentage??0} max={100} color="#2563eb"/>
                    </div>
                  )}
                  <div style={{ color:'#d1d5db' }}><I.Arrow/></div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Level breakdown */}
          {!pL && recent.length>0 && (
            <motion.div {...fu(.46)} style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginTop:12 }}>
              {(['BSc','MSc','PhD'] as const).map((lvl,i) => {
                const cnt=levelDist[lvl], total=(projects||[]).length
                const cols=['#7c3aed','#16a34a','#2563eb']
                return (
                  <div key={lvl} className="g-card" style={{ padding:'13px 14px' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                      <span style={{ fontSize:'.74rem', fontWeight:700, color:'#374151' }}>{lvl}</span>
                      <span style={{ fontSize:'1.05rem', fontWeight:800, color:cols[i], fontFamily:'Fraunces,serif' }}>{cnt}</span>
                    </div>
                    <MiniBar v={cnt} max={total} color={cols[i]}/>
                    <p style={{ margin:'4px 0 0', fontSize:'.65rem', color:'#9ca3af' }}>{total>0?Math.round((cnt/total)*100):0}% of specs</p>
                  </div>
                )
              })}
            </motion.div>
          )}
        </motion.div>

        {/* Right panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Score ring */}
          {avgScore>0 && (
            <motion.div {...fu(.34)} className="g-card" style={{ padding:'20px', textAlign:'center' }}>
              <p className="g-label" style={{ marginBottom:14 }}>Avg. Score</p>
              <ScoreRing score={avgScore}/>
              <p style={{ fontSize:'.78rem', color:'#6b7280', lineHeight:1.6, margin:0 }}>
                {avgScore>=75 ? 'Outstanding — specs are supervisor-ready.' :
                 avgScore>=60 ? 'Solid results. Push for 75+ to impress.' :
                 'Upload guidelines to boost your score 15-20 pts.'}
              </p>
            </motion.div>
          )}

          {/* Quick actions */}
          <motion.div {...fu(.38)} className="g-card-flat" style={{ overflow:'hidden' }}>
            <div className="g-section-head" style={{ padding:'13px 16px' }}>
              <span style={{ fontWeight:700, color:'#0f1f0f', fontSize:'.86rem' }}>Quick Actions</span>
            </div>
            <div style={{ padding:'8px 8px', display:'flex', flexDirection:'column', gap:3 }}>
              {[
                { icon:<I.Zap/>,   label:'Generate new spec',  sub:'Start a new project',  href:'/dashboard/generate', c:'#16a34a', bg:'#f0fdf4' },
                { icon:<I.Book/>,  label:'Browse my specs',    sub:'View all projects',    href:'/dashboard/projects', c:'#7c3aed', bg:'#faf5ff' },
                { icon:<I.Trend/>, label:'Performance stats',  sub:'Track your scores',    href:'/dashboard/projects', c:'#2563eb', bg:'#eff6ff' },
              ].map(a => (
                <Link key={a.label} href={a.href} style={{ textDecoration:'none' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:10, border:'1px solid transparent', cursor:'pointer', transition:'all .15s' }}
                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=a.bg;(e.currentTarget as HTMLElement).style.borderColor=`${a.c}18`}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='transparent';(e.currentTarget as HTMLElement).style.borderColor='transparent'}}>
                    <div style={{ width:30,height:30,borderRadius:8,background:a.bg,display:'flex',alignItems:'center',justifyContent:'center',color:a.c,flexShrink:0 }}>{a.icon}</div>
                    <div style={{ flex:1 }}>
                      <p style={{ margin:0, fontSize:'.82rem', fontWeight:600, color:'#0f1f0f', lineHeight:1.2 }}>{a.label}</p>
                      <p style={{ margin:0, fontSize:'.7rem', color:'#9ca3af' }}>{a.sub}</p>
                    </div>
                    <div style={{ color:'#d1d5db' }}><I.Arrow/></div>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* AI insight */}
          <motion.div {...fu(.44)} style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:14, padding:'18px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-15, right:-15, width:80, height:80, borderRadius:'50%', background:'#dcfce7', filter:'blur(20px)', pointerEvents:'none' }}/>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
              <I.Spark/><span style={{ fontSize:'.7rem', fontWeight:700, color:'#16a34a', letterSpacing:'.06em', textTransform:'uppercase' }}>AI Insight</span>
            </div>
            <p style={{ margin:0, fontSize:'.82rem', color:'#374151', lineHeight:1.65 }}>
              {avgScore>=75 ? <>Your <strong style={{ color:'#16a34a' }}>{avgScore}/100</strong> average is excellent. Supervisors approve scores above 75 first time 80% of the time.</> :
               avgScore>0 ? <>Upload your university's guidelines PDF when generating — aligned specs score <strong style={{ color:'#16a34a' }}>15-20 pts higher</strong> on average.</> :
               <>Your first spec sets the baseline. Upload your supervisor's guidelines PDF for the highest possible score from the start.</>}
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
