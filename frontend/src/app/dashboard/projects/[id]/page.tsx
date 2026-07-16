'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useProject, useProjectStatus, useProjectResult, useDeleteProject } from '@/hooks/useProjects'
import { useQueryClient } from '@tanstack/react-query'

/* ─── Icons ─────────────────────────────────────────────────────────────── */
const I = {
  Back:          ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>,
  Download:      ()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Refresh:       ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  Trash:         ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Spin:          ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>,
  Check:         ()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  File:          ()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  Star:          ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  Book:          ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  Link:          ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  Info:          ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  X:             ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Chart:         ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  // ── NEW ────────────────────────────────────────────────────────────────
  AlertTriangle: ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
}

const ACTIVE = new Set(['queued','generating','reviewing'])
const isActive = (s?: string) => !!s && ACTIVE.has(s)

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
    <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:999, background:s.bg, border:`1.5px solid ${s.border}`, fontSize:'.8rem', fontWeight:700, color:s.color }}>
      <span style={{ width:7, height:7, borderRadius:'50%', background:s.color, flexShrink:0, animation:s.pulse?'g-pulse 1.4s infinite':'none' }}/>
      {s.label}
    </span>
  )
}

function scoreColor(n:number) { return n>=75?'#16a34a':n>=55?'#d97706':'#dc2626' }
function scoreLabel(n:number) { return n>=75?'Excellent — supervisor-ready':n>=55?'Good — minor improvements needed':'Needs Work — consider revisions' }
function scoreBg(n:number)    { return n>=75?'#f0fdf4':n>=55?'#fffbeb':'#fef2f2' }
function scoreBorder(n:number){ return n>=75?'#bbf7d0':n>=55?'#fde68a':'#fecaca' }

