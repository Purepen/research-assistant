'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useProjects } from '@/hooks/useProjects'
import Link from 'next/link'

const fu = (d = 0) => ({ initial:{opacity:0,y:12}, animate:{opacity:1,y:0}, transition:{duration:.42,delay:d,ease:[.22,1,.36,1]} })

const I = {
  Plus:   ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Arrow:  ()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
  File:   ()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  Search: ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Clock:  ()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  X:      ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
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
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:999, background:s.bg, border:`1px solid ${s.border}`, fontSize:'.71rem', fontWeight:700, color:s.color, whiteSpace:'nowrap' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:s.color, flexShrink:0, animation:s.pulse?'g-pulse 1.4s infinite':'none' }}/>
      {s.label}
    </span>
  )
}

const LEVEL_COLORS: Record<string,string> = { BSc:'#7c3aed', MSc:'#16a34a', PhD:'#2563eb' }
const LEVEL_BGS:    Record<string,string> = { BSc:'#faf5ff',  MSc:'#f0fdf4', PhD:'#eff6ff' }

function scoreColor(n:number) { return n>=75?'#16a34a':n>=55?'#d97706':'#dc2626' }
function scoreLabel(n:number) { return n>=75?'Excellent':n>=55?'Good':'Fair' }

function ago(s:string) {
  const d=Date.now()-new Date(s).getTime(), m=Math.floor(d/60000)
  if(m<1) return 'just now'; if(m<60) return `${m}m ago`
  const h=Math.floor(m/60); if(h<24) return `${h}h ago`
  const days=Math.floor(h/24)
  if(days<30) return `${days}d ago`
  return new Date(s).toLocaleDateString('en-GB',{day:'numeric',month:'short'})
}

type Filter = 'all'|'complete'|'generating'|'queued'|'failed'
const FILTERS: Filter[] = ['all','complete','generating','queued','failed']

