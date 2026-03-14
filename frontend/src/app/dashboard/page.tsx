'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useProjects } from '@/hooks/useProjects'
import { useUserStats } from '@/hooks/useUser'
import { useAuth } from '@/hooks/useAuth'
import { useTopicHistory, topicRelativeTime, topicOriginColor, topicOriginLabel } from '@/hooks/useTopics'
import Link from 'next/link'

const fu = (d = 0) => ({ initial:{opacity:0,y:14}, animate:{opacity:1,y:0}, transition:{duration:.45,delay:d,ease:[.22,1,.36,1]} })

const I = {
  Plus:    ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Arrow:   ()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
  ArrowR:  ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
  File:    ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  Check:   ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Star:    ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  Clock:   ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Flask:   ()=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 3h6m-6 0v6l-4 9a1 1 0 0 0 .9 1.5h12.2a1 1 0 0 0 .9-1.5L15 9V3M9 3H6m3 0h6"/></svg>,
  FlaskSm: ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 3h6m-6 0v6l-4 9a1 1 0 0 0 .9 1.5h12.2a1 1 0 0 0 .9-1.5L15 9V3M9 3H6m3 0h6"/></svg>,
  Zap:     ()=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Book:    ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  Trend:   ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
  Compass: ()=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>,
  Beaker:  ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 3h6m-6 0v6l-4 9a1 1 0 0 0 .9 1.5h12.2a1 1 0 0 0 .9-1.5L15 9V3"/></svg>,
}

const Dot = ({c}:{c:string}) => <span style={{ display:'inline-block',width:7,height:7,borderRadius:'50%',background:c,animation:'g-pulse 1.4s infinite' }}/>

function ago(s:string) {
  const d=Date.now()-new Date(s).getTime(),m=Math.floor(d/60000)
  if(m<1) return 'just now'; if(m<60) return `${m}m ago`
  const h=Math.floor(m/60); if(h<24) return `${h}h ago`
  return `${Math.floor(h/24)}d ago`
}
function greeting() { const h=new Date().getHours(); return h<12?'Good morning':h<18?'Good afternoon':'Good evening' }
function scoreColor(n:number) { return n>=75?'#16a34a':n>=55?'#d97706':'#dc2626' }

