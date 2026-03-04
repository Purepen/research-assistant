'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { useProjects } from '@/hooks/useProjects'
import { useTopicHistory, useDeleteTopicSession, topicRelativeTime, topicOriginLabel, topicOriginColor } from '@/hooks/useTopics'
import Link from 'next/link'
import { Suspense } from 'react'

const fu = (d=0) => ({ initial:{opacity:0,y:12}, animate:{opacity:1,y:0}, transition:{duration:.42,delay:d,ease:[.22,1,.36,1]} })

const I = {
  Plus:    ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Arrow:   ()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
  File:    ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  Flask:   ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 3h6m-6 0v6l-4 9a1 1 0 0 0 .9 1.5h12.2a1 1 0 0 0 .9-1.5L15 9V3M9 3H6m3 0h6"/></svg>,
  Search:  ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  X:       ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Trash:   ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Zap:     ()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Check:   ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Spin:    ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>,
}

const ACTIVE = new Set(['queued','generating','reviewing'])
const LEVEL_COLORS: Record<string,string> = { BSc:'#7c3aed', MSc:'#16a34a', PhD:'#2563eb' }
const LEVEL_BGS:    Record<string,string> = { BSc:'#faf5ff',  MSc:'#f0fdf4', PhD:'#eff6ff' }

function StatusBadge({ s }:{ s:string }) {
  const map: Record<string,[string,string,string]> = {
    complete:   ['#16a34a','#f0fdf4','Complete'],
    generating: ['#2563eb','#eff6ff','Generating'],
    reviewing:  ['#7c3aed','#faf5ff','Reviewing'],
    queued:     ['#d97706','#fffbeb','Queued'],
    failed:     ['#dc2626','#fef2f2','Failed'],
    draft:      ['#9ca3af','#f9fafb','Draft'],
  }
  const [color,bg,label] = map[s]||['#9ca3af','#f9fafb',s]
  return (
    <span style={{ fontSize:'.7rem',fontWeight:700,color,background:bg,padding:'3px 9px',borderRadius:999,display:'inline-flex',alignItems:'center',gap:4,border:`1px solid ${color}28` }}>
      {ACTIVE.has(s)&&<span style={{ width:6,height:6,borderRadius:'50%',background:color,animation:'g-pulse 1.4s infinite',display:'inline-block' }}/>}
      {label}
    </span>
  )
}

function scoreColor(n:number) { return n>=75?'#16a34a':n>=55?'#d97706':'#dc2626' }

function ago(s:string) {
  const d=Date.now()-new Date(s).getTime(), m=Math.floor(d/60000)
  if(m<1) return 'just now'; if(m<60) return `${m}m ago`
  const h=Math.floor(m/60); if(h<24) return `${h}h ago`
  const days=Math.floor(h/24)
  if(days<30) return `${days}d ago`
  return new Date(s).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})
}

type SpecFilter = 'all'|'complete'|'generating'|'queued'|'failed'
const SPEC_FILTERS: SpecFilter[] = ['all','complete','generating','queued','failed']

