'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import axios from 'axios'

/* ─── Icons ─────────────────────────────────────────────────────────────── */
const I = {
  Compass: ()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>,
  Arrow:   ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
  Back:    ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>,
  Check:   ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Zap:     ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Spin:    ()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>,
  Send:    ()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Star:    ()=><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  X:       ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Brain:   ()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.98-3 2.5 2.5 0 0 1-1.32-4.24 3 3 0 0 1 .34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.1-2.46Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.98-3 2.5 2.5 0 0 0 1.32-4.24 3 3 0 0 0-.34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.1-2.46Z"/></svg>,
  Flag:    ()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
  Chat:    ()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  Rocket:  ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>,
}

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface FormData {
  degree_level:       'BSc'|'MSc'|''
  field:              string
  project_type:       string
  preferred_activity: string[]
  interest_areas:     string[]
  geographic_focus:   string
  ambition_level:     string
  confidence_level:   string
}
interface Topic {
  id:string; title:string; cluster:string; complexity:string; research_depth:string
  implementation:string; suitability_score:number; suitability_reason:string; one_liner:string
}
interface DiscoveryResult {
  clusters:string[]; topics:Topic[]; prompt_note:string
}
interface ChatMsg { role:'user'|'ai'; content:string }

type Stage = 'form'|'loading'|'results'|'chat'|'final'

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
function authHeaders() { return { Authorization:`Bearer ${localStorage.getItem('access_token')}` } }

const COMPLEXITY_COLORS: Record<string,string> = { Low:'#16a34a', Medium:'#d97706', High:'#dc2626' }
const COMPLEXITY_BGS:    Record<string,string> = { Low:'#f0fdf4',  Medium:'#fffbeb', High:'#fef2f2' }

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function StageBar({ current }: { current:number }) {
  const steps = [
    {n:1,label:'Your Profile', icon:I.Brain},
    {n:2,label:'Topic Ideas',  icon:I.Compass},
    {n:3,label:'AI Advisor',   icon:I.Chat},
    {n:4,label:'Your Topic',   icon:I.Flag},
  ]
  return (
    <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:32,position:'relative' }}>
      <div style={{ position:'absolute',top:15,left:'10%',right:'10%',height:2,background:'#e8ede8',zIndex:0 }}>
        <motion.div initial={{width:0}} animate={{width:`${((current-1)/3)*100}%`}} transition={{duration:.4}}
          style={{ height:'100%',background:'linear-gradient(90deg,#7c3aed,#16a34a)' }}/>
      </div>
      {steps.map(s=>{
        const done=current>s.n, active=current===s.n
        return (
          <div key={s.n} style={{ display:'flex',flexDirection:'column',alignItems:'center',zIndex:1,flex:1 }}>
            <div style={{ width:30,height:30,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',border:`2px solid ${done?'#16a34a':active?'#7c3aed':'#e8ede8'}`,background:done?'#16a34a':active?'#7c3aed':'white',color:done||active?'white':'#9ca3af',transition:'all .3s',boxShadow:active?'0 0 0 5px rgba(124,58,237,.12)':'none' }}>
              {done?<I.Check/>:<s.icon/>}
            </div>
            <p style={{ margin:'7px 0 0',fontSize:'.72rem',fontWeight:active?700:500,color:done?'#16a34a':active?'#7c3aed':'#9ca3af',textAlign:'center' }}>{s.label}</p>
          </div>
        )
      })}
    </div>
  )
}

function ChipSelect({ options, selected, onToggle, multi=true, color='#7c3aed', bg='#faf5ff', border='#e9d5ff' }:
  { options:string[]; selected:string[]; onToggle:(v:string)=>void; multi?:boolean; color?:string; bg?:string; border?:string }) {
  return (
    <div style={{ display:'flex',flexWrap:'wrap',gap:8 }}>
      {options.map(o=>{
        const on=selected.includes(o)
        return (
          <button key={o} onClick={()=>onToggle(o)}
            style={{ padding:'8px 14px',borderRadius:999,border:`1.5px solid ${on?border:'#e8ede8'}`,background:on?bg:'white',color:on?color:'#6b7280',fontSize:'.82rem',fontWeight:on?700:500,cursor:'pointer',transition:'all .15s' }}>
            {on&&<span style={{ marginRight:5 }}>✓</span>}{o}
          </button>
        )
      })}
    </div>
  )
}