/* ─── Progress Tracker ───────────────────────────────────────────────────── */
function ProgressTracker({ progress, phase, status }: { progress:number; phase:string; status:string }) {
  const phases = [
    { key:'queued',     label:'Queued',      icon:<I.Info/> },
    { key:'generating', label:'Researching', icon:<I.Book/> },
    { key:'reviewing',  label:'AI Review',   icon:<I.Star/> },
    { key:'complete',   label:'Complete',    icon:<I.Check/> },
  ]
  const currentIdx = phases.findIndex(p => status.includes(p.key))
  return (
    <div style={{ background:'white', border:'1px solid #e8ede8', borderRadius:16, padding:'24px', marginBottom:20, boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <h2 style={{ margin:'0 0 4px', fontWeight:700, color:'#0f1f0f', fontSize:'1.05rem' }}>Generating your specification…</h2>
          <p style={{ margin:0, fontSize:'.84rem', color:'#6b7280' }}>{phase || 'Processing…'}</p>
        </div>
        <div style={{ fontSize:'1.8rem', fontWeight:800, color:'#16a34a', fontFamily:'Fraunces,serif' }}>
          {progress}%
        </div>
      </div>
      <div style={{ height:8, background:'#f3f4f6', borderRadius:999, overflow:'hidden', marginBottom:20 }}>
        <motion.div initial={{ width:0 }} animate={{ width:`${progress}%` }} transition={{ duration:.5, ease:'easeOut' }}
          style={{ height:'100%', background:'linear-gradient(90deg,#16a34a,#22c55e)', borderRadius:999 }}/>
      </div>
      <div style={{ display:'flex', gap:0 }}>
        {phases.map((ph, i) => {
          const done   = i < currentIdx
          const active = i === currentIdx
          return (
            <div key={ph.key} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', position:'relative' }}>
              {i < phases.length-1 && <div style={{ position:'absolute', top:14, left:'50%', width:'100%', height:2, background: done?'#16a34a':'#e5e7eb', zIndex:0 }}/>}
              <div style={{ width:28, height:28, borderRadius:'50%', background: done?'#16a34a':active?'#dcfce7':'#f3f4f6', border:`2px solid ${done||active?'#16a34a':'#e5e7eb'}`, display:'flex', alignItems:'center', justifyContent:'center', color: done?'white':active?'#16a34a':'#9ca3af', zIndex:1, position:'relative', boxShadow:active?'0 0 0 4px rgba(22,163,74,.15)':'none', transition:'all .3s', flexShrink:0 }}>
                {done ? <I.Check/> : ph.icon}
              </div>
              <span style={{ fontSize:'.68rem', fontWeight: active?700:500, color: done||active?'#16a34a':'#9ca3af', marginTop:6, textAlign:'center' }}>{ph.label}</span>
            </div>
          )
        })}
      </div>
      <div style={{ marginTop:18, padding:'12px 14px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10, display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ color:'#16a34a', animation:'g-spin 1.2s linear infinite', flexShrink:0 }}><I.Spin/></div>
        <p style={{ margin:0, fontSize:'.82rem', color:'#374151' }}>You can safely leave this page — your spec will keep generating in the background.</p>
      </div>
    </div>
  )
}

/* ─── Score Card ─────────────────────────────────────────────────────────── */
function ScoreCard({ marks, decision }: { marks:number; decision?:string }) {
  const size=110, r=44
  const c = 2*Math.PI*r
  const col = scoreColor(marks)
  return (
    <div style={{ background:scoreBg(marks), border:`1.5px solid ${scoreBorder(marks)}`, borderRadius:14, padding:'18px', textAlign:'center' }}>
      <p style={{ margin:'0 0 12px', fontSize:'.68rem', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.1em' }}>AI Score</p>
      <div style={{ position:'relative', width:size, height:size, margin:'0 auto 12px' }}>
        <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth="8"/>
          <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={c} initial={{ strokeDashoffset:c }}
            animate={{ strokeDashoffset:c-(marks/100)*c }}
            transition={{ duration:1.4, delay:.3, ease:[.22,1,.36,1] }}/>
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontSize:'1.8rem', fontWeight:800, color:'#0f1f0f', fontFamily:'Fraunces,serif', lineHeight:1 }}>{marks}</span>
          <span style={{ fontSize:'.6rem', color:'#9ca3af' }}>/100</span>
        </div>
      </div>
      <p style={{ margin:'0 0 6px', fontSize:'.82rem', fontWeight:700, color:col }}>{scoreLabel(marks).split(' — ')[0]}</p>
      <p style={{ margin:0, fontSize:'.76rem', color:'#6b7280', lineHeight:1.5 }}>{scoreLabel(marks).split(' — ')[1]}</p>
      {decision && <div style={{ marginTop:10, padding:'4px 12px', borderRadius:999, display:'inline-block', background: decision==='APPROVED'?'#f0fdf4':'#fef2f2', border:`1px solid ${decision==='APPROVED'?'#bbf7d0':'#fecaca'}`, fontSize:'.72rem', fontWeight:700, color: decision==='APPROVED'?'#16a34a':'#dc2626' }}>{decision}</div>}
    </div>
  )
}

/* ─── Spec Section ───────────────────────────────────────────────────────── */
function SpecSection({ label, data }: { label:string; data:any }) {
  const [open, setOpen] = useState(true)
  if (!data) return null
  return (
    <div style={{ background:'white', border:'1px solid #e8ede8', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
      <button onClick={()=>setOpen(!open)} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', background:'none', border:'none', cursor:'pointer', borderBottom: open?'1px solid #f0f4f0':'none', transition:'background .15s' }}
        onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='#f9fafb'}
        onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='none'}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:28, height:28, borderRadius:8, background:'#f0fdf4', border:'1px solid #bbf7d0', display:'flex', alignItems:'center', justifyContent:'center', color:'#16a34a', flexShrink:0 }}><I.File/></div>
          <span style={{ fontWeight:700, color:'#0f1f0f', fontSize:'.9rem' }}>{label}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:'.72rem', color:'#9ca3af', background:'#f3f4f6', padding:'2px 8px', borderRadius:6 }}>{data.word_count} words</span>
          <span style={{ color:'#9ca3af', fontSize:'.8rem', fontWeight:700 }}>{open?'↑':'↓'}</span>
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:.2 }}>
            <div style={{ padding:'20px 22px' }}>
              <p className="g-spec-content">{data.content}</p>
              {data.key_points?.length>0 && (
                <div style={{ marginTop:16, paddingTop:16, borderTop:'1px solid #f0f4f0' }}>
                  <p style={{ fontSize:'.72rem', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:10 }}>Key Points</p>
                  <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:6 }}>
                    {data.key_points.map((pt:string, i:number) => (
                      <li key={i} style={{ display:'flex', alignItems:'flex-start', gap:8, fontSize:'.84rem', color:'#374151' }}>
                        <span style={{ width:16, height:16, borderRadius:'50%', background:'#f0fdf4', border:'1px solid #bbf7d0', display:'flex', alignItems:'center', justifyContent:'center', color:'#16a34a', flexShrink:0, marginTop:1 }}><I.Check/></span>
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Review Section ─────────────────────────────────────────────────────── */
function ReviewView({ review, marks }: { review:any; marks?:number }) {
  if (!review) return <div style={{ padding:40, textAlign:'center', color:'#9ca3af' }}>Review data unavailable</div>
  const cats = review.section_scores || {}
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ background:'white', border:'1px solid #e8ede8', borderRadius:14, padding:'20px', boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
        <h3 style={{ margin:'0 0 6px', fontWeight:700, color:'#0f1f0f', fontSize:'.95rem' }}>Overall Assessment</h3>
        <p style={{ margin:'0 0 14px', fontSize:'.88rem', color:'#374151', lineHeight:1.7 }}>{review.overall_feedback || review.strengths?.join('. ')}</p>
        {marks && <div style={{ display:'flex', alignItems:'center', gap:8 }}><I.Star/><span style={{ fontWeight:800, color:scoreColor(marks), fontFamily:'Fraunces,serif', fontSize:'1.1rem' }}>{marks}/100</span><span style={{ fontSize:'.8rem', color:'#6b7280' }}>{scoreLabel(marks).split(' — ')[0]}</span></div>}
      </div>
      {Object.keys(cats).length>0 && (
        <div style={{ background:'white', border:'1px solid #e8ede8', borderRadius:14, padding:'20px', boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
          <h3 style={{ margin:'0 0 14px', fontWeight:700, color:'#0f1f0f', fontSize:'.95rem' }}>Section Scores</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {Object.entries(cats).map(([k,v]:any) => (
              <div key={k}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:'.82rem', fontWeight:600, color:'#374151', textTransform:'capitalize' }}>{k.replace(/_/g,' ')}</span>
                  <span style={{ fontSize:'.82rem', fontWeight:700, color:scoreColor(v) }}>{v}/100</span>
                </div>
                <div style={{ height:5, background:'#f3f4f6', borderRadius:3, overflow:'hidden' }}>
                  <motion.div initial={{ width:0 }} animate={{ width:`${v}%` }} transition={{ duration:1, ease:[.22,1,.36,1] }}
                    style={{ height:'100%', background:`linear-gradient(90deg,${scoreColor(v)},${scoreColor(v)}99)`, borderRadius:3 }}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {[{label:'Strengths', key:'strengths', color:'#16a34a', bg:'#f0fdf4', border:'#bbf7d0'},
        {label:'Areas for Improvement', key:'improvement_priorities', color:'#d97706', bg:'#fffbeb', border:'#fde68a'},
      ].map(s => review[s.key]?.length>0 && (
        <div key={s.key} style={{ background:s.bg, border:`1px solid ${s.border}`, borderRadius:14, padding:'18px' }}>
          <h3 style={{ margin:'0 0 10px', fontWeight:700, color:s.color, fontSize:'.88rem' }}>{s.label}</h3>
          <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:6 }}>
            {review[s.key].map((item:string, i:number) => (
              <li key={i} style={{ display:'flex', alignItems:'flex-start', gap:8, fontSize:'.84rem', color:'#374151' }}>
                <span style={{ color:s.color, marginTop:2, flexShrink:0 }}>•</span>{item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

/* ─── Critic View — NEW ──────────────────────────────────────────────────── */
function CriticView({ critic }: { critic: { text: string; generated_at: string } | null }) {
  if (!critic || !critic.text) return (
    <div style={{ background:'white', border:'1px solid #e8ede8', borderRadius:14, padding:'48px 24px', textAlign:'center', boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
      <div style={{ fontSize:'2rem', marginBottom:12 }}>🔍</div>
      <p style={{ fontWeight:700, color:'#0f1f0f', marginBottom:6, fontSize:'.95rem' }}>No critic analysis available</p>
      <p style={{ color:'#9ca3af', fontSize:'.84rem' }}>This spec was generated before the critic agent was added. New generations include a full critic analysis.</p>
    </div>
  )

  const lines  = critic.text.split('\n')
  const blocks: { type:'section'|'verdict'|'header'|'bullet'|'gap'|'text'; content:string }[] = []
  for (const line of lines) {
    const s = line.trim()
    if (!s) continue
    if (s.startsWith('SECTION:'))                                        blocks.push({ type:'section', content:s.replace('SECTION:','').trim() })
    else if (s.startsWith('VERDICT:'))                                   blocks.push({ type:'verdict', content:s.replace('VERDICT:','').trim() })
    else if (s.startsWith('PROBLEMS:')||s.startsWith('WHAT TO FIX:'))   blocks.push({ type:'header',  content:s })
    else if (s.startsWith('OVERALL GAPS'))                               blocks.push({ type:'gap',     content:s })
    else if (s.startsWith('- '))                                         blocks.push({ type:'bullet',  content:s.slice(2) })
    else                                                                 blocks.push({ type:'text',    content:s })
  }

  const vc = (v:string) => v==='FAILING'?'#dc2626':v==='WEAK'?'#d97706':'#16a34a'

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ background:'#fef2f2', border:'1.5px solid #fecaca', borderRadius:14, padding:'18px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:'#fee2e2', display:'flex', alignItems:'center', justifyContent:'center', color:'#dc2626', flexShrink:0 }}><I.AlertTriangle/></div>
          <div>
            <p style={{ margin:0, fontWeight:800, color:'#dc2626', fontSize:'.95rem' }}>Critic Analysis</p>
            <p style={{ margin:0, fontSize:'.72rem', color:'#9ca3af' }}>Generated {critic.generated_at?.slice(0,10)||''}</p>
          </div>
        </div>
        <p style={{ margin:0, fontSize:'.82rem', color:'#7f1d1d', lineHeight:1.6 }}>
          Brutal, honest assessment of every gap in this specification. Not encouraging — a map of what still needs work before submission.
        </p>
      </div>
      <div style={{ background:'white', border:'1px solid #e8ede8', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
        <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:8 }}>
          {blocks.map((b, i) => {
            if (b.type==='section') return (
              <div key={i} style={{ marginTop:i>0?16:0, paddingBottom:8, borderBottom:'2px solid #fee2e2' }}>
                <p style={{ margin:0, fontWeight:800, color:'#dc2626', fontSize:'.95rem', fontFamily:'Fraunces,serif' }}>{b.content}</p>
              </div>
            )
            if (b.type==='verdict') return (
              <div key={i} style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                <span style={{ fontWeight:700, color:'#374151', fontSize:'.8rem' }}>Verdict:</span>
                <span style={{ padding:'2px 10px', borderRadius:999, background:`${vc(b.content)}15`, border:`1px solid ${vc(b.content)}30`, fontSize:'.78rem', fontWeight:800, color:vc(b.content) }}>{b.content}</span>
              </div>
            )
            if (b.type==='header') return <p key={i} style={{ margin:'8px 0 2px', fontWeight:700, color:'#0f1f0f', fontSize:'.84rem' }}>{b.content}</p>
            if (b.type==='gap') return (
              <div key={i} style={{ marginTop:20, paddingTop:12, borderTop:'2px solid #7c3aed20' }}>
                <p style={{ margin:0, fontWeight:800, color:'#7c3aed', fontSize:'.95rem' }}>{b.content}</p>
              </div>
            )
            if (b.type==='bullet') return (
              <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8, paddingLeft:8 }}>
                <span style={{ color:'#dc2626', flexShrink:0, marginTop:3, fontSize:'.7rem' }}>▸</span>
                <p style={{ margin:0, fontSize:'.84rem', color:'#374151', lineHeight:1.65 }}>{b.content}</p>
              </div>
            )
            return <p key={i} style={{ margin:0, fontSize:'.84rem', color:'#6b7280', lineHeight:1.65 }}>{b.content}</p>
          })}
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════════════════════ */
export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const projectId = parseInt(params.id as string)

  // CHANGED: 'sources' → 'critic'
  const [activeTab, setActiveTab] = useState<'specification'|'review'|'critic'>('specification')
  const [downloading, setDownloading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const { data:project, isLoading:projectLoading } = useProject(projectId)
  const { data:statusData } = useProjectStatus(projectId, isActive(project?.status))
  const { data:result, isLoading:resultLoading } = useProjectResult(projectId, project?.status)
  const { mutateAsync:deleteProject } = useDeleteProject()

  const liveProgress = statusData?.progress_percentage ?? project?.progress_percentage ?? 0
  const livePhase    = statusData?.current_phase ?? project?.current_phase ?? project?.status ?? ''
  const isGenerating = isActive(project?.status)
  const isComplete   = project?.status === 'complete'
  const isFailed     = project?.status === 'failed'

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey:['project', projectId] })
    queryClient.invalidateQueries({ queryKey:['project-status', projectId] })
    queryClient.invalidateQueries({ queryKey:['project-result', projectId] })
  }

  // Two-tap inline confirm — first tap arms it (auto-disarms after 4s), second tap deletes.
  const handleDelete = async () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      setTimeout(() => setConfirmingDelete(false), 4000)
      return
    }
    setIsDeleting(true)
    try { await deleteProject(projectId); router.push('/dashboard/projects') }
    catch { setIsDeleting(false); setConfirmingDelete(false) }
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const token = localStorage.getItem('access_token')
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const res = await fetch(`${apiBase}/projects/${projectId}/download`, { headers:{ Authorization:`Bearer ${token}` } })
      if (!res.ok) { alert('Download failed'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${(project?.research_topic||'specification').slice(0,60)}.docx`
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch { alert('Download failed.') } finally { setDownloading(false) }
  }

  /* ── Loading ── */
  if (projectLoading) return (
    <div style={{ maxWidth:900, margin:'0 auto' }}>
      <div className="g-sk" style={{ height:56, borderRadius:14, marginBottom:20 }}/>
      <div className="g-sk" style={{ height:140, borderRadius:14, marginBottom:16 }}/>
      <div className="g-sk" style={{ height:400, borderRadius:14 }}/>
    </div>
  )
  if (!project) return (
    <div style={{ maxWidth:900, margin:'0 auto', textAlign:'center', padding:'80px 20px' }}>
      <p style={{ fontWeight:700, color:'#0f1f0f', fontSize:'1.1rem', marginBottom:8 }}>Project not found</p>
      <button className="g-btn" onClick={()=>router.push('/dashboard/projects')}>Back to Projects</button>
    </div>
  )

  const spec = result?.specification
  const sections = spec ? [
    { label:'Abstract',                    data:spec.abstract },
    { label:'Justification & Overall Aim', data:spec.justification_and_aim },
    { label:'Objectives',                  data:spec.objectives },
    { label:'Review of Literature',        data:spec.literature_review },
    { label:'Methodology',                 data:spec.methodology },
    { label:'Work Plan',                   data:spec.work_plan },
  ] : []

  return (
    <div style={{ maxWidth:1060 }}>
      <style>{`
        @keyframes g-spin{to{transform:rotate(360deg)}} .spin{animation:g-spin 1s linear infinite}
        .pd-rail { position: sticky; top: 70px; }
        @media (max-width: 860px) {
          .pd-grid { grid-template-columns: 1fr !important; }
          .pd-rail { position: static; order: -1; }
        }
      `}</style>

      {/* ── Top bar ── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:22, flexWrap:'wrap', gap:14 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <button onClick={()=>router.push('/dashboard/projects')}
            style={{ display:'inline-flex', alignItems:'center', gap:6, background:'none', border:'none', color:'#6b7280', cursor:'pointer', fontSize:'.8rem', fontWeight:600, padding:'0 0 12px', transition:'color .15s' }}
            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color='#16a34a'}
            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color='#6b7280'}>
            <I.Back/> Back to Projects
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:6 }}>
            <Pill status={project.status}/>
            <span style={{ fontSize:'.78rem', color:'#9ca3af' }}>ID #{project.id}</span>
            {project.academic_level && <span style={{ fontSize:'.76rem', fontWeight:700, color:'#7c3aed', background:'#faf5ff', padding:'3px 8px', borderRadius:6 }}>{project.academic_level}</span>}
          </div>
          <h1 style={{ margin:'0 0 4px', fontSize:'clamp(1.2rem,2vw,1.6rem)', fontWeight:800, color:'#0f1f0f', fontFamily:'Fraunces,serif', lineHeight:1.2 }}>
            {project.research_topic || project.field_of_study}
          </h1>
          <p style={{ margin:0, fontSize:'.86rem', color:'#6b7280' }}>{project.field_of_study} · {project.effort_level} effort</p>
        </div>

        {/* Actions */}
        <div style={{ display:'flex', gap:8, flexShrink:0, alignItems:'center' }}>
          <button className="g-btn-outline" onClick={handleRefresh} style={{ padding:'8px 14px', fontSize:'.8rem' }}>
            <I.Refresh/> Refresh
          </button>
          {isComplete && (
            <button className="g-btn" onClick={handleDownload} disabled={downloading} style={{ fontSize:'.82rem' }}>
              {downloading ? <><span className="spin" style={{ display:'inline-block' }}><I.Spin/></span> Downloading…</> : <><I.Download/> Download DOCX</>}
            </button>
          )}
          <button onClick={handleDelete} disabled={isDeleting}
            style={{ height:36, minWidth:36, padding: confirmingDelete?'0 12px':'0', display:'flex', alignItems:'center', justifyContent:'center', gap:6, borderRadius:9, border:'1.5px solid #fecaca', background: confirmingDelete?'#dc2626':'#fef2f2', color: confirmingDelete?'white':'#dc2626', cursor:'pointer', transition:'all .15s', flexShrink:0, fontSize:'.76rem', fontWeight:700 }}
            onMouseEnter={e=>{ if(!confirmingDelete)(e.currentTarget as HTMLElement).style.background='#fee2e2' }}
            onMouseLeave={e=>{ if(!confirmingDelete)(e.currentTarget as HTMLElement).style.background='#fef2f2' }}>
            <I.Trash/>{confirmingDelete && 'Really delete?'}
          </button>
        </div>
      </div>

      {/* ── Progress tracker ── */}
      {isGenerating && <ProgressTracker progress={liveProgress} phase={livePhase} status={project.status}/>}

      {/* ── Failed state ── */}
      {isFailed && (
        <div style={{ background:'#fef2f2', border:'1.5px solid #fecaca', borderRadius:14, padding:'20px', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'#fee2e2', display:'flex', alignItems:'center', justifyContent:'center', color:'#dc2626' }}><I.X/></div>
            <div>
              <p style={{ margin:'0 0 3px', fontWeight:700, color:'#dc2626', fontSize:'.95rem' }}>Generation Failed</p>
              <p style={{ margin:0, fontSize:'.82rem', color:'#6b7280' }}>
                {project.current_phase?.startsWith('Error:') ? project.current_phase.replace('Error: ','') : 'Something went wrong. Try generating a new spec or contact support.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Complete: 2-col layout ── */}
      {isComplete && (
        <div className="pd-grid" style={{ display:'grid', gridTemplateColumns:'1fr 260px', gap:18, alignItems:'start' }}>

          {/* Left: spec/review/critic */}
          <div>
            {/* Tab bar — CHANGED: Sources → Critic */}
            <div style={{ display:'flex', gap:4, marginBottom:18, background:'white', border:'1px solid #e8ede8', borderRadius:11, padding:5, boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
              {([
                { key:'specification', label:'Specification', icon:<I.File/>          },
                { key:'review',        label:'AI Review',     icon:<I.Star/>          },
                { key:'critic',        label:'Critic',        icon:<I.AlertTriangle/> },
              ] as const).map(t => (
                <button key={t.key} onClick={()=>setActiveTab(t.key)} className={`g-tab ${activeTab===t.key?'active':''}`} style={{ flex:1, justifyContent:'center' }}>
                  {t.icon}{t.label}
                </button>
              ))}
            </div>

            {resultLoading ? (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {[0,1,2].map(i=><div key={i} className="g-sk" style={{ height:120, borderRadius:14 }}/>)}
              </div>
            ) : result ? (
              <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:.2 }}>
                  {activeTab==='specification' && spec ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                      <div style={{ background:'white', border:'1px solid #e8ede8', borderRadius:14, padding:'18px 20px', boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
                        <h2 style={{ margin:'0 0 8px', fontSize:'1.15rem', fontWeight:800, color:'#0f1f0f', fontFamily:'Fraunces,serif' }}>{spec.project_title}</h2>
                        <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                          <span style={{ fontSize:'.76rem', color:'#6b7280', background:'#f3f4f6', padding:'2px 8px', borderRadius:6 }}>📝 {spec.total_word_count?.toLocaleString()} words</span>
                          <span style={{ fontSize:'.76rem', color:'#6b7280', background:'#f3f4f6', padding:'2px 8px', borderRadius:6 }}>📚 {spec.references?.length} references</span>
                        </div>
                      </div>
                      {sections.map(s => <SpecSection key={s.label} label={s.label} data={s.data}/>)}
                      {spec.references?.length>0 && (
                        <div style={{ background:'white', border:'1px solid #e8ede8', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
                          <div className="g-section-head">
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              <div style={{ width:28, height:28, borderRadius:8, background:'#eff6ff', border:'1px solid #bfdbfe', display:'flex', alignItems:'center', justifyContent:'center', color:'#2563eb' }}><I.Book/></div>
                              <span style={{ fontWeight:700, color:'#0f1f0f', fontSize:'.9rem' }}>References</span>
                            </div>
                            <span style={{ fontSize:'.76rem', color:'#9ca3af' }}>{spec.references.length} sources</span>
                          </div>
                          <ol style={{ margin:0, padding:'14px 20px 14px 36px', display:'flex', flexDirection:'column', gap:6 }}>
                            {spec.references.map((ref:string, i:number) => (
                              <li key={i} style={{ fontSize:'.82rem', color:'#374151', lineHeight:1.6 }}>{ref}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>
                  ) : activeTab==='review' ? (
                    <ReviewView review={result.review} marks={result.total_marks}/>
                  ) : (
                    // CHANGED: was <SourcesView resources={result.discovered_resources}/>
                    <CriticView critic={result.critic || null}/>
                  )}
                </motion.div>
              </AnimatePresence>
            ) : (
              <div style={{ background:'white', border:'1px solid #e8ede8', borderRadius:14, padding:'48px', textAlign:'center' }}>
                <p style={{ color:'#9ca3af' }}>No result data available</p>
              </div>
            )}
          </div>

          {/* Right: score + metadata */}
          <div className="pd-rail" style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {result?.total_marks!=null && <ScoreCard marks={result.total_marks} decision={result.decision}/>}

            <div style={{ background:'white', border:'1px solid #e8ede8', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
              <div style={{ padding:'13px 16px', borderBottom:'1px solid #f0f4f0' }}>
                <span style={{ fontWeight:700, color:'#0f1f0f', fontSize:'.84rem' }}>Project Info</span>
              </div>
              {[
                { label:'Field',     value:project.field_of_study },
                { label:'Level',     value:project.academic_level },
                { label:'Effort',    value:project.effort_level },
                { label:'Created',   value:new Date(project.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) },
                { label:'Completed', value:project.completed_at ? new Date(project.completed_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : '—' },
              ].map((row, i, arr) => (
                <div key={row.label} style={{ padding:'9px 14px', display:'flex', justifyContent:'space-between', borderBottom:i<arr.length-1?'1px solid #f9fafb':'none' }}>
                  <span style={{ fontSize:'.76rem', color:'#9ca3af', fontWeight:600 }}>{row.label}</span>
                  <span style={{ fontSize:'.78rem', color:'#0f1f0f', fontWeight:600, textAlign:'right', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.value}</span>
                </div>
              ))}
            </div>

            {isComplete && (
              <button className="g-btn" onClick={handleDownload} disabled={downloading} style={{ width:'100%', justifyContent:'center', fontSize:'.86rem', padding:'11px' }}>
                {downloading ? 'Downloading…' : <><I.Download/> Download as DOCX</>}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Queued state ── */}
      {project.status==='queued' && !isGenerating && (
        <div style={{ background:'#f9fafb', border:'1px solid #e8ede8', borderRadius:14, padding:'52px', textAlign:'center' }}>
          <div style={{ width:52, height:52, borderRadius:14, background:'#f0fdf4', border:'1px solid #bbf7d0', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', color:'#16a34a' }}><I.Info/></div>
          <p style={{ fontWeight:700, color:'#0f1f0f', marginBottom:6 }}>Queued for generation</p>
          <p style={{ fontSize:'.86rem', color:'#6b7280', marginBottom:18 }}>Your spec is in the queue. It will begin generating shortly.</p>
          <button className="g-btn-outline" onClick={handleRefresh}><I.Refresh/> Refresh status</button>
        </div>
      )}
    </div>
  )
}