/* ══════════════════════════════════════════════════════════════════════════
   Specifications Tab
══════════════════════════════════════════════════════════════════════════ */
function SpecificationsTab() {
  const router = useRouter()
  const { data:projects, isLoading } = useProjects({ limit:50 })
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<SpecFilter>('all')

  const filtered = useMemo(()=>(projects||[]).filter((p:any) => {
    const matchFilter = filter==='all' || p.status===filter
    const q = search.toLowerCase()
    const matchSearch = !q || (p.research_topic||'').toLowerCase().includes(q) || (p.field_of_study||'').toLowerCase().includes(q)
    return matchFilter && matchSearch
  }),[projects, search, filter])

  const counts = useMemo(()=>SPEC_FILTERS.reduce((a,f) => {
    a[f] = f==='all' ? (projects||[]).length : (projects||[]).filter((p:any)=>p.status===f).length
    return a
  }, {} as Record<string,number>),[projects])

  return (
    <>
      {/* Search + filters */}
      <motion.div {...fu(.07)} style={{ display:'flex',gap:10,marginBottom:22,flexWrap:'wrap',alignItems:'center' }}>
        <div style={{ position:'relative',flex:1,minWidth:200,maxWidth:340 }}>
          <div style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#9ca3af',pointerEvents:'none',display:'flex' }}><I.Search/></div>
          <input className="src" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by topic or field…"
            style={{ width:'100%',background:'white',border:'1.5px solid #e8ede8',borderRadius:9,padding:'9px 12px 9px 36px',color:'#0f1f0f',fontSize:'.86rem',outline:'none',transition:'all .2s' }}/>
          {search&&<button onClick={()=>setSearch('')} style={{ position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'#9ca3af',cursor:'pointer',display:'flex',padding:2 }}><I.X/></button>}
        </div>
        <div style={{ display:'flex',gap:5,flexWrap:'wrap' }}>
          {SPEC_FILTERS.map(f=>(
            <button key={f} onClick={()=>setFilter(f)} className={`ft ${filter===f?'on':''}`}
              style={{ display:'flex',alignItems:'center',gap:5,padding:'7px 12px',borderRadius:8,border:'1.5px solid #e8ede8',background:'white',color:'#6b7280',fontSize:'.78rem',fontWeight:600,cursor:'pointer',transition:'all .15s' }}>
              <span style={{ textTransform:'capitalize' }}>{f}</span>
              {counts[f]>0&&<span style={{ background:filter===f?'rgba(255,255,255,.25)':'#f0fdf4',color:filter===f?'white':'#16a34a',borderRadius:999,padding:'1px 6px',fontSize:'.68rem',fontWeight:700,minWidth:18,textAlign:'center' }}>{counts[f]}</span>}
            </button>
          ))}
        </div>
      </motion.div>

      {isLoading ? (
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14 }}>
          {[0,1,2,3,4,5].map(i=><div key={i} className="g-sk" style={{ height:160,borderRadius:14 }}/>)}
        </div>
      ) : filtered.length===0 ? (
        <motion.div {...fu(.12)} className="g-card" style={{ padding:'64px 24px',textAlign:'center' }}>
          <div style={{ width:52,height:52,borderRadius:14,background:'#f0fdf4',border:'1px solid #bbf7d0',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',color:'#16a34a' }}><I.File/></div>
          <p style={{ fontWeight:700,color:'#0f1f0f',fontSize:'1.05rem',marginBottom:6 }}>
            {search||filter!=='all' ? 'No matching specifications' : 'No specifications yet'}
          </p>
          <p style={{ fontSize:'.86rem',color:'#9ca3af',marginBottom:18 }}>
            {search||filter!=='all' ? 'Try adjusting your search or filter.' : 'Generate your first AI-powered research specification to get started.'}
          </p>
          {!search&&filter==='all'&&(
            <Link href="/dashboard/generate" style={{ textDecoration:'none' }}>
              <button className="g-btn"><I.Plus/> Generate Specification</button>
            </Link>
          )}
        </motion.div>
      ) : (
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14 }}>
          {filtered.map((p:any,i:number)=>(
            <motion.div key={p.id} {...fu(.1+i*.03)} className="g-card pc" onClick={()=>router.push(`/dashboard/projects/${p.id}`)}
              style={{ padding:'18px',cursor:'pointer',transition:'all .2s',border:'1.5px solid #e8ede8',borderRadius:14 }}>
              <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:10,marginBottom:12 }}>
                <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                  <span style={{ fontSize:'.72rem',fontWeight:700,color:LEVEL_COLORS[p.academic_level]||'#9ca3af',background:LEVEL_BGS[p.academic_level]||'#f9fafb',padding:'2px 8px',borderRadius:999 }}>{p.academic_level}</span>
                  <StatusBadge s={p.status}/>
                </div>
                {p.total_marks!=null&&<span style={{ fontSize:'1.15rem',fontWeight:800,color:scoreColor(p.total_marks),fontFamily:'Fraunces,serif',lineHeight:1,flexShrink:0 }}>{p.total_marks}</span>}
              </div>
              <h3 style={{ margin:'0 0 4px',fontSize:'.9rem',fontWeight:700,color:'#0f1f0f',lineHeight:1.35,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden' }}>
                {p.research_topic||p.field_of_study||'Untitled Specification'}
              </h3>
              <p style={{ margin:'0 0 14px',fontSize:'.76rem',color:'#9ca3af',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{p.field_of_study}</p>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                <span style={{ fontSize:'.72rem',color:'#9ca3af' }}>{ago(p.created_at)}</span>
                {ACTIVE.has(p.status)&&(
                  <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                    <div style={{ height:4,width:80,background:'#e5e7eb',borderRadius:999,overflow:'hidden' }}>
                      <div style={{ height:'100%',width:`${p.progress_percentage||0}%`,background:'#16a34a',borderRadius:999,transition:'width .5s' }}/>
                    </div>
                    <span style={{ fontSize:'.7rem',fontWeight:700,color:'#16a34a' }}>{p.progress_percentage||0}%</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Topic History Tab
══════════════════════════════════════════════════════════════════════════ */
function TopicHistoryTab() {
  const router = useRouter()
  const { data, isLoading } = useTopicHistory({ limit:50 })
  const { mutateAsync:deleteSession, isPending:deleting } = useDeleteTopicSession()
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState<number|null>(null)

  const filtered = useMemo(()=>{
    const topics = data?.topics || []
    const q = search.toLowerCase()
    return !q ? topics : topics.filter(t =>
      t.final_topic.toLowerCase().includes(q) || t.field.toLowerCase().includes(q)
    )
  },[data, search])

  const handleDelete = async(id: number) => {
    if (!confirm('Remove this topic from your history?')) return
    setDeletingId(id)
    try { await deleteSession(id) } finally { setDeletingId(null) }
  }

  const handleUse = (topic: typeof filtered[0]) => {
    const params = new URLSearchParams({
      topic: topic.final_topic,
      field: topic.field,
      level: topic.degree_level,
      from_topics: 'true',
      ...(topic.id ? { topic_session_id: String(topic.id) } : {}),
    })
    router.push(`/dashboard/generate?${params.toString()}`)
  }

  return (
    <>
      {/* Search */}
      <motion.div {...fu(.07)} style={{ marginBottom:22 }}>
        <div style={{ position:'relative',maxWidth:380 }}>
          <div style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#9ca3af',pointerEvents:'none',display:'flex' }}><I.Search/></div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search topics or fields…"
            style={{ width:'100%',background:'white',border:'1.5px solid #e8ede8',borderRadius:9,padding:'9px 12px 9px 36px',color:'#0f1f0f',fontSize:'.86rem',outline:'none',transition:'all .2s',boxSizing:'border-box' }}
            onFocus={e=>{(e.target as HTMLElement).style.borderColor='#7c3aed';(e.target as HTMLElement).style.boxShadow='0 0 0 3px rgba(124,58,237,.1)'}}
            onBlur={e=>{(e.target as HTMLElement).style.borderColor='#e8ede8';(e.target as HTMLElement).style.boxShadow='none'}}/>
          {search&&<button onClick={()=>setSearch('')} style={{ position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'#9ca3af',cursor:'pointer',display:'flex',padding:2 }}><I.X/></button>}
        </div>
      </motion.div>

      {isLoading ? (
        <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
          {[0,1,2,3].map(i=><div key={i} className="g-sk" style={{ height:88,borderRadius:14 }}/>)}
        </div>
      ) : filtered.length===0 ? (
        <motion.div {...fu(.1)} style={{ padding:'64px 24px',textAlign:'center',background:'white',border:'1.5px solid #e8ede8',borderRadius:16 }}>
          <div style={{ width:52,height:52,borderRadius:14,background:'#faf5ff',border:'1px solid #e9d5ff',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',color:'#7c3aed' }}><I.Flask/></div>
          <p style={{ fontWeight:700,color:'#0f1f0f',fontSize:'1.05rem',marginBottom:6 }}>
            {search ? 'No matching topics' : 'No topics explored yet'}
          </p>
          <p style={{ fontSize:'.86rem',color:'#9ca3af',marginBottom:18 }}>
            {search ? 'Try a different search term.' : 'Use Topic Lab to find, vet, or refine a research topic. Every completed topic is saved here automatically.'}
          </p>
          {!search && (
            <Link href="/dashboard/topics" style={{ textDecoration:'none' }}>
              <button className="g-btn" style={{ background:'#7c3aed',boxShadow:'0 4px 14px rgba(124,58,237,.3)' }}>
                <I.Flask/> Open Topic Lab
              </button>
            </Link>
          )}
        </motion.div>
      ) : (
        <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
          {filtered.map((t,i)=>(
            <motion.div key={t.id} {...fu(.08+i*.03)}
              style={{ background:'white',border:'1.5px solid #e8ede8',borderRadius:14,padding:'16px 20px',transition:'all .2s' }}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor='rgba(124,58,237,.3)';(e.currentTarget as HTMLElement).style.boxShadow='0 4px 16px rgba(0,0,0,.06)'}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor='#e8ede8';(e.currentTarget as HTMLElement).style.boxShadow='none'}}>
              <div style={{ display:'flex',alignItems:'flex-start',gap:14 }}>

                {/* Icon */}
                <div style={{ width:40,height:40,borderRadius:11,background:'#faf5ff',border:'1.5px solid #e9d5ff',display:'flex',alignItems:'center',justifyContent:'center',color:'#7c3aed',flexShrink:0,marginTop:1 }}><I.Flask/></div>

                {/* Content */}
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:10,marginBottom:4 }}>
                    <h3 style={{ margin:0,fontSize:'.9rem',fontWeight:700,color:'#0f1f0f',lineHeight:1.35,flex:1 }}>{t.final_topic}</h3>
                    <div style={{ display:'flex',alignItems:'center',gap:6,flexShrink:0 }}>
                      {/* Origin badge */}
                      <span style={{ fontSize:'.68rem',fontWeight:700,color:topicOriginColor(t.origin),background:`${topicOriginColor(t.origin)}14`,padding:'3px 9px',borderRadius:999,border:`1px solid ${topicOriginColor(t.origin)}28`,whiteSpace:'nowrap' }}>
                        {topicOriginLabel(t.origin)}
                      </span>
                      {/* Spec link badge */}
                      {t.linked_project_id ? (
                        <button onClick={()=>router.push(`/dashboard/projects/${t.linked_project_id}`)}
                          style={{ fontSize:'.68rem',fontWeight:700,color:'#16a34a',background:'#f0fdf4',padding:'3px 9px',borderRadius:999,border:'1px solid #bbf7d0',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:3,whiteSpace:'nowrap' }}>
                          <I.Check/> Spec generated
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <p style={{ margin:'0 0 8px',fontSize:'.76rem',color:'#9ca3af' }}>
                    {t.field} · {t.degree_level} {t.project_type?`· ${t.project_type}`:''} · {topicRelativeTime(t.created_at)}
                  </p>
                  {t.description&&<p style={{ margin:'0 0 10px',fontSize:'.8rem',color:'#6b7280',lineHeight:1.6,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden' }}>{t.description}</p>}

                  {/* Action row */}
                  <div style={{ display:'flex',alignItems:'center',gap:8,flexWrap:'wrap' }}>
                    {!t.linked_project_id && (
                      <button onClick={()=>handleUse(t)}
                        style={{ display:'inline-flex',alignItems:'center',gap:5,padding:'5px 12px',borderRadius:8,background:'#7c3aed',color:'white',fontSize:'.76rem',fontWeight:700,border:'none',cursor:'pointer',transition:'all .15s' }}
                        onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='#6d28d9'}
                        onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='#7c3aed'}>
                        <I.Zap/> Use this topic
                      </button>
                    )}
                    {t.original_topic && t.original_topic!==t.final_topic && (
                      <span style={{ fontSize:'.72rem',color:'#9ca3af',fontStyle:'italic' }}>
                        Originally: "{t.original_topic.slice(0,50)}{t.original_topic.length>50?'…':''}"
                      </span>
                    )}
                    <div style={{ flex:1 }}/>
                    <button onClick={()=>handleDelete(t.id)} disabled={deletingId===t.id}
                      style={{ display:'inline-flex',alignItems:'center',gap:4,padding:'5px 10px',borderRadius:8,background:'none',color:'#9ca3af',fontSize:'.72rem',fontWeight:600,border:'1px solid #e8ede8',cursor:'pointer',transition:'all .15s',opacity:deletingId===t.id?.5:1 }}
                      onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color='#dc2626';(e.currentTarget as HTMLElement).style.borderColor='#fecaca';(e.currentTarget as HTMLElement).style.background='#fef2f2'}}
                      onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color='#9ca3af';(e.currentTarget as HTMLElement).style.borderColor='#e8ede8';(e.currentTarget as HTMLElement).style.background='none'}}>
                      {deletingId===t.id?<><span className="sp"><I.Spin/></span> Removing…</>:<><I.Trash/> Remove</>}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════ */
function ProjectsPageInner() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') === 'topics' ? 'topics' : 'specs'
  const [activeTab, setActiveTab] = useState<'specs'|'topics'>(initialTab as 'specs'|'topics')

  const { data:projects } = useProjects({ limit:50 })
  const { data:topicData } = useTopicHistory()

  const specCount   = (projects||[]).length
  const topicCount  = topicData?.total ?? 0

  return (
    <div style={{ maxWidth:1140 }}>
      <style>{`
        .pc:hover { border-color:rgba(22,163,74,.3)!important; box-shadow:0 8px 24px rgba(0,0,0,.08)!important; transform:translateY(-2px); }
        .ft:hover { background:#f0fdf4!important; color:#16a34a!important; }
        .ft.on  { background:#16a34a!important; color:white!important; box-shadow:0 2px 8px rgba(22,163,74,.25)!important; }
        .src:focus { border-color:#16a34a!important; box-shadow:0 0 0 3px rgba(22,163,74,.1)!important; }
        @keyframes sp2{to{transform:rotate(360deg)}} .sp{animation:sp2 .9s linear infinite;display:inline-block}
      `}</style>

      {/* Header */}
      <motion.div {...fu(0)} style={{ display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:14 }}>
        <div>
          <h1 style={{ margin:'0 0 4px',fontSize:'clamp(1.5rem,2.5vw,2rem)',fontWeight:800,color:'#0f1f0f',fontFamily:'Fraunces,serif' }}>
            My Research
          </h1>
          <p style={{ margin:0,fontSize:'.88rem',color:'#6b7280' }}>
            {specCount} spec{specCount!==1?'s':''} · {topicCount} topic{topicCount!==1?'s':''} explored
          </p>
        </div>
        <div style={{ display:'flex',gap:10 }}>
          <Link href="/dashboard/topics" style={{ textDecoration:'none' }}>
            <button className="g-btn-ghost" style={{ fontSize:'.84rem' }}><I.Flask/> Topic Lab</button>
          </Link>
          <Link href="/dashboard/generate" style={{ textDecoration:'none' }}>
            <button className="g-btn"><I.Plus/> New Specification</button>
          </Link>
        </div>
      </motion.div>

      {/* Tab bar */}
      <motion.div {...fu(.05)} style={{ display:'flex',gap:4,marginBottom:22,background:'white',border:'1px solid #e8ede8',borderRadius:11,padding:5,boxShadow:'0 1px 3px rgba(0,0,0,.04)',width:'fit-content' }}>
        {([
          { key:'specs',  label:'Specifications', icon:<I.File/>,  count:specCount  },
          { key:'topics', label:'Topic History',  icon:<I.Flask/>, count:topicCount },
        ] as const).map(t=>(
          <button key={t.key} onClick={()=>setActiveTab(t.key)}
            style={{ display:'flex',alignItems:'center',gap:7,padding:'8px 18px',borderRadius:8,border:'none',cursor:'pointer',transition:'all .2s',fontWeight:activeTab===t.key?700:500,fontSize:'.84rem',
              background: activeTab===t.key ? (t.key==='topics'?'#7c3aed':'#16a34a') : 'transparent',
              color:      activeTab===t.key ? 'white' : '#6b7280',
            }}>
            {t.icon}
            {t.label}
            <span style={{ fontSize:'.68rem',fontWeight:700,background:activeTab===t.key?'rgba(255,255,255,.25)':'#f0f0f0',color:activeTab===t.key?'white':'#6b7280',borderRadius:999,padding:'1px 7px',minWidth:18,textAlign:'center' }}>
              {t.count}
            </span>
          </button>
        ))}
      </motion.div>

      {/* Tab content */}
      {activeTab==='specs'   && <SpecificationsTab/>}
      {activeTab==='topics'  && <TopicHistoryTab/>}
    </div>
  )
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div style={{ maxWidth:1140 }}><div className="g-sk" style={{ height:60,borderRadius:14,marginBottom:20 }}/></div>}>
      <ProjectsPageInner/>
    </Suspense>
  )
}