function RadioCards({ options, selected, onSelect, color='#7c3aed', bg='#faf5ff', border='#e9d5ff' }:
  { options:{value:string;label:string;sub?:string}[]; selected:string; onSelect:(v:string)=>void; color?:string; bg?:string; border?:string }) {
  return (
    <div style={{ display:'grid',gridTemplateColumns:`repeat(${Math.min(options.length,4)},1fr)`,gap:10 }}>
      {options.map(o=>{
        const on=selected===o.value
        return (
          <button key={o.value} onClick={()=>onSelect(o.value)}
            style={{ padding:'12px 14px',borderRadius:12,border:`2px solid ${on?border:'#e8ede8'}`,background:on?bg:'white',cursor:'pointer',transition:'all .15s',textAlign:'left' }}>
            <p style={{ margin:0,fontWeight:700,color:on?color:'#374151',fontSize:'.84rem' }}>{o.label}</p>
            {o.sub&&<p style={{ margin:'2px 0 0',fontSize:'.71rem',color:on?`${color}99`:'#9ca3af' }}>{o.sub}</p>}
          </button>
        )
      })}
    </div>
  )
}

/* ─── FORM — 8 questions ─────────────────────────────────────────────────── */
const QUESTIONS = [
  { id:'degree_level',       label:'What is your degree level?',                   note:'' },
  { id:'field',              label:'What is your field or department?',             note:'Be specific — e.g. "Computer Science — AI" or "Public Health"' },
  { id:'project_type',       label:'What type of project do you need?',             note:'' },
  { id:'preferred_activity', label:'What kind of work do you enjoy most?',         note:'Pick all that apply' },
  { id:'interest_areas',    label:'Which areas interest you most?',                note:'Pick as many as you like' },
  { id:'geographic_focus',  label:'What is your geographic focus?',                note:'Where should the research be relevant?' },
  { id:'ambition_level',    label:'What is your ambition level for this project?', note:'' },
  { id:'confidence_level',  label:'How clear are you on your topic right now?',    note:'' },
]

const Q_OPTIONS: Record<string, {value:string;label:string;sub?:string}[]|string[]> = {
  degree_level: [
    {value:'BSc', label:'Bachelor\'s (BSc)', sub:'Undergraduate degree'},
    {value:'MSc', label:'Master\'s (MSc)',   sub:'Postgraduate degree'},
  ],
  project_type: [
    {value:'research-based', label:'Research-based', sub:'Literature & theory'},
    {value:'practical',      label:'Practical',      sub:'Build / implement something'},
    {value:'mixed',          label:'Mixed',           sub:'Both research & practical'},
    {value:'not-sure',       label:'Not sure',        sub:'Let AI decide'},
  ],
  preferred_activity: ['Problem-solving','Building','Data Analysis','Studying People','Theory','Unsure'],
  interest_areas:    ['Technology','Business','Health','Education','Environment','Agriculture','Social Issues','Policy','Psychology','Engineering','Media','Open to anything'],
  geographic_focus: [
    {value:'university',label:'My University', sub:'Local campus context'},
    {value:'city',      label:'City/Region',   sub:'Urban / regional focus'},
    {value:'country',   label:'My Country',    sub:'National context'},
    {value:'africa',    label:'Africa',         sub:'Pan-African scope'},
    {value:'global',    label:'Global',         sub:'International / worldwide'},
    {value:'none',      label:'No specific focus', sub:'Topic-agnostic'},
  ],
  ambition_level: [
    {value:'manageable',  label:'Manageable',  sub:'Safe pass/merit, low stress'},
    {value:'impressive',  label:'Impressive',  sub:'Strong novel angle, well executed'},
    {value:'distinction', label:'Distinction', sub:'Ambitious — targeting top grade'},
    {value:'cv-strong',   label:'CV-Strong',   sub:'Industry-ready, portfolio worthy'},
  ],
  confidence_level: [
    {value:'very-confused',   label:'Very Confused',   sub:'No idea where to start'},
    {value:'somewhat-unsure', label:'Somewhat Unsure', sub:'General area, no clear topic'},
    {value:'rough-direction', label:'Rough Direction', sub:'Direction set, need narrowing'},
    {value:'have-idea',       label:'Have an Idea',    sub:'Need validation & refinement'},
  ],
}

function FormStage({ onSubmit }: { onSubmit:(d:FormData)=>void }) {
  const [q, setQ] = useState(0)
  const [form, setForm] = useState<FormData>({
    degree_level:'', field:'', project_type:'', preferred_activity:[],
    interest_areas:[], geographic_focus:'', ambition_level:'', confidence_level:'',
  })

  const update = (key:keyof FormData, val:any) => setForm(p=>({...p,[key]:val}))
  const toggleArr = (key:'preferred_activity'|'interest_areas', val:string) => {
    const arr = form[key] as string[]
    update(key, arr.includes(val) ? arr.filter(v=>v!==val) : [...arr,val])
  }

  const canNext = () => {
    const id = QUESTIONS[q].id as keyof FormData
    const v = form[id]
    if (Array.isArray(v)) return v.length > 0
    return !!v && v!==''
  }

  const isLast = q === QUESTIONS.length - 1
  const progress = ((q) / QUESTIONS.length) * 100

  const renderQuestion = () => {
    const qid = QUESTIONS[q].id
    if (qid === 'field') {
      return (
        <input value={form.field} onChange={e=>update('field',e.target.value)}
          placeholder="e.g. Computer Science, Public Health, Business Management…"
          className="g-input" style={{ fontSize:'1rem',padding:'14px 16px' }}
          onKeyDown={e=>{ if(e.key==='Enter'&&canNext()) next() }}/>
      )
    }
    if (qid === 'preferred_activity' || qid === 'interest_areas') {
      const opts = Q_OPTIONS[qid] as string[]
      const sel = form[qid] as string[]
      const color = qid==='interest_areas'?'#16a34a':'#7c3aed'
      const bg    = qid==='interest_areas'?'#f0fdf4':'#faf5ff'
      const bdr   = qid==='interest_areas'?'#bbf7d0':'#e9d5ff'
      return <ChipSelect options={opts} selected={sel} onToggle={v=>toggleArr(qid as any,v)} color={color} bg={bg} border={bdr}/>
    }
    const opts = Q_OPTIONS[qid] as {value:string;label:string;sub?:string}[]
    const isSingle = ['degree_level','project_type','geographic_focus','ambition_level','confidence_level'].includes(qid)
    if (isSingle) {
      const color = ['ambition_level','confidence_level'].includes(qid)?'#16a34a':'#7c3aed'
      const bg    = ['ambition_level','confidence_level'].includes(qid)?'#f0fdf4':'#faf5ff'
      const bdr   = ['ambition_level','confidence_level'].includes(qid)?'#bbf7d0':'#e9d5ff'
      return <RadioCards options={opts} selected={form[qid as keyof FormData] as string}
        onSelect={v=>{ update(qid as keyof FormData, v); setTimeout(()=>next(),200) }}
        color={color} bg={bg} border={bdr}/>
    }
    return null
  }

  const next = () => {
    if (!canNext()) return
    if (isLast) { onSubmit(form); return }
    setQ(p=>p+1)
  }

  return (
    <div style={{ maxWidth:640,margin:'0 auto' }}>
      {/* Progress bar */}
      <div style={{ height:4,background:'#e8ede8',borderRadius:2,marginBottom:36,overflow:'hidden' }}>
        <motion.div initial={{width:0}} animate={{width:`${progress}%`}} transition={{duration:.4}}
          style={{ height:'100%',background:'linear-gradient(90deg,#7c3aed,#a855f7)',borderRadius:2 }}/>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={q} initial={{opacity:0,x:30}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-30}} transition={{duration:.25}}>
          {/* Question counter */}
          <p style={{ fontSize:'.72rem',fontWeight:700,color:'#9ca3af',marginBottom:6,textTransform:'uppercase',letterSpacing:'.1em' }}>
            Question {q+1} of {QUESTIONS.length}
          </p>
          {/* Question */}
          <h2 style={{ fontSize:'clamp(1.1rem,2vw,1.4rem)',fontWeight:800,color:'#0f1f0f',fontFamily:'Fraunces,serif',margin:'0 0 6px',lineHeight:1.2 }}>
            {QUESTIONS[q].label}
          </h2>
          {QUESTIONS[q].note && (
            <p style={{ margin:'0 0 20px',fontSize:'.82rem',color:'#9ca3af' }}>{QUESTIONS[q].note}</p>
          )}
          {!QUESTIONS[q].note && <div style={{ height:20 }}/>}
          {renderQuestion()}
        </motion.div>
      </AnimatePresence>

      {/* Nav */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:28 }}>
        <button onClick={()=>setQ(p=>Math.max(0,p-1))} disabled={q===0}
          className="g-btn-outline" style={{ opacity:q===0?.3:1,display:'flex',alignItems:'center',gap:6 }}>
          <I.Back/> Back
        </button>
        {!['degree_level','project_type','geographic_focus','ambition_level','confidence_level'].includes(QUESTIONS[q].id) && (
          <button onClick={next} disabled={!canNext()} className="g-btn" style={{ opacity:canNext()?1:.4 }}>
            {isLast?<><I.Brain/> Generate My Topics</>:<>Continue <I.Arrow/></>}
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── LOADING ─────────────────────────────────────────────────────────────── */
function LoadingStage() {
  const steps = [
    'Analysing your profile…',
    'Scanning your field of study…',
    'Matching interest areas to research gaps…',
    'Ranking topics by suitability…',
    'Grouping into thematic clusters…',
    'Finalising your personalised list…',
  ]
  const [step, setStep] = useState(0)
  useEffect(()=>{
    const t = setInterval(()=>setStep(p=>Math.min(p+1,steps.length-1)),1400)
    return ()=>clearInterval(t)
  },[])

  return (
    <div style={{ maxWidth:480,margin:'80px auto 0',textAlign:'center' }}>
      <style>{`@keyframes sp{to{transform:rotate(360deg)}} .sp{animation:sp 1s linear infinite;display:inline-block}`}</style>
      <div style={{ width:72,height:72,borderRadius:20,background:'linear-gradient(135deg,#7c3aed,#a855f7)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 24px',boxShadow:'0 8px 32px rgba(124,58,237,.3)' }}>
        <div className="sp" style={{ color:'white' }}><I.Spin/></div>
      </div>
      <h2 style={{ margin:'0 0 8px',fontWeight:800,color:'#0f1f0f',fontSize:'1.3rem',fontFamily:'Fraunces,serif' }}>Finding your best topics</h2>
      <p style={{ margin:'0 0 32px',fontSize:'.86rem',color:'#6b7280' }}>Our AI is personalising suggestions just for you</p>
      <div style={{ background:'white',border:'1px solid #e8ede8',borderRadius:14,padding:'20px',textAlign:'left',boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
        {steps.map((s,i)=>(
          <div key={i} style={{ display:'flex',alignItems:'center',gap:10,padding:'7px 0',opacity:i>step?0.25:1,transition:'opacity .4s' }}>
            <div style={{ width:20,height:20,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',
              background:i<step?'#16a34a':i===step?'#7c3aed':'#f3f4f6',transition:'all .3s' }}>
              {i<step?<span style={{color:'white',fontSize:10}}><I.Check/></span>:i===step?<div className="sp" style={{color:'white',transform:'scale(.7)'}}><I.Spin/></div>:null}
            </div>
            <span style={{ fontSize:'.82rem',color:i===step?'#0f1f0f':i<step?'#16a34a':'#9ca3af',fontWeight:i===step?700:400 }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── RESULTS — topic cards ──────────────────────────────────────────────── */
function ResultsStage({ result, onSelect }: { result:DiscoveryResult; onSelect:(t:Topic)=>void }) {
  const [activeCluster, setActiveCluster] = useState('All')
  const clusters = ['All', ...result.clusters]
  const filtered = activeCluster==='All' ? result.topics : result.topics.filter(t=>t.cluster===activeCluster)

  return (
    <div>
      {/* Note */}
      <div style={{ background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'14px 16px',marginBottom:22,display:'flex',alignItems:'flex-start',gap:10 }}>
        <div style={{ color:'#7c3aed',flexShrink:0,marginTop:1 }}><I.Brain/></div>
        <p style={{ margin:0,fontSize:'.84rem',color:'#374151',lineHeight:1.6 }}>{result.prompt_note}</p>
      </div>

      {/* Cluster filter */}
      <div style={{ display:'flex',gap:6,flexWrap:'wrap',marginBottom:22 }}>
        {clusters.map(c=>(
          <button key={c} onClick={()=>setActiveCluster(c)}
            style={{ padding:'6px 14px',borderRadius:999,border:`1.5px solid ${activeCluster===c?'#7c3aed':'#e8ede8'}`,background:activeCluster===c?'#7c3aed':'white',color:activeCluster===c?'white':'#6b7280',fontSize:'.78rem',fontWeight:600,cursor:'pointer',transition:'all .15s' }}>
            {c}
            {c==='All'&&<span style={{ marginLeft:5,background:activeCluster===c?'rgba(255,255,255,.25)':'#f0fdf4',color:activeCluster===c?'white':'#16a34a',borderRadius:999,padding:'0 6px',fontSize:'.68rem',fontWeight:700 }}>{result.topics.length}</span>}
          </button>
        ))}
      </div>

      {/* Topic grid */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14 }}>
        {filtered.map((topic, i) => (
          <motion.div key={topic.id} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*.04,duration:.35}}
            onClick={()=>onSelect(topic)}
            style={{ background:'white',border:'1.5px solid #e8ede8',borderRadius:16,padding:'18px',cursor:'pointer',transition:'all .2s',boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor='#c4b5fd';(e.currentTarget as HTMLElement).style.boxShadow='0 8px 24px rgba(124,58,237,.12)';(e.currentTarget as HTMLElement).style.transform='translateY(-2px)'}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor='#e8ede8';(e.currentTarget as HTMLElement).style.boxShadow='0 1px 3px rgba(0,0,0,.05)';(e.currentTarget as HTMLElement).style.transform='translateY(0)'}}>

            {/* Score badge + cluster */}
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12 }}>
              <span style={{ display:'inline-flex',alignItems:'center',gap:4,padding:'3px 9px',borderRadius:999,background:'#faf5ff',border:'1px solid #e9d5ff',fontSize:'.7rem',fontWeight:700,color:'#7c3aed' }}>
                <I.Star/> {topic.suitability_score}% match
              </span>
              <span style={{ fontSize:'.7rem',color:'#9ca3af',background:'#f9fafb',padding:'2px 8px',borderRadius:6 }}>{topic.cluster}</span>
            </div>

            {/* Title */}
            <h3 style={{ margin:'0 0 6px',fontWeight:700,color:'#0f1f0f',fontSize:'.95rem',lineHeight:1.35 }}>{topic.title}</h3>
            <p style={{ margin:'0 0 14px',fontSize:'.8rem',color:'#6b7280',lineHeight:1.5 }}>{topic.one_liner}</p>

            {/* Tags */}
            <div style={{ display:'flex',gap:6,flexWrap:'wrap',marginBottom:14 }}>
              <span style={{ fontSize:'.68rem',fontWeight:700,color:COMPLEXITY_COLORS[topic.complexity],background:COMPLEXITY_BGS[topic.complexity],padding:'2px 8px',borderRadius:6 }}>
                {topic.complexity} complexity
              </span>
              <span style={{ fontSize:'.68rem',color:'#6b7280',background:'#f3f4f6',padding:'2px 8px',borderRadius:6 }}>{topic.research_depth} depth</span>
              <span style={{ fontSize:'.68rem',color:'#6b7280',background:'#f3f4f6',padding:'2px 8px',borderRadius:6 }}>{topic.implementation}</span>
            </div>

            {/* Suitability reason */}
            <p style={{ margin:'0 0 14px',fontSize:'.76rem',color:'#374151',lineHeight:1.5,paddingTop:10,borderTop:'1px solid #f3f4f6' }}>
              <strong style={{ color:'#16a34a' }}>Why this suits you:</strong> {topic.suitability_reason}
            </p>

            {/* CTA */}
            <div style={{ display:'flex',alignItems:'center',justifyContent:'flex-end',gap:4,color:'#7c3aed',fontSize:'.78rem',fontWeight:700 }}>
              Explore with AI <I.Arrow/>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* ─── CHAT — AI advisor ──────────────────────────────────────────────────── */
function ChatStage({
  topic, formData, onFinal
}: { topic:Topic; formData:FormData; onFinal:(refined:string, desc:string)=>void }) {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [chatStage, setChatStage] = useState<'explain'|'questions'|'feasibility'|'final'>('explain')
  const [questionCount, setQuestionCount] = useState(0)
  const [refinedTopic, setRefinedTopic] = useState<string|null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(()=>{ callAI('explain') },[])
  useEffect(()=>{ bottomRef.current?.scrollIntoView({ behavior:'smooth' }) },[messages])

  const callAI = async (stage: typeof chatStage, userMsg?:string) => {
    setLoading(true)
    try {
      const conversation: {role:string;content:string}[] = []
      messages.forEach(m=>conversation.push({ role:m.role==='user'?'user':'assistant', content:m.content }))

      const res = await axios.post(`${API}/topics/refine`, {
        topic_title:     topic.title,
        topic_one_liner: topic.one_liner,
        field:           formData.field,
        degree_level:    formData.degree_level,
        ambition_level:  formData.ambition_level,
        stage,
        student_message: userMsg || null,
        conversation,
      }, { headers: authHeaders() })

      const data = res.data
      setMessages(p=>[...p, {role:'ai',content:data.ai_message}])

      if (data.is_final && data.refined_topic) {
        setRefinedTopic(data.refined_topic)
        onFinal(data.refined_topic, data.refined_description||'')
      }
    } catch(e) {
      setMessages(p=>[...p,{role:'ai',content:'Sorry, something went wrong. Please try again.'}])
    } finally { setLoading(false) }
  }

  const sendMessage = async () => {
    if (!input.trim()||loading) return
    const msg = input.trim()
    setInput('')
    setMessages(p=>[...p,{role:'user',content:msg}])

    // Stage logic: after 4 questions go to feasibility, after that go to final
    let nextStage: typeof chatStage = 'questions'
    const newCount = questionCount + 1
    setQuestionCount(newCount)

    if (chatStage === 'explain' || chatStage === 'questions') {
      if (newCount >= 4) { nextStage = 'feasibility'; setChatStage('feasibility') }
      else setChatStage('questions')
    } else if (chatStage === 'feasibility') {
      nextStage = 'final'; setChatStage('final')
    } else {
      nextStage = 'final'
    }

    await callAI(nextStage, msg)
  }

  return (
    <div style={{ maxWidth:720,margin:'0 auto' }}>
      {/* Topic header */}
      <div style={{ background:'#faf5ff',border:'1.5px solid #e9d5ff',borderRadius:14,padding:'16px 18px',marginBottom:20,display:'flex',alignItems:'flex-start',gap:12 }}>
        <div style={{ width:40,height:40,borderRadius:11,background:'#7c3aed',display:'flex',alignItems:'center',justifyContent:'center',color:'white',flexShrink:0 }}><I.Chat/></div>
        <div>
          <p style={{ margin:'0 0 3px',fontSize:'.72rem',fontWeight:700,color:'#7c3aed',textTransform:'uppercase',letterSpacing:'.08em' }}>AI Advisor · Exploring</p>
          <p style={{ margin:0,fontWeight:700,color:'#0f1f0f',fontSize:'.92rem',lineHeight:1.3 }}>{topic.title}</p>
        </div>
      </div>

      {/* Chat window */}
      <div style={{ background:'white',border:'1px solid #e8ede8',borderRadius:16,overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
        <div style={{ height:420,overflowY:'auto',padding:'20px' }}>
          {messages.map((m,i)=>(
            <div key={i} style={{ display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start',marginBottom:14 }}>
              {m.role==='ai'&&(
                <div style={{ width:30,height:30,borderRadius:'50%',background:'#7c3aed',display:'flex',alignItems:'center',justifyContent:'center',color:'white',flexShrink:0,marginRight:10,marginTop:2 }}>
                  <I.Brain/>
                </div>
              )}
              <div style={{ maxWidth:'78%',padding:'12px 15px',borderRadius:m.role==='user'?'14px 14px 4px 14px':'14px 14px 14px 4px',
                background:m.role==='user'?'#7c3aed':'#f9fafb',border:m.role==='user'?'none':'1px solid #e8ede8',
                color:m.role==='user'?'white':'#374151',fontSize:'.86rem',lineHeight:1.7,whiteSpace:'pre-wrap' }}>
                {m.content}
              </div>
            </div>
          ))}
          {loading&&(
            <div style={{ display:'flex',gap:10,marginBottom:14 }}>
              <div style={{ width:30,height:30,borderRadius:'50%',background:'#7c3aed',display:'flex',alignItems:'center',justifyContent:'center',color:'white',flexShrink:0 }}><I.Brain/></div>
              <div style={{ padding:'12px 15px',borderRadius:'14px 14px 14px 4px',background:'#f9fafb',border:'1px solid #e8ede8',display:'flex',alignItems:'center',gap:6 }}>
                {[0,1,2].map(i=>(
                  <motion.div key={i} animate={{y:[0,-6,0]}} transition={{duration:.6,repeat:Infinity,delay:i*.15}}
                    style={{ width:7,height:7,borderRadius:'50%',background:'#7c3aed' }}/>
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Input */}
        {chatStage!=='final'&&!refinedTopic&&(
          <div style={{ padding:'14px 16px',borderTop:'1px solid #f0f4f0',display:'flex',gap:8 }}>
            <input value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()} }}
              placeholder="Type your response…" disabled={loading}
              style={{ flex:1,padding:'10px 14px',borderRadius:10,border:'1.5px solid #e8ede8',background:'#f9fafb',color:'#0f1f0f',fontSize:'.86rem',outline:'none',transition:'border-color .2s' }}
              onFocus={e=>(e.target as HTMLElement).style.borderColor='#7c3aed'}
              onBlur={e=>(e.target as HTMLElement).style.borderColor='#e8ede8'}/>
            <button onClick={sendMessage} disabled={loading||!input.trim()}
              style={{ width:42,height:42,borderRadius:11,background:input.trim()&&!loading?'#7c3aed':'#f3f4f6',border:'none',display:'flex',alignItems:'center',justifyContent:'center',color:input.trim()&&!loading?'white':'#9ca3af',cursor:input.trim()&&!loading?'pointer':'not-allowed',transition:'all .15s',flexShrink:0 }}>
              <I.Send/>
            </button>
          </div>
        )}
      </div>

      {/* Stage hint */}
      <div style={{ marginTop:12,textAlign:'center' }}>
        <p style={{ fontSize:'.74rem',color:'#9ca3af' }}>
          {chatStage==='explain'?'The AI is introducing your topic…':
           chatStage==='questions'?`Feasibility check · Question ~${questionCount}/4`:
           chatStage==='feasibility'?'Assessing feasibility for you…':
           'Finalising your refined topic…'}
        </p>
      </div>
    </div>
  )
}

/* ─── FINAL ──────────────────────────────────────────────────────────────── */
function FinalStage({ topic, description, field, level }: { topic:string; description:string; field:string; level:string }) {
  const router = useRouter()

  const handleUseThis = () => {
    // Store in sessionStorage so generate page can pre-fill it
    sessionStorage.setItem('prefill_topic', topic)
    sessionStorage.setItem('prefill_field', field)
    sessionStorage.setItem('prefill_level', level)
    router.push('/dashboard/generate')
  }

  return (
    <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:.5}} style={{ maxWidth:640,margin:'0 auto',textAlign:'center' }}>
      {/* Trophy */}
      <div style={{ width:80,height:80,borderRadius:22,background:'linear-gradient(135deg,#16a34a,#22c55e)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 24px',boxShadow:'0 8px 32px rgba(22,163,74,.25)' }}>
        <I.Flag/>
      </div>
      <h2 style={{ margin:'0 0 8px',fontWeight:800,color:'#0f1f0f',fontFamily:'Fraunces,serif',fontSize:'1.5rem' }}>Your Topic is Ready! 🎉</h2>
      <p style={{ margin:'0 0 28px',fontSize:'.88rem',color:'#6b7280' }}>Your AI advisor has finalised a research direction tailored to your profile and goals.</p>

      {/* Topic card */}
      <div style={{ background:'white',border:'1.5px solid #bbf7d0',borderRadius:18,padding:'24px',marginBottom:24,textAlign:'left',boxShadow:'0 4px 20px rgba(22,163,74,.08)' }}>
        <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:14 }}>
          <span style={{ padding:'3px 10px',borderRadius:999,background:'#f0fdf4',border:'1px solid #bbf7d0',fontSize:'.72rem',fontWeight:700,color:'#16a34a' }}>✓ Finalised Topic</span>
          <span style={{ fontSize:'.72rem',color:'#9ca3af' }}>{level} · {field}</span>
        </div>
        <h3 style={{ margin:'0 0 14px',fontWeight:800,color:'#0f1f0f',fontSize:'1.05rem',fontFamily:'Fraunces,serif',lineHeight:1.3 }}>
          {topic}
        </h3>
        {description&&(
          <p style={{ margin:0,fontSize:'.84rem',color:'#374151',lineHeight:1.75,whiteSpace:'pre-wrap' }}>{description}</p>
        )}
      </div>

      {/* Actions */}
      <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
        <button onClick={handleUseThis} className="g-btn"
          style={{ width:'100%',justifyContent:'center',fontSize:'.95rem',padding:'14px',boxShadow:'0 4px 20px rgba(22,163,74,.3)' }}>
          <I.Rocket/> Use This Topic → Generate My Spec
        </button>
        <button onClick={()=>window.location.reload()} className="g-btn-outline" style={{ width:'100%',justifyContent:'center',fontSize:'.86rem' }}>
          Start Over · Find a Different Topic
        </button>
      </div>

      <p style={{ marginTop:18,fontSize:'.76rem',color:'#9ca3af',lineHeight:1.7 }}>
        Clicking "Use This Topic" will take you to the spec generator with your topic pre-filled. You just need to upload your university's guidelines PDF to generate your full research specification.
      </p>
    </motion.div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════════════════════ */
export default function TopicsPage() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>('form')
  const [formData, setFormData] = useState<FormData|null>(null)
  const [discoveryResult, setDiscoveryResult] = useState<DiscoveryResult|null>(null)
  const [selectedTopic, setSelectedTopic] = useState<Topic|null>(null)
  const [finalTopic, setFinalTopic] = useState<{topic:string;description:string}|null>(null)
  const [error, setError] = useState<string|null>(null)

  const stageNum = stage==='form'?1:stage==='loading'?1:stage==='results'?2:stage==='chat'?3:4

  const handleFormSubmit = async (data:FormData) => {
    setFormData(data)
    setStage('loading')
    setError(null)
    try {
      const res = await axios.post(`${API}/topics/discover`, {
        ...data,
        preferred_activity: data.preferred_activity,
        interest_areas: data.interest_areas,
      }, { headers: authHeaders() })
      setDiscoveryResult(res.data)
      setStage('results')
    } catch(e:any) {
      setError(e.response?.data?.detail || 'Failed to generate topics. Please try again.')
      setStage('form')
    }
  }

  const handleTopicSelect = (topic:Topic) => {
    setSelectedTopic(topic)
    setStage('chat')
  }

  const handleFinal = (topic:string, desc:string) => {
    setFinalTopic({ topic, description:desc })
    setTimeout(()=>setStage('final'), 1200)
  }

  return (
    <div style={{ maxWidth:1100,margin:'0 auto' }}>
      {/* Page header */}
      <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:32,flexWrap:'wrap',gap:14 }}>
        <div>
          <button onClick={()=>router.push('/dashboard')} style={{ display:'inline-flex',alignItems:'center',gap:6,background:'none',border:'none',color:'#9ca3af',cursor:'pointer',fontSize:'.8rem',fontWeight:600,padding:'0 0 12px',transition:'color .15s' }}
            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color='#7c3aed'}
            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color='#9ca3af'}>
            <I.Back/> Back to Dashboard
          </button>
          <div style={{ display:'flex',alignItems:'center',gap:12 }}>
            <div style={{ width:44,height:44,borderRadius:13,background:'linear-gradient(135deg,#7c3aed,#a855f7)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',boxShadow:'0 4px 16px rgba(124,58,237,.3)' }}>
              <I.Compass/>
            </div>
            <div>
              <h1 style={{ margin:0,fontSize:'clamp(1.3rem,2vw,1.7rem)',fontWeight:800,color:'#0f1f0f',fontFamily:'Fraunces,serif',lineHeight:1.1 }}>Topic Discovery Engine</h1>
              <p style={{ margin:0,fontSize:'.84rem',color:'#6b7280' }}>Personalised topic suggestions → AI feasibility chat → refined, ready-to-use topic</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stage bar */}
      {stage!=='loading'&&<StageBar current={stageNum}/>}

      {/* Error */}
      {error&&(
        <div style={{ background:'#fef2f2',border:'1.5px solid #fecaca',borderRadius:12,padding:'12px 16px',marginBottom:20,display:'flex',alignItems:'center',gap:10 }}>
          <div style={{ color:'#dc2626' }}><I.X/></div>
          <p style={{ margin:0,fontSize:'.84rem',color:'#dc2626',flex:1 }}>{error}</p>
          <button onClick={()=>setError(null)} style={{ background:'none',border:'none',color:'#9ca3af',cursor:'pointer' }}><I.X/></button>
        </div>
      )}

      {/* Stages */}
      <AnimatePresence mode="wait">
        <motion.div key={stage} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:.2}}>
          {stage==='form'    && <FormStage onSubmit={handleFormSubmit}/>}
          {stage==='loading' && <LoadingStage/>}
          {stage==='results' && discoveryResult && (
            <ResultsStage result={discoveryResult} onSelect={handleTopicSelect}/>
          )}
          {stage==='chat'    && selectedTopic && formData && (
            <ChatStage topic={selectedTopic} formData={formData} onFinal={handleFinal}/>
          )}
          {stage==='final'   && finalTopic && formData && (
            <FinalStage topic={finalTopic.topic} description={finalTopic.description} field={formData.field} level={formData.degree_level}/>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