export default function ProjectsPage() {
  const router = useRouter()
  const { data:projects, isLoading } = useProjects({ limit:50 })
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = (projects||[]).filter((p:any) => {
    const matchFilter = filter==='all' || p.status===filter
    const q = search.toLowerCase()
    const matchSearch = !q || (p.research_topic||'').toLowerCase().includes(q) || (p.field_of_study||'').toLowerCase().includes(q)
    return matchFilter && matchSearch
  })

  const counts = FILTERS.reduce((a,f) => {
    a[f] = f==='all' ? (projects||[]).length : (projects||[]).filter((p:any)=>p.status===f).length
    return a
  }, {} as Record<string,number>)

  return (
    <div style={{ maxWidth:1140 }}>
      <style>{`
        .pc:hover { border-color:rgba(22,163,74,.3)!important; box-shadow:0 8px 24px rgba(0,0,0,.08)!important; transform:translateY(-2px); }
        .ft:hover { background:#f0fdf4!important; color:#16a34a!important; }
        .ft.on { background:#16a34a!important; color:white!important; box-shadow:0 2px 8px rgba(22,163,74,.25)!important; }
        .src:focus { border-color:#16a34a!important; box-shadow:0 0 0 3px rgba(22,163,74,.1)!important; }
      `}</style>

      {/* Header */}
      <motion.div {...fu(0)} style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:14 }}>
        <div>
          <h1 style={{ margin:'0 0 4px', fontSize:'clamp(1.5rem,2.5vw,2rem)', fontWeight:800, color:'#0f1f0f', fontFamily:'Fraunces,serif' }}>
            My Specifications
          </h1>
          <p style={{ margin:0, fontSize:'.88rem', color:'#6b7280' }}>
            {isLoading ? 'Loading…' : `${(projects||[]).length} total specification${(projects||[]).length!==1?'s':''}`}
          </p>
        </div>
        <Link href="/dashboard/generate" style={{ textDecoration:'none' }}>
          <button className="g-btn"><I.Plus/> New Specification</button>
        </Link>
      </motion.div>

      {/* Search + filters */}
      <motion.div {...fu(.07)} style={{ display:'flex', gap:10, marginBottom:22, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ position:'relative', flex:1, minWidth:200, maxWidth:340 }}>
          <div style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#9ca3af', pointerEvents:'none', display:'flex' }}><I.Search/></div>
          <input className="src" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by topic or field…"
            style={{ width:'100%', background:'white', border:'1.5px solid #e8ede8', borderRadius:9, padding:'9px 12px 9px 36px', color:'#0f1f0f', fontSize:'.86rem', outline:'none', transition:'all .2s' }}/>
          {search && <button onClick={()=>setSearch('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#9ca3af', cursor:'pointer', display:'flex', padding:2 }}><I.X/></button>}
        </div>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
          {FILTERS.map(f => (
            <button key={f} onClick={()=>setFilter(f)}
              className={`ft ${filter===f?'on':''}`}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:8, border:'1.5px solid #e8ede8', background:'white', color:'#6b7280', fontSize:'.78rem', fontWeight:600, cursor:'pointer', transition:'all .15s' }}>
              <span style={{ textTransform:'capitalize' }}>{f}</span>
              {counts[f]>0 && <span style={{ background:filter===f?'rgba(255,255,255,.25)':'#f0fdf4', color:filter===f?'white':'#16a34a', borderRadius:999, padding:'1px 6px', fontSize:'.68rem', fontWeight:700, minWidth:18, textAlign:'center' }}>{counts[f]}</span>}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Grid */}
      {isLoading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
          {[0,1,2,3,4,5].map(i => <div key={i} className="g-sk" style={{ height:160, borderRadius:14 }}/>)}
        </div>
      ) : filtered.length===0 ? (
        <motion.div {...fu(.12)} className="g-card" style={{ padding:'64px 24px', textAlign:'center' }}>
          <div style={{ width:52, height:52, borderRadius:14, background:'#f0fdf4', border:'1px solid #bbf7d0', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', color:'#16a34a' }}><I.File/></div>
          <p style={{ fontWeight:700, color:'#0f1f0f', fontSize:'1.05rem', marginBottom:6 }}>
            {search||filter!=='all' ? 'No matching specifications' : 'No specifications yet'}
          </p>
          <p style={{ fontSize:'.86rem', color:'#9ca3af', marginBottom:20 }}>
            {search ? `No results for "${search}"` : filter!=='all' ? `No ${filter} specs` : 'Generate your first AI-powered research spec.'}
          </p>
          {!search && filter==='all' && (
            <Link href="/dashboard/generate" style={{ textDecoration:'none' }}>
              <button className="g-btn" style={{ fontSize:'.85rem' }}><I.Plus/> Generate First Spec</button>
            </Link>
          )}
        </motion.div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
          {filtered.map((p:any, i:number) => (
            <motion.div key={p.id} {...fu(.08+i*.03)}
              className="pc" onClick={()=>router.push(`/dashboard/projects/${p.id}`)}
              style={{ background:'white', border:'1.5px solid #e8ede8', borderRadius:14, padding:'18px', display:'flex', flexDirection:'column', gap:13, cursor:'pointer', boxShadow:'0 1px 3px rgba(0,0,0,.05)', transition:'all .2s' }}>

              {/* Status + level */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                <Pill status={p.status}/>
                <span style={{ fontSize:'.72rem', fontWeight:700, color:LEVEL_COLORS[p.academic_level]||'#6b7280', background:LEVEL_BGS[p.academic_level]||'#f9fafb', padding:'3px 9px', borderRadius:6 }}>
                  {p.academic_level}
                </span>
              </div>

              {/* Title */}
              <div>
                <p style={{ margin:'0 0 3px', fontWeight:700, color:'#0f1f0f', fontSize:'.95rem', lineHeight:1.35, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                  {p.research_topic || p.field_of_study}
                </p>
                <p style={{ margin:0, fontSize:'.76rem', color:'#6b7280' }}>{p.field_of_study}</p>
              </div>

              {/* Score / progress / failed */}
              {p.status==='complete' && p.total_marks!=null ? (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:`${scoreColor(p.total_marks)}08`, border:`1px solid ${scoreColor(p.total_marks)}18`, borderRadius:10, padding:'10px 14px' }}>
                  <div>
                    <p style={{ margin:'0 0 1px', fontSize:'.68rem', color:'#9ca3af', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em' }}>AI SCORE</p>
                    <p style={{ margin:0, fontSize:'.78rem', color:'#374151', fontWeight:600 }}>{scoreLabel(p.total_marks)}</p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <span style={{ fontSize:'1.5rem', fontWeight:800, color:scoreColor(p.total_marks), fontFamily:'Fraunces,serif', lineHeight:1 }}>{p.total_marks}</span>
                    <span style={{ fontSize:'.72rem', color:'#9ca3af' }}>/100</span>
                  </div>
                </div>
              ) : ['generating','reviewing'].includes(p.status) ? (
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <span style={{ fontSize:'.72rem', color:'#6b7280', fontWeight:600 }}>{p.current_phase||'Processing…'}</span>
                    <span style={{ fontSize:'.72rem', color:'#2563eb', fontWeight:700 }}>{p.progress_percentage??0}%</span>
                  </div>
                  <div style={{ height:5, background:'#dbeafe', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${p.progress_percentage??0}%`, background:'linear-gradient(90deg,#2563eb,#60a5fa)', borderRadius:3, transition:'width .5s ease' }}/>
                  </div>
                </div>
              ) : p.status==='failed' ? (
                <div style={{ display:'flex', alignItems:'center', gap:8, background:'#fef2f2', border:'1px solid #fecaca', borderRadius:9, padding:'9px 12px' }}>
                  <I.X/><span style={{ fontSize:'.78rem', color:'#dc2626', fontWeight:600 }}>Generation failed</span>
                </div>
              ) : null}

              {/* Footer */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:4, borderTop:'1px solid #f3f4f6' }}>
                <div style={{ display:'flex', alignItems:'center', gap:5, color:'#9ca3af' }}>
                  <I.Clock/><span style={{ fontSize:'.72rem' }}>{ago(p.created_at)}</span>
                </div>
                <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:'.74rem', fontWeight:700, color:'#16a34a' }}>View <I.Arrow/></span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {!isLoading && filtered.length>0 && (
        <motion.p {...fu(.28)} style={{ textAlign:'center', marginTop:24, fontSize:'.78rem', color:'#9ca3af' }}>
          Showing {filtered.length} of {(projects||[]).length} specification{(projects||[]).length!==1?'s':''}
        </motion.p>
      )}
    </div>
  )
}