function ScoreRing({ score }: { score:number }) {
  const size=120, r=48, c=2*Math.PI*r
  const col = score>=75?'#16a34a':score>=55?'#d97706':'#dc2626'
  const lbl = score>=75?'Excellent':score>=55?'Good':'Fair'
  return (
    <div style={{ position:'relative', width:size, height:size, margin:'0 auto 10px' }}>
      {/* Glow ring behind the SVG */}
      <div style={{
        position:'absolute', inset:-4, borderRadius:'50%',
        background:`radial-gradient(circle, ${col}18 0%, transparent 70%)`,
        pointerEvents:'none',
      }}/>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)', position:'relative', zIndex:1 }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f0fdf4" strokeWidth="9"/>
        <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={c} initial={{strokeDashoffset:c}} animate={{strokeDashoffset:c-(score/100)*c}}
          transition={{duration:1.4,delay:.4,ease:[.22,1,.36,1]}}/>
      </svg>
      <div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:1,zIndex:2 }}>
        <span style={{ fontSize:'1.6rem',fontWeight:800,color:'#0f1f0f',lineHeight:1,fontFamily:'Fraunces,serif' }}>{score}</span>
        <span style={{ fontSize:'.62rem',color:col,fontWeight:700,letterSpacing:'.06em',textTransform:'uppercase' }}>{lbl}</span>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { data:projects, isLoading:pL } = useProjects({ limit:8 })
  const { data:stats, isLoading:sL } = useUserStats()
  const { data:topicData, isLoading:tL } = useTopicHistory({ limit:3 })

  const firstName = user?.full_name?.split(' ')[0] || 'Researcher'
  const avgScore = stats?.average_marks ? Math.round(stats.average_marks) : 0
  const completionRate = stats?.total_projects ? Math.round((stats.completed_projects/stats.total_projects)*100) : 0
  const active = useMemo(()=>projects?.find((p:any)=>['generating','reviewing','queued'].includes(p.status)),[projects])
  const recent = useMemo(()=>(projects||[]).slice(0,5),[projects])
  const recentTopics = useMemo(()=>(topicData?.topics||[]).slice(0,3),[topicData])

  const statCards = [
    { label:'Total Specs',       value:sL?'—':(stats?.total_projects??0),    sub:`${stats?.total_projects??0} created`,     icon:<I.File/>,    accent:'#16a34a', bg:'#f0fdf4', border:'#bbf7d0' },
    { label:'Completed',         value:sL?'—':(stats?.completed_projects??0), sub:`${completionRate}% rate`,                icon:<I.Check/>,   accent:'#059669', bg:'#ecfdf5', border:'#a7f3d0' },
    { label:'Topics Explored',   value:tL?'—':(topicData?.total??0),          sub:'via Topic Lab',                          icon:<I.Beaker/>,  accent:'#7c3aed', bg:'#faf5ff', border:'#e9d5ff' },
    { label:'Avg. Score',        value:sL?'—':(avgScore||'—'), suffix:avgScore?'/100':'', sub:'out of 100 pts',              icon:<I.Star/>,    accent:avgScore?scoreColor(avgScore):'#9ca3af', bg:'#fafcfa', border:'#e5e7eb' },
  ]

  return (
    <div style={{ maxWidth:1140 }}>
      {/* ── Greeting ── */}
      <div style={{ display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:28,flexWrap:'wrap',gap:12 }}>
        <div>
          <motion.p {...fu(0)} style={{ fontSize:'.78rem',color:'#9ca3af',marginBottom:3 }}>
            {greeting()}, {new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}
          </motion.p>
          <motion.h1 {...fu(.06)} style={{ fontSize:'clamp(1.6rem,2.5vw,2.1rem)',fontWeight:800,color:'#0f1f0f',fontFamily:'Fraunces,serif',lineHeight:1.1,margin:0 }}>
            {firstName} 👋
          </motion.h1>
          <motion.p {...fu(.1)} style={{ fontSize:'.86rem',color:'#6b7280',marginTop:5 }}>
            {active
              ? <span style={{ display:'inline-flex',alignItems:'center',gap:6 }}>
                  <Dot c="#2563eb"/> Spec generating — <Link href={`/dashboard/projects/${active.id}`} style={{ color:'#16a34a',textDecoration:'none',fontWeight:700 }}>watch live</Link>
                </span>
              : 'What would you like to do today?'
            }
          </motion.p>
        </div>
      </div>

      {/* ── Two Hero Action Cards ── */}
      <motion.div {...fu(.12)} style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:28,alignItems:'stretch' }}>

        {/* Card 1: Topic Lab */}
        <Link href="/dashboard/topics" style={{ textDecoration:'none' }}>
          <motion.div
            whileHover={{ y:-4, boxShadow:'0 16px 40px rgba(124,58,237,.2)' }}
            whileTap={{ scale:.99 }}
            style={{ background:'linear-gradient(135deg,#7c3aed 0%,#a855f7 100%)',borderRadius:20,padding:'24px 26px',cursor:'pointer',position:'relative',overflow:'hidden',transition:'all .2s',minHeight:180,height:'100%',display:'flex',flexDirection:'column',justifyContent:'space-between',boxSizing:'border-box',boxShadow:'0 4px 20px rgba(124,58,237,.12)' }}>
            {/* Decorative orbs */}
            <div style={{ position:'absolute',top:-28,right:-28,width:140,height:140,borderRadius:'50%',background:'rgba(255,255,255,.09)',pointerEvents:'none' }}/>
            <div style={{ position:'absolute',bottom:-40,left:50,width:100,height:100,borderRadius:'50%',background:'rgba(255,255,255,.05)',pointerEvents:'none' }}/>
            <div style={{ position:'absolute',top:60,right:20,width:40,height:40,borderRadius:'50%',background:'rgba(255,255,255,.06)',pointerEvents:'none' }}/>
            <div>
              <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:12 }}>
                <div style={{ width:44,height:44,borderRadius:13,background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',flexShrink:0,backdropFilter:'blur(4px)' }}><I.Flask/></div>
                <div>
                  <div style={{ fontSize:'.65rem',fontWeight:700,color:'rgba(255,255,255,.65)',textTransform:'uppercase',letterSpacing:'.1em' }}>Step 1 · Start Here</div>
                  <h2 style={{ margin:0,fontSize:'1.12rem',fontWeight:800,color:'white',lineHeight:1.2 }}>Topic Lab</h2>
                </div>
              </div>
              <p style={{ margin:0,fontSize:'.84rem',color:'rgba(255,255,255,.88)',lineHeight:1.65 }}>
                Have a topic already? Let AI vet and refine it. Starting fresh? Answer a few questions and get 10–15 personalised, ranked topics — then refine the best one with your AI advisor.
              </p>
            </div>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:18 }}>
              <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                {['Have a topic','Confused?','Need ideas'].map(tag=>(
                  <span key={tag} style={{ padding:'3px 9px',borderRadius:999,background:'rgba(255,255,255,.16)',fontSize:'.68rem',fontWeight:600,color:'rgba(255,255,255,.92)',backdropFilter:'blur(4px)' }}>{tag}</span>
                ))}
              </div>
              <div style={{ width:34,height:34,borderRadius:'50%',background:'rgba(255,255,255,.22)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',flexShrink:0 }}><I.ArrowR/></div>
            </div>
          </motion.div>
        </Link>

        {/* Card 2: Generate Spec */}
        <Link href="/dashboard/generate" style={{ textDecoration:'none' }}>
          <motion.div
            whileHover={{ y:-4, boxShadow:'0 16px 40px rgba(22,163,74,.22)' }}
            whileTap={{ scale:.99 }}
            style={{ background:'linear-gradient(135deg,#16a34a 0%,#22c55e 100%)',borderRadius:20,padding:'24px 26px',cursor:'pointer',position:'relative',overflow:'hidden',transition:'all .2s',minHeight:180,height:'100%',display:'flex',flexDirection:'column',justifyContent:'space-between',boxSizing:'border-box',boxShadow:'0 4px 20px rgba(22,163,74,.12)' }}>
            <div style={{ position:'absolute',top:-28,right:-28,width:140,height:140,borderRadius:'50%',background:'rgba(255,255,255,.09)',pointerEvents:'none' }}/>
            <div style={{ position:'absolute',bottom:-40,left:50,width:100,height:100,borderRadius:'50%',background:'rgba(255,255,255,.05)',pointerEvents:'none' }}/>
            <div style={{ position:'absolute',top:60,right:20,width:40,height:40,borderRadius:'50%',background:'rgba(255,255,255,.06)',pointerEvents:'none' }}/>
            <div>
              <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:12 }}>
                <div style={{ width:44,height:44,borderRadius:13,background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',flexShrink:0,backdropFilter:'blur(4px)' }}><I.Zap/></div>
                <div>
                  <div style={{ fontSize:'.65rem',fontWeight:700,color:'rgba(255,255,255,.65)',textTransform:'uppercase',letterSpacing:'.1em' }}>Step 2 · Already have a topic</div>
                  <h2 style={{ margin:0,fontSize:'1.12rem',fontWeight:800,color:'white',lineHeight:1.2 }}>Generate Spec</h2>
                </div>
              </div>
              <p style={{ margin:0,fontSize:'.84rem',color:'rgba(255,255,255,.88)',lineHeight:1.65 }}>
                Know your topic already? Upload your university guidelines and let our AI build a complete, scored research specification in minutes.
              </p>
            </div>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:18 }}>
              <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                {['Have a topic','Ready to go','Upload guidelines'].map(tag=>(
                  <span key={tag} style={{ padding:'3px 9px',borderRadius:999,background:'rgba(255,255,255,.16)',fontSize:'.68rem',fontWeight:600,color:'rgba(255,255,255,.92)',backdropFilter:'blur(4px)' }}>{tag}</span>
                ))}
              </div>
              <div style={{ width:34,height:34,borderRadius:'50%',background:'rgba(255,255,255,.22)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',flexShrink:0 }}><I.ArrowR/></div>
            </div>
          </motion.div>
        </Link>
      </motion.div>

      {/* ── Stat Cards ── */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:28 }}>
        {statCards.map((c,i)=>(
          <motion.div key={c.label} {...fu(.18+i*.05)} className="g-card-flat"
            style={{ padding:'16px 18px', borderLeft:`3px solid ${c.border}`, position:'relative', overflow:'hidden' }}>
            {/* Subtle top gradient accent */}
            <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${c.accent}40,${c.accent},${c.accent}40)`,borderRadius:'inherit' }}/>
            <div style={{ width:34,height:34,borderRadius:10,background:c.bg,display:'flex',alignItems:'center',justifyContent:'center',color:c.accent,marginBottom:11 }}>{c.icon}</div>
            <div style={{ display:'flex',alignItems:'baseline',gap:3,marginBottom:2 }}>
              {(sL&&i!==2)||(tL&&i===2) ? <div className="g-sk" style={{ width:44,height:28 }}/> : <>
                <span style={{ fontSize:'1.8rem',fontWeight:800,color:'#0f1f0f',fontFamily:'Fraunces,serif',lineHeight:1 }}>{c.value}</span>
                {(c as any).suffix&&<span style={{ fontSize:'.78rem',color:'#9ca3af' }}>{(c as any).suffix}</span>}
              </>}
            </div>
            <p style={{ margin:'0 0 1px',fontSize:'.74rem',fontWeight:700,color:'#374151' }}>{c.label}</p>
            <p style={{ margin:0,fontSize:'.68rem',color:'#9ca3af' }}>{c.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Recent Activity + Right Panel ── */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 308px',gap:18,alignItems:'start' }}>

        {/* Left — Specs + Topics */}
        <div style={{ display:'flex',flexDirection:'column',gap:18 }}>

          {/* Recent Specifications */}
          <motion.div {...fu(.36)}>
            <div className="g-card-flat" style={{ overflow:'hidden' }}>
              <div className="g-section-head">
                <div style={{ display:'flex',alignItems:'center',gap:9 }}>
                  <div style={{ width:28,height:28,borderRadius:8,background:'#f0fdf4',display:'flex',alignItems:'center',justifyContent:'center',color:'#16a34a' }}><I.File/></div>
                  <span style={{ fontWeight:700,color:'#0f1f0f',fontSize:'.9rem' }}>Recent Specifications</span>
                </div>
                <Link href="/dashboard/projects" style={{ display:'flex',alignItems:'center',gap:4,fontSize:'.76rem',fontWeight:700,color:'#16a34a',textDecoration:'none' }}>View all <I.Arrow/></Link>
              </div>
              {pL ? (
                <div style={{ padding:'16px 20px',display:'flex',flexDirection:'column',gap:10 }}>
                  {[0,1,2].map(i=><div key={i} className="g-sk" style={{ height:58 }}/>)}
                </div>
              ) : recent.length===0 ? (
                <div style={{ padding:'40px 20px',textAlign:'center' }}>
                  <div style={{ width:48,height:48,borderRadius:14,background:'#f0fdf4',display:'flex',alignItems:'center',justifyContent:'center',color:'#16a34a',margin:'0 auto 12px' }}><I.File/></div>
                  <p style={{ fontWeight:700,color:'#0f1f0f',marginBottom:5 }}>No specifications yet</p>
                  <p style={{ fontSize:'.84rem',color:'#9ca3af',marginBottom:18 }}>Start with Topic Lab if you need help, or jump straight to generating your spec.</p>
                  <div style={{ display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap' }}>
                    <Link href="/dashboard/topics" style={{ textDecoration:'none' }}>
                      <button className="g-btn-ghost" style={{ fontSize:'.83rem' }}>Open Topic Lab</button>
                    </Link>
                    <Link href="/dashboard/generate" style={{ textDecoration:'none' }}>
                      <button className="g-btn" style={{ fontSize:'.83rem' }}><I.Plus/> Generate Spec</button>
                    </Link>
                  </div>
                </div>
              ) : recent.map((p:any,i:number) => {
                const sc = p.total_marks
                return (
                  <motion.div key={p.id} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:.36+i*.05}}
                    className="g-row" onClick={()=>router.push(`/dashboard/projects/${p.id}`)}
                    style={{ padding:'13px 20px',borderBottom:i<recent.length-1?'1px solid #f3f4f6':'none',cursor:'pointer',display:'flex',alignItems:'center',gap:14 }}>
                    {/* Status dot */}
                    <div style={{ width:8,height:8,borderRadius:'50%',flexShrink:0,background:p.status==='completed'?'#16a34a':p.status==='failed'?'#dc2626':'#d97706',boxShadow:`0 0 0 2px ${p.status==='completed'?'#dcfce7':p.status==='failed'?'#fef2f2':'#fef3c7'}` }}/>
                    <div style={{ flex:1,minWidth:0 }}>
                      <p style={{ margin:'0 0 2px',fontWeight:600,color:'#0f1f0f',fontSize:'.86rem',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>
                        {p.research_topic||p.field_of_study||'Untitled'}
                      </p>
                      <p style={{ margin:0,fontSize:'.72rem',color:'#9ca3af' }}>{p.academic_level} · {p.field_of_study} · {ago(p.created_at)}</p>
                    </div>
                    <div style={{ display:'flex',alignItems:'center',gap:10,flexShrink:0 }}>
                      {sc!=null && <span style={{ fontSize:'.84rem',fontWeight:800,color:scoreColor(sc),fontFamily:'Fraunces,serif' }}>{sc}<span style={{ fontSize:'.65rem',color:'#9ca3af',fontWeight:400 }}>/100</span></span>}
                      {p.status==='failed'&&<span style={{ fontSize:'.7rem',fontWeight:700,color:'#dc2626',background:'#fef2f2',padding:'2px 8px',borderRadius:999 }}>Failed</span>}
                      <I.Arrow/>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>

          {/* Recent Topics from Topic Lab */}
          <motion.div {...fu(.42)}>
            <div className="g-card-flat" style={{ overflow:'hidden' }}>
              <div className="g-section-head">
                <div style={{ display:'flex',alignItems:'center',gap:9 }}>
                  <div style={{ width:28,height:28,borderRadius:8,background:'#faf5ff',display:'flex',alignItems:'center',justifyContent:'center',color:'#7c3aed' }}><I.FlaskSm/></div>
                  <span style={{ fontWeight:700,color:'#0f1f0f',fontSize:'.9rem' }}>Recent Topics</span>
                </div>
                <Link href="/dashboard/projects?tab=topics" style={{ display:'flex',alignItems:'center',gap:4,fontSize:'.76rem',fontWeight:700,color:'#7c3aed',textDecoration:'none' }}>View all <I.Arrow/></Link>
              </div>
              {tL ? (
                <div style={{ padding:'16px 20px',display:'flex',flexDirection:'column',gap:10 }}>
                  {[0,1].map(i=><div key={i} className="g-sk" style={{ height:52 }}/>)}
                </div>
              ) : recentTopics.length===0 ? (
                <div style={{ padding:'28px 20px',textAlign:'center' }}>
                  <div style={{ width:42,height:42,borderRadius:12,background:'#faf5ff',display:'flex',alignItems:'center',justifyContent:'center',color:'#7c3aed',margin:'0 auto 12px' }}><I.FlaskSm/></div>
                  <p style={{ fontWeight:700,color:'#0f1f0f',marginBottom:5,fontSize:'.9rem' }}>No topics explored yet</p>
                  <p style={{ fontSize:'.82rem',color:'#9ca3af',marginBottom:14 }}>Use Topic Lab to find, vet, or refine your research topic before generating a spec.</p>
                  <Link href="/dashboard/topics" style={{ textDecoration:'none' }}>
                    <button className="g-btn-ghost" style={{ fontSize:'.82rem' }}><I.FlaskSm/> Open Topic Lab</button>
                  </Link>
                </div>
              ) : recentTopics.map((t:any,i:number)=>(
                <motion.div key={t.id} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:.42+i*.05}}
                  style={{ padding:'12px 20px',borderBottom:i<recentTopics.length-1?'1px solid #f3f4f6':'none',display:'flex',alignItems:'center',gap:14 }}>
                  <div style={{ flex:1,minWidth:0 }}>
                    <p style={{ margin:'0 0 2px',fontWeight:600,color:'#0f1f0f',fontSize:'.86rem',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{t.final_topic}</p>
                    <p style={{ margin:0,fontSize:'.72rem',color:'#9ca3af' }}>{t.field} · {t.degree_level} · {topicRelativeTime(t.created_at)}</p>
                  </div>
                  <div style={{ display:'flex',alignItems:'center',gap:8,flexShrink:0 }}>
                    <span style={{ fontSize:'.68rem',fontWeight:700,color:topicOriginColor(t.origin),background:`${topicOriginColor(t.origin)}14`,padding:'2px 8px',borderRadius:999,border:`1px solid ${topicOriginColor(t.origin)}28` }}>
                      {topicOriginLabel(t.origin)}
                    </span>
                    {t.linked_project_id
                      ? <span style={{ fontSize:'.68rem',fontWeight:700,color:'#16a34a',background:'#f0fdf4',padding:'2px 8px',borderRadius:999 }}>→ Spec</span>
                      : <Link href={`/dashboard/generate?topic=${encodeURIComponent(t.final_topic||'')}&field=${encodeURIComponent(t.field||'')}&level=${encodeURIComponent(t.degree_level||'')}&topic_session_id=${t.id}&from_topics=true`} style={{ fontSize:'.68rem',fontWeight:700,color:'#7c3aed',background:'#faf5ff',padding:'2px 8px',borderRadius:999,textDecoration:'none',border:'1px solid #e9d5ff' }}>Use it</Link>
                    }
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right Panel */}
        <div style={{ display:'flex',flexDirection:'column',gap:18 }}>

          {/* Score Ring */}
          {avgScore>0 && (
            <motion.div {...fu(.4)} className="g-card-flat" style={{ padding:'20px',textAlign:'center' }}>
              <p style={{ margin:'0 0 14px',fontSize:'.7rem',fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'.09em' }}>Avg. Score</p>
              <ScoreRing score={avgScore}/>
              <p style={{ fontSize:'.78rem',color:'#6b7280',lineHeight:1.6,margin:0 }}>
                {avgScore>=75?'Outstanding — specs are supervisor-ready.':avgScore>=60?'Solid results. Push for 75+ to impress.':'Upload guidelines to boost your score.'}
              </p>
            </motion.div>
          )}

          {/* Quick Actions */}
          <motion.div {...fu(.44)} className="g-card-flat" style={{ overflow:'hidden' }}>
            <div className="g-section-head" style={{ padding:'13px 16px' }}>
              <span style={{ fontWeight:700,color:'#0f1f0f',fontSize:'.86rem' }}>Quick Actions</span>
            </div>
            <div style={{ padding:'8px 8px',display:'flex',flexDirection:'column',gap:2 }}>
              {[
                { icon:<I.FlaskSm/>, label:'Topic Lab',      sub:'Find, vet & refine topics', href:'/dashboard/topics',   c:'#7c3aed', bg:'#faf5ff', hbg:'#f3e8ff' },
                { icon:<I.Zap/>,    label:'Generate spec',   sub:'Upload & generate',          href:'/dashboard/generate', c:'#16a34a', bg:'#f0fdf4', hbg:'#dcfce7' },
                { icon:<I.Book/>,   label:'Browse my specs', sub:'View all projects',          href:'/dashboard/projects', c:'#2563eb', bg:'#eff6ff', hbg:'#dbeafe' },
                { icon:<I.Trend/>,  label:'Performance',     sub:'Track your scores',          href:'/dashboard/projects', c:'#d97706', bg:'#fffbeb', hbg:'#fef3c7' },
              ].map(a=>(
                <Link key={a.label} href={a.href} style={{ textDecoration:'none' }}>
                  <motion.div
                    whileHover={{ x: 2 }}
                    style={{ display:'flex',alignItems:'center',gap:10,padding:'9px 10px',borderRadius:11,border:'1px solid transparent',cursor:'pointer',transition:'all .15s' }}
                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=a.hbg;(e.currentTarget as HTMLElement).style.borderColor=`${a.c}20`}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='transparent';(e.currentTarget as HTMLElement).style.borderColor='transparent'}}>
                    <div style={{ width:32,height:32,borderRadius:9,background:a.bg,display:'flex',alignItems:'center',justifyContent:'center',color:a.c,flexShrink:0 }}>{a.icon}</div>
                    <div style={{ flex:1 }}>
                      <p style={{ margin:0,fontSize:'.82rem',fontWeight:600,color:'#0f1f0f',lineHeight:1.2 }}>{a.label}</p>
                      <p style={{ margin:0,fontSize:'.7rem',color:'#9ca3af' }}>{a.sub}</p>
                    </div>
                    <div style={{ color:'#d1d5db' }}><I.Arrow/></div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}