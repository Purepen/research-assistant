'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import axios from 'axios'

/* ─── Icons ─────────────────────────────────────────────────────────────── */
const I = {
  Compass: ()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>,
  Arrow:   ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
  Back:    ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>,
  Check:   ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Spin:    ()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>,
  Send:    ()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Star:    ()=><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  X:       ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Brain:   ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.98-3 2.5 2.5 0 0 1-1.32-4.24 3 3 0 0 1 .34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.1-2.46Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.98-3 2.5 2.5 0 0 0 1.32-4.24 3 3 0 0 0-.34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.1-2.46Z"/></svg>,
  Flag:    ()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
  Chat:    ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  Rocket:  ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>,
  Search:  ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Data:    ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  Book:    ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  Link:    ()=><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  Proj:    ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  Help:    ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Down:    ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
}

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface FormData {
  degree_level:'BSc'|'MSc'|''; field:string; project_type:string
  preferred_activity:string[]; interest_areas:string[]
  geographic_focus:string; ambition_level:string; confidence_level:string
}
interface Topic { id:string; title:string; cluster:string; complexity:string; research_depth:string; implementation:string; suitability_score:number; suitability_reason:string; one_liner:string }
interface ScoutDataset { name:string; description:string; source:string; url:string; access:string }
interface ScoutPaper   { title:string; year:string; relevance:string; url:string }
interface ScoutTool    { name:string; description:string; url:string }
interface ScoutKeyAuthor { name:string; institution:string; contribution:string }
interface ScoutData {
  scout_type:string; datasets:ScoutDataset[]; papers:ScoutPaper[]
  tools:ScoutTool[]; key_authors:ScoutKeyAuthor[]
  availability_summary:string; data_verdict:string; advisor_context:string
}
interface SimilarProject { title:string; author:string; year:string; institution:string; level:string; similarity_score:number; similarity_reason:string; url:string; abstract_snippet:string }
interface ChatMsg { role:'user'|'ai'; content:string }
type Stage = 'form'|'loading'|'results'|'scouting'|'chat'|'final'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
function authHeaders() { return { Authorization:`Bearer ${localStorage.getItem('access_token')}` } }
const COMPLEXITY_COLORS: Record<string,string> = { Low:'#16a34a', Medium:'#d97706', High:'#dc2626' }
const COMPLEXITY_BGS:    Record<string,string> = { Low:'#f0fdf4',  Medium:'#fffbeb', High:'#fef2f2' }

/* ══════════════════════════════════════════════════════════════════════════
   renderMessage — parses plain-text advisor output into JSX
   Handles: Label: headers, numbered lists, >>>question<<< highlights
══════════════════════════════════════════════════════════════════════════ */
function renderMessage(text: string, isUser = false) {
  if (isUser) return <span style={{ fontSize:'.86rem', lineHeight:1.7 }}>{text}</span>

  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()
    if (!trimmed) { i++; continue }

    // >>>Critical question highlight<<<
    if (trimmed.startsWith('>>>') && trimmed.includes('<<<')) {
      const question = trimmed.replace(/^>>>/, '').replace(/<<<$/, '').trim()
      elements.push(
        <div key={i} style={{ margin:'14px 0', padding:'14px 16px', borderRadius:12, background:'#faf5ff', border:'2px solid #7c3aed', position:'relative' }}>
          <div style={{ position:'absolute', top:-10, left:12, background:'#7c3aed', color:'white', fontSize:'.62rem', fontWeight:800, padding:'2px 8px', borderRadius:999, letterSpacing:'.08em', textTransform:'uppercase' }}>Important Question</div>
          <p style={{ margin:0, fontSize:'.9rem', fontWeight:700, color:'#4c1d95', lineHeight:1.6 }}>{question}</p>
        </div>
      )
      i++; continue
    }

    // Numbered list block
    if (/^\d+\.\s/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s/, ''))
        i++
      }
      elements.push(
        <ol key={i} style={{ margin:'8px 0', paddingLeft:20, display:'flex', flexDirection:'column', gap:5 }}>
          {items.map((item, idx) => <li key={idx} style={{ fontSize:'.85rem', lineHeight:1.65, color:'#374151' }}>{item}</li>)}
        </ol>
      )
      continue
    }

    // Section label: "Label:" — a line that is just a label ending with colon
    if (/^[A-Z][A-Za-z\s]{2,50}:$/.test(trimmed)) {
      elements.push(
        <div key={i} style={{ fontWeight:700, color:'#0f1f0f', fontSize:'.83rem', marginTop:14, marginBottom:4, paddingTop:10, borderTop:'1px solid rgba(0,0,0,.07)' }}>
          {trimmed.replace(/:$/, '')}
        </div>
      )
      i++; continue
    }

    // Normal paragraph
    elements.push(<p key={i} style={{ margin:'0 0 7px', fontSize:'.86rem', lineHeight:1.7, color:'#374151' }}>{trimmed}</p>)
    i++
  }

  return <div>{elements}</div>
}

/* ─── Stage bar ──────────────────────────────────────────────────────────── */
function StageBar({ current }:{ current:number }) {
  const steps = [{n:1,label:'Profile',icon:I.Brain},{n:2,label:'Topics',icon:I.Compass},{n:3,label:'AI Chat',icon:I.Chat},{n:4,label:'Done',icon:I.Flag}]
  return (
    <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:28,position:'relative' }}>
      <div style={{ position:'absolute',top:15,left:'10%',right:'10%',height:2,background:'#e8ede8',zIndex:0 }}>
        <motion.div initial={{width:0}} animate={{width:`${((current-1)/3)*100}%`}} transition={{duration:.4}} style={{ height:'100%',background:'linear-gradient(90deg,#7c3aed,#16a34a)' }}/>
      </div>
      {steps.map(s=>{ const done=current>s.n, active=current===s.n; return (
        <div key={s.n} style={{ display:'flex',flexDirection:'column',alignItems:'center',zIndex:1,flex:1 }}>
          <div style={{ width:30,height:30,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',border:`2px solid ${done?'#16a34a':active?'#7c3aed':'#e8ede8'}`,background:done?'#16a34a':active?'#7c3aed':'white',color:done||active?'white':'#9ca3af',transition:'all .3s',boxShadow:active?'0 0 0 5px rgba(124,58,237,.12)':'none' }}>
            {done?<I.Check/>:<s.icon/>}
          </div>
          <p style={{ margin:'7px 0 0',fontSize:'.71rem',fontWeight:active?700:500,color:done?'#16a34a':active?'#7c3aed':'#9ca3af',textAlign:'center' }}>{s.label}</p>
        </div>
      )})}
    </div>
  )
}

/* ─── Form helpers ───────────────────────────────────────────────────────── */
function ChipSelect({ options,selected,onToggle,color='#7c3aed',bg='#faf5ff',border='#e9d5ff' }:
  { options:string[];selected:string[];onToggle:(v:string)=>void;color?:string;bg?:string;border?:string }) {
  return <div style={{ display:'flex',flexWrap:'wrap',gap:8 }}>
    {options.map(o=>{ const on=selected.includes(o); return <button key={o} onClick={()=>onToggle(o)} style={{ padding:'8px 14px',borderRadius:999,border:`1.5px solid ${on?border:'#e8ede8'}`,background:on?bg:'white',color:on?color:'#6b7280',fontSize:'.82rem',fontWeight:on?700:500,cursor:'pointer',transition:'all .15s' }}>{on&&'✓ '}{o}</button> })}
  </div>
}
function RadioCards({ options,selected,onSelect,color='#7c3aed',bg='#faf5ff',border='#e9d5ff' }:
  { options:{value:string;label:string;sub?:string}[];selected:string;onSelect:(v:string)=>void;color?:string;bg?:string;border?:string }) {
  return <div style={{ display:'grid',gridTemplateColumns:`repeat(${Math.min(options.length,4)},1fr)`,gap:10 }}>
    {options.map(o=>{ const on=selected===o.value; return <button key={o.value} onClick={()=>onSelect(o.value)} style={{ padding:'12px 14px',borderRadius:12,border:`2px solid ${on?border:'#e8ede8'}`,background:on?bg:'white',cursor:'pointer',transition:'all .15s',textAlign:'left' }}>
      <p style={{ margin:0,fontWeight:700,color:on?color:'#374151',fontSize:'.84rem' }}>{o.label}</p>
      {o.sub&&<p style={{ margin:'2px 0 0',fontSize:'.71rem',color:on?`${color}99`:'#9ca3af' }}>{o.sub}</p>}
    </button> })}
  </div>
}

/* ─── Form questions ─────────────────────────────────────────────────────── */
const QUESTIONS = [
  {id:'degree_level',label:'What is your degree level?',note:''},
  {id:'field',label:'What is your field or department?',note:'Be specific — e.g. "Computer Science — AI" or "Public Health"'},
  {id:'project_type',label:'What type of project do you need?',note:''},
  {id:'preferred_activity',label:'What kind of work do you enjoy most?',note:'Pick all that apply'},
  {id:'interest_areas',label:'Which areas interest you most?',note:'Pick as many as you like'},
  {id:'geographic_focus',label:'What is your geographic focus?',note:'Where should the research be relevant?'},
  {id:'ambition_level',label:'What is your ambition level for this project?',note:''},
  {id:'confidence_level',label:'How clear are you on your topic right now?',note:''},
]
const Q_OPTIONS: Record<string,any[]> = {
  degree_level:[{value:'BSc',label:"Bachelor's",sub:'Undergraduate'},{value:'MSc',label:"Master's",sub:'Postgraduate'}],
  project_type:[{value:'research-based',label:'Research-based',sub:'Literature & theory'},{value:'practical',label:'Practical',sub:'Build / implement'},{value:'mixed',label:'Mixed',sub:'Both'},{value:'not-sure',label:'Not sure',sub:'Let AI decide'}],
  preferred_activity:['Problem-solving','Building','Data Analysis','Studying People','Theory','Unsure'],
  interest_areas:['Technology','Business','Health','Education','Environment','Agriculture','Social Issues','Policy','Psychology','Engineering','Media','Open to anything'],
  geographic_focus:[{value:'university',label:'My University',sub:'Campus'},{value:'city',label:'City/Region',sub:'Urban'},{value:'country',label:'My Country',sub:'National'},{value:'africa',label:'Africa',sub:'Pan-African'},{value:'europe',label:'Europe',sub:'European'},{value:'global',label:'Global',sub:'Worldwide'},{value:'none',label:'No focus',sub:'Agnostic'}],
  ambition_level:[{value:'manageable',label:'Manageable',sub:'Safe, low stress'},{value:'impressive',label:'Impressive',sub:'Strong novel angle'},{value:'distinction',label:'Distinction',sub:'Top grade'},{value:'cv-strong',label:'CV-Strong',sub:'Industry-ready'}],
  confidence_level:[{value:'very-confused',label:'Very Confused',sub:'No idea'},{value:'somewhat-unsure',label:'Somewhat Unsure',sub:'Area known'},{value:'rough-direction',label:'Rough Direction',sub:'Need narrowing'},{value:'have-idea',label:'Have an Idea',sub:'Need validation'}],
}
const RADIO_IDS = ['degree_level','project_type','geographic_focus','ambition_level','confidence_level']

function FormStage({ onSubmit }:{ onSubmit:(d:FormData)=>void }) {
  const [q,setQ] = useState(0)
  const [form,setForm] = useState<FormData>({degree_level:'',field:'',project_type:'',preferred_activity:[],interest_areas:[],geographic_focus:'',ambition_level:'',confidence_level:''})
  const update = (k:keyof FormData,v:any) => setForm(p=>({...p,[k]:v}))
  const toggleArr = (k:'preferred_activity'|'interest_areas',v:string) => { const a=form[k] as string[]; update(k,a.includes(v)?a.filter(x=>x!==v):[...a,v]) }
  const canNext = () => { const v=form[QUESTIONS[q].id as keyof FormData]; return Array.isArray(v)?v.length>0:!!(v&&v!=='') }
  const isLast = q===QUESTIONS.length-1
  const next = () => { if(!canNext())return; if(isLast){onSubmit(form);return}; setQ(p=>p+1) }
  const renderQ = () => {
    const qid = QUESTIONS[q].id
    if(qid==='field') return <input value={form.field} onChange={e=>update('field',e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&canNext())next()}} placeholder="e.g. Computer Science, Public Health…" className="g-input" style={{ fontSize:'1rem',padding:'14px 16px' }}/>
    if(qid==='preferred_activity'||qid==='interest_areas') { const isInt=qid==='interest_areas'; return <ChipSelect options={Q_OPTIONS[qid] as string[]} selected={form[qid] as string[]} onToggle={v=>toggleArr(qid as any,v)} color={isInt?'#16a34a':'#7c3aed'} bg={isInt?'#f0fdf4':'#faf5ff'} border={isInt?'#bbf7d0':'#e9d5ff'}/> }
    const isGreen=['ambition_level','confidence_level'].includes(qid)
    return <RadioCards options={Q_OPTIONS[qid]} selected={form[qid as keyof FormData] as string} onSelect={v=>{update(qid as keyof FormData,v);if(RADIO_IDS.includes(qid))setTimeout(()=>next(),200)}} color={isGreen?'#16a34a':'#7c3aed'} bg={isGreen?'#f0fdf4':'#faf5ff'} border={isGreen?'#bbf7d0':'#e9d5ff'}/>
  }
  return (
    <div style={{ maxWidth:640,margin:'0 auto' }}>
      <div style={{ height:4,background:'#e8ede8',borderRadius:2,marginBottom:36,overflow:'hidden' }}>
        <motion.div initial={{width:0}} animate={{width:`${(q/QUESTIONS.length)*100}%`}} transition={{duration:.4}} style={{ height:'100%',background:'linear-gradient(90deg,#7c3aed,#a855f7)',borderRadius:2 }}/>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={q} initial={{opacity:0,x:30}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-30}} transition={{duration:.25}}>
          <p style={{ fontSize:'.72rem',fontWeight:700,color:'#9ca3af',marginBottom:6,textTransform:'uppercase',letterSpacing:'.1em' }}>Question {q+1} of {QUESTIONS.length}</p>
          <h2 style={{ fontSize:'clamp(1.1rem,2vw,1.4rem)',fontWeight:800,color:'#0f1f0f',fontFamily:'Fraunces,serif',margin:'0 0 6px',lineHeight:1.2 }}>{QUESTIONS[q].label}</h2>
          {QUESTIONS[q].note&&<p style={{ margin:'0 0 20px',fontSize:'.82rem',color:'#9ca3af' }}>{QUESTIONS[q].note}</p>}
          {!QUESTIONS[q].note&&<div style={{ height:20 }}/>}
          {renderQ()}
        </motion.div>
      </AnimatePresence>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:28 }}>
        <button onClick={()=>setQ(p=>Math.max(0,p-1))} disabled={q===0} className="g-btn-outline" style={{ opacity:q===0?.3:1,display:'flex',alignItems:'center',gap:6 }}><I.Back/> Back</button>
        {!RADIO_IDS.includes(QUESTIONS[q].id)&&<button onClick={next} disabled={!canNext()} className="g-btn" style={{ opacity:canNext()?1:.4 }}>{isLast?<><I.Brain/> Generate My Topics</>:<>Continue <I.Arrow/></>}</button>}
      </div>
    </div>
  )
}

/* ─── Loading / scouting screens ─────────────────────────────────────────── */
function LoadingStage() {
  const steps=['Analysing your profile…','Scanning your field…','Matching interests to gaps…','Ranking by suitability…','Grouping clusters…','Finalising list…']
  const [step,setStep]=useState(0)
  useEffect(()=>{ const t=setInterval(()=>setStep(p=>Math.min(p+1,steps.length-1)),1400); return()=>clearInterval(t) },[])
  return <div style={{ maxWidth:480,margin:'80px auto 0',textAlign:'center' }}>
    <style>{`@keyframes sp{to{transform:rotate(360deg)}} .sp{animation:sp 1s linear infinite;display:inline-block}`}</style>
    <div style={{ width:72,height:72,borderRadius:20,background:'linear-gradient(135deg,#7c3aed,#a855f7)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 24px',boxShadow:'0 8px 32px rgba(124,58,237,.3)' }}><div className="sp" style={{ color:'white' }}><I.Spin/></div></div>
    <h2 style={{ margin:'0 0 8px',fontWeight:800,color:'#0f1f0f',fontSize:'1.3rem',fontFamily:'Fraunces,serif' }}>Finding your best topics</h2>
    <p style={{ margin:'0 0 28px',fontSize:'.86rem',color:'#6b7280' }}>Our AI is personalising suggestions just for you</p>
    <div style={{ background:'white',border:'1px solid #e8ede8',borderRadius:14,padding:'20px',textAlign:'left' }}>
      {steps.map((s,i)=><div key={i} style={{ display:'flex',alignItems:'center',gap:10,padding:'7px 0',opacity:i>step?.25:1,transition:'opacity .4s' }}>
        <div style={{ width:20,height:20,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',background:i<step?'#16a34a':i===step?'#7c3aed':'#f3f4f6',transition:'all .3s' }}>
          {i<step&&<span style={{color:'white',fontSize:10}}><I.Check/></span>}
          {i===step&&<div className="sp" style={{color:'white',transform:'scale(.7)'}}><I.Spin/></div>}
        </div>
        <span style={{ fontSize:'.82rem',color:i===step?'#0f1f0f':i<step?'#16a34a':'#9ca3af',fontWeight:i===step?700:400 }}>{s}</span>
      </div>)}
    </div>
  </div>
}

function ScoutingStage({ topic, isLiterature }:{ topic:Topic; isLiterature:boolean }) {
  return <div style={{ maxWidth:480,margin:'80px auto 0',textAlign:'center' }}>
    <style>{`@keyframes sp{to{transform:rotate(360deg)}} .sp{animation:sp 1s linear infinite;display:inline-block}`}</style>
    <div style={{ width:72,height:72,borderRadius:20,background:'linear-gradient(135deg,#16a34a,#22c55e)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 24px',boxShadow:'0 8px 32px rgba(22,163,74,.25)' }}><div className="sp" style={{ color:'white' }}><I.Search/></div></div>
    <h2 style={{ margin:'0 0 8px',fontWeight:800,color:'#0f1f0f',fontSize:'1.2rem',fontFamily:'Fraunces,serif' }}>{isLiterature?'Scouting the literature…':'Searching for available data…'}</h2>
    <p style={{ margin:'0 0 20px',fontSize:'.86rem',color:'#6b7280',lineHeight:1.6 }}>Checking what exists for<br/><strong style={{ color:'#0f1f0f' }}>"{topic.title.length>60?topic.title.slice(0,60)+'…':topic.title}"</strong></p>
    <div style={{ background:'white',border:'1px solid #e8ede8',borderRadius:12,padding:'16px 20px',textAlign:'left' }}>
      {(isLiterature?['Searching for survey papers…','Finding seminal works…','Identifying key authors…','Looking up literature tools…']:['Searching Kaggle for datasets…','Checking HuggingFace and UCI…','Scanning GitHub repos…','Finding relevant papers…']).map((s,i)=>(
        <div key={i} style={{ display:'flex',alignItems:'center',gap:8,padding:'5px 0',color:'#6b7280',fontSize:'.81rem' }}>
          <div className="sp" style={{ transform:'scale(.6)',color:'#16a34a',flexShrink:0 }}><I.Spin/></div>{s}
        </div>
      ))}
    </div>
  </div>
}

/* ─── Results grid ───────────────────────────────────────────────────────── */
function ResultsStage({ result, onSelect }:{ result:{clusters:string[];topics:Topic[];prompt_note:string}; onSelect:(t:Topic)=>void }) {
  const [cluster,setCluster]=useState('All')
  const clusters=['All',...result.clusters]
  const filtered=cluster==='All'?result.topics:result.topics.filter(t=>t.cluster===cluster)
  return <div>
    <div style={{ background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'14px 16px',marginBottom:22,display:'flex',alignItems:'flex-start',gap:10 }}>
      <div style={{ color:'#7c3aed',flexShrink:0,marginTop:1 }}><I.Brain/></div>
      <p style={{ margin:0,fontSize:'.84rem',color:'#374151',lineHeight:1.6 }}>{result.prompt_note}</p>
    </div>
    <div style={{ display:'flex',gap:6,flexWrap:'wrap',marginBottom:22 }}>
      {clusters.map(c=><button key={c} onClick={()=>setCluster(c)} style={{ padding:'6px 14px',borderRadius:999,border:`1.5px solid ${cluster===c?'#7c3aed':'#e8ede8'}`,background:cluster===c?'#7c3aed':'white',color:cluster===c?'white':'#6b7280',fontSize:'.78rem',fontWeight:600,cursor:'pointer',transition:'all .15s' }}>{c}{c==='All'&&<span style={{ marginLeft:5,background:cluster===c?'rgba(255,255,255,.25)':'#f0fdf4',color:cluster===c?'white':'#16a34a',borderRadius:999,padding:'0 6px',fontSize:'.68rem',fontWeight:700 }}>{result.topics.length}</span>}</button>)}
    </div>
    <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14 }}>
      {filtered.map((topic,i)=>(
        <motion.div key={topic.id} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*.04}} onClick={()=>onSelect(topic)}
          style={{ background:'white',border:'1.5px solid #e8ede8',borderRadius:16,padding:'18px',cursor:'pointer',transition:'all .2s',boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}
          onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.borderColor='#c4b5fd';el.style.boxShadow='0 8px 24px rgba(124,58,237,.12)';el.style.transform='translateY(-2px)'}}
          onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.borderColor='#e8ede8';el.style.boxShadow='0 1px 3px rgba(0,0,0,.05)';el.style.transform='translateY(0)'}}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12 }}>
            <span style={{ display:'inline-flex',alignItems:'center',gap:4,padding:'3px 9px',borderRadius:999,background:'#faf5ff',border:'1px solid #e9d5ff',fontSize:'.7rem',fontWeight:700,color:'#7c3aed' }}><I.Star/> {topic.suitability_score}% match</span>
            <span style={{ fontSize:'.7rem',color:'#9ca3af',background:'#f9fafb',padding:'2px 8px',borderRadius:6 }}>{topic.cluster}</span>
          </div>
          <h3 style={{ margin:'0 0 6px',fontWeight:700,color:'#0f1f0f',fontSize:'.95rem',lineHeight:1.35 }}>{topic.title}</h3>
          <p style={{ margin:'0 0 12px',fontSize:'.8rem',color:'#6b7280',lineHeight:1.5 }}>{topic.one_liner}</p>
          <div style={{ display:'flex',gap:6,flexWrap:'wrap',marginBottom:12 }}>
            <span style={{ fontSize:'.68rem',fontWeight:700,color:COMPLEXITY_COLORS[topic.complexity],background:COMPLEXITY_BGS[topic.complexity],padding:'2px 8px',borderRadius:6 }}>{topic.complexity}</span>
            <span style={{ fontSize:'.68rem',color:'#6b7280',background:'#f3f4f6',padding:'2px 8px',borderRadius:6 }}>{topic.research_depth} depth</span>
            <span style={{ fontSize:'.68rem',color:'#6b7280',background:'#f3f4f6',padding:'2px 8px',borderRadius:6 }}>{topic.implementation}</span>
          </div>
          <p style={{ margin:0,fontSize:'.75rem',color:'#374151',lineHeight:1.5,paddingTop:10,borderTop:'1px solid #f3f4f6' }}>
            <strong style={{ color:'#16a34a' }}>Why this suits you: </strong>{topic.suitability_reason}
          </p>
        </motion.div>
      ))}
    </div>
  </div>
}

/* ─── Scout card with clickable links ────────────────────────────────────── */
function ScoutCard({ data, isLiterature }:{ data:ScoutData; isLiterature:boolean }) {
  const [expanded, setExpanded] = useState(false)
  const verdictColors: Record<string,string> = { GOOD:'#16a34a',RICH:'#16a34a',LIMITED:'#d97706',MODERATE:'#d97706',SCARCE:'#dc2626',SPARSE:'#dc2626' }
  const vc = verdictColors[data.data_verdict] || '#6b7280'

  return (
    <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:.4}}
      style={{ background:'#f0fdf4',border:'1.5px solid #bbf7d0',borderRadius:14,padding:'16px 18px',marginBottom:18 }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12 }}>
        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
          <div style={{ width:28,height:28,borderRadius:8,background:'#dcfce7',display:'flex',alignItems:'center',justifyContent:'center',color:'#16a34a' }}>
            {isLiterature?<I.Book/>:<I.Data/>}
          </div>
          <div>
            <p style={{ margin:0,fontSize:'.72rem',fontWeight:700,color:'#16a34a',textTransform:'uppercase',letterSpacing:'.07em' }}>
              {isLiterature?'Literature Found':'Resources Found'}
            </p>
            <p style={{ margin:0,fontSize:'.74rem',color:'#374151' }}>
              {isLiterature
                ? `${data.papers.length} papers · ${data.key_authors.length} key authors`
                : `${data.datasets.length} datasets · ${data.papers.length} papers · ${data.tools.length} tools`}
            </p>
          </div>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
          <span style={{ fontSize:'.7rem',fontWeight:700,color:vc,background:`${vc}18`,padding:'2px 9px',borderRadius:999,border:`1px solid ${vc}30` }}>{data.data_verdict}</span>
          <button onClick={()=>setExpanded(e=>!e)} style={{ background:'none',border:'none',cursor:'pointer',fontSize:'.72rem',color:'#16a34a',fontWeight:700 }}>{expanded?'Hide':'Show all'}</button>
        </div>
      </div>

      {/* Datasets with links */}
      {!isLiterature && data.datasets.length>0 && (
        <div style={{ marginBottom:10 }}>
          <p style={{ margin:'0 0 6px',fontSize:'.72rem',fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'.06em' }}>Datasets</p>
          {data.datasets.map((d,i)=>(
            <div key={i} style={{ display:'flex',alignItems:'flex-start',gap:8,padding:'7px 10px',background:'white',borderRadius:8,marginBottom:5,border:'1px solid #bbf7d0' }}>
              <span style={{ fontSize:'.75rem',fontWeight:700,color:'#16a34a',minWidth:20,lineHeight:'1.8' }}>{i+1}.</span>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ display:'flex',alignItems:'center',gap:6,flexWrap:'wrap' }}>
                  <span style={{ fontSize:'.8rem',fontWeight:700,color:'#0f1f0f' }}>{d.name}</span>
                  <span style={{ fontSize:'.68rem',color:'#9ca3af',background:'#f3f4f6',padding:'1px 6px',borderRadius:4 }}>{d.source}</span>
                  <span style={{ fontSize:'.68rem',color:d.access==='Free'?'#16a34a':'#d97706',fontWeight:600 }}>{d.access}</span>
                </div>
                <p style={{ margin:'2px 0 4px',fontSize:'.77rem',color:'#6b7280',lineHeight:1.5 }}>{d.description}</p>
                {d.url&&<a href={d.url} target="_blank" rel="noreferrer" style={{ display:'inline-flex',alignItems:'center',gap:4,fontSize:'.73rem',color:'#7c3aed',fontWeight:700,textDecoration:'none',padding:'2px 8px',background:'#faf5ff',borderRadius:6,border:'1px solid #e9d5ff' }}><I.Link/> View Dataset</a>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Papers with links */}
      {expanded && data.papers.length>0 && (
        <div style={{ marginBottom:10 }}>
          <p style={{ margin:'0 0 6px',fontSize:'.72rem',fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'.06em' }}>Key Papers</p>
          {data.papers.map((p,i)=>(
            <div key={i} style={{ display:'flex',alignItems:'flex-start',gap:8,padding:'7px 10px',background:'white',borderRadius:8,marginBottom:5,border:'1px solid #e5e7eb' }}>
              <span style={{ fontSize:'.75rem',fontWeight:700,color:'#6b7280',minWidth:20,lineHeight:'1.8' }}>{i+1}.</span>
              <div style={{ flex:1,minWidth:0 }}>
                <span style={{ fontSize:'.79rem',fontWeight:600,color:'#0f1f0f' }}>{p.title} ({p.year})</span>
                <p style={{ margin:'2px 0 4px',fontSize:'.75rem',color:'#6b7280' }}>{p.relevance}</p>
                {p.url&&<a href={p.url} target="_blank" rel="noreferrer" style={{ display:'inline-flex',alignItems:'center',gap:4,fontSize:'.72rem',color:'#2563eb',fontWeight:600,textDecoration:'none' }}><I.Link/> Open Paper</a>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Key authors (literature only) */}
      {expanded && data.key_authors.length>0 && (
        <div style={{ marginBottom:10 }}>
          <p style={{ margin:'0 0 6px',fontSize:'.72rem',fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'.06em' }}>Key Authors</p>
          {data.key_authors.map((a,i)=>(
            <div key={i} style={{ padding:'6px 10px',background:'white',borderRadius:8,marginBottom:5,border:'1px solid #e5e7eb' }}>
              <span style={{ fontSize:'.79rem',fontWeight:700,color:'#0f1f0f' }}>{a.name}</span>
              <span style={{ fontSize:'.72rem',color:'#6b7280' }}> · {a.institution}</span>
              <p style={{ margin:'2px 0 0',fontSize:'.75rem',color:'#6b7280' }}>{a.contribution}</p>
            </div>
          ))}
        </div>
      )}

      {data.availability_summary&&<p style={{ margin:'8px 0 0',fontSize:'.76rem',color:'#374151',lineHeight:1.6,fontStyle:'italic' }}>{data.availability_summary}</p>}
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   ChatStage — fixes 1,2,3,5,6 all applied here
══════════════════════════════════════════════════════════════════════════ */
function ChatStage({ topic, formData, scoutData, onFinal }:
  { topic:Topic; formData:FormData; scoutData:ScoutData|null; onFinal:(t:string,d:string)=>void }) {

  const [messages,setMessages]=useState<ChatMsg[]>([])
  const [input,setInput]=useState('')
  const [loading,setLoading]=useState(false)
  const [chatStage,setChatStage]=useState<'explain'|'questions'|'feasibility'|'final'>('explain')
  const [questionCount,setQuestionCount]=useState(0)
  const [helpClicked,setHelpClicked]=useState(false)
  const bottomRef=useRef<HTMLDivElement>(null)
  const initialized=useRef(false) // FIX 1: strict mode guard
  const isLiterature = formData.project_type==='research-based'

  const callAI = useCallback(async(stage: typeof chatStage, userMsg?:string)=>{
    setLoading(true)
    try {
      const conversation: {role:string;content:string}[] = []
      messages.forEach(m=>conversation.push({role:m.role==='user'?'user':'assistant',content:m.content}))
      const res = await axios.post(`${API}/topics/refine`,{
        topic_title:topic.title, topic_one_liner:topic.one_liner,
        field:formData.field, degree_level:formData.degree_level, ambition_level:formData.ambition_level,
        stage, student_message:userMsg||null, conversation,
        scout_context: stage==='explain' ? (scoutData?.advisor_context||null) : undefined,
      },{headers:authHeaders()})
      const data=res.data
      setMessages(p=>[...p,{role:'ai',content:data.ai_message}])
      if(data.is_final&&data.refined_topic) onFinal(data.refined_topic,data.refined_description||'')
    } catch { setMessages(p=>[...p,{role:'ai',content:"Hmm, something went sideways on my end. Try again?"}]) }
    finally { setLoading(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])

  useEffect(()=>{
    if(initialized.current)return // FIX 1
    initialized.current=true
    callAI('explain')
  },[callAI])

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}) },[messages])

  const sendMessage = async()=>{
    if(!input.trim()||loading)return
    const msg=input.trim(); setInput('')
    setMessages(p=>[...p,{role:'user',content:msg}])
    const newCount=questionCount+1; setQuestionCount(newCount)
    let nextStage: typeof chatStage='questions'
    if(chatStage==='explain'||chatStage==='questions'){ if(newCount>=4){nextStage='feasibility';setChatStage('feasibility')}else setChatStage('questions') }
    else if(chatStage==='feasibility'){ nextStage='final'; setChatStage('final') }
    else nextStage='final'
    await callAI(nextStage,msg)
  }

  return (
    <div style={{ maxWidth:720,margin:'0 auto' }}>
      {/* Scout card with clickable links */}
      {scoutData&&<ScoutCard data={scoutData} isLiterature={isLiterature}/>}

      {/* Topic header */}
      <div style={{ background:'#faf5ff',border:'1.5px solid #e9d5ff',borderRadius:14,padding:'12px 18px',marginBottom:14,display:'flex',alignItems:'flex-start',gap:10 }}>
        <div style={{ width:36,height:36,borderRadius:10,background:'#7c3aed',display:'flex',alignItems:'center',justifyContent:'center',color:'white',flexShrink:0 }}><I.Chat/></div>
        <div>
          <p style={{ margin:'0 0 2px',fontSize:'.7rem',fontWeight:700,color:'#7c3aed',textTransform:'uppercase',letterSpacing:'.08em' }}>AI Advisor · Exploring</p>
          <p style={{ margin:0,fontWeight:700,color:'#0f1f0f',fontSize:'.9rem',lineHeight:1.3 }}>{topic.title}</p>
        </div>
      </div>

      {/* Chat window */}
      <div style={{ background:'white',border:'1px solid #e8ede8',borderRadius:16,overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
        <div style={{ height:400,overflowY:'auto',padding:'18px' }}>
          {messages.map((m,i)=>(
            <div key={i} style={{ display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start',marginBottom:14 }}>
              {m.role==='ai'&&<div style={{ width:30,height:30,borderRadius:'50%',background:'#7c3aed',display:'flex',alignItems:'center',justifyContent:'center',color:'white',flexShrink:0,marginRight:10,marginTop:2 }}><I.Brain/></div>}
              <div style={{ maxWidth:'78%',padding:'12px 15px',borderRadius:m.role==='user'?'14px 14px 4px 14px':'14px 14px 14px 4px',background:m.role==='user'?'#7c3aed':'#f9fafb',border:m.role==='user'?'none':'1px solid #e8ede8',color:m.role==='user'?'white':'#374151',lineHeight:1.7 }}>
                {renderMessage(m.content,m.role==='user')}
              </div>
            </div>
          ))}
          {loading&&(
            <div style={{ display:'flex',gap:10,marginBottom:14 }}>
              <div style={{ width:30,height:30,borderRadius:'50%',background:'#7c3aed',display:'flex',alignItems:'center',justifyContent:'center',color:'white',flexShrink:0 }}><I.Brain/></div>
              <div style={{ padding:'12px 15px',borderRadius:'14px 14px 14px 4px',background:'#f9fafb',border:'1px solid #e8ede8',display:'flex',gap:5,alignItems:'center' }}>
                {[0,1,2].map(i=><motion.div key={i} animate={{y:[0,-6,0]}} transition={{duration:.6,repeat:Infinity,delay:i*.15}} style={{ width:7,height:7,borderRadius:'50%',background:'#7c3aed' }}/>)}
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {chatStage!=='final'&&(
          <div style={{ padding:'12px 14px',borderTop:'1px solid #f0f4f0',display:'flex',gap:8 }}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()}}} placeholder="Type your response here…" disabled={loading}
              style={{ flex:1,padding:'10px 14px',borderRadius:10,border:'1.5px solid #e8ede8',background:'#f9fafb',color:'#0f1f0f',fontSize:'.86rem',outline:'none',transition:'border-color .2s' }}
              onFocus={e=>(e.target as HTMLElement).style.borderColor='#7c3aed'} onBlur={e=>(e.target as HTMLElement).style.borderColor='#e8ede8'}/>
            <button onClick={sendMessage} disabled={loading||!input.trim()} style={{ width:42,height:42,borderRadius:11,background:input.trim()&&!loading?'#7c3aed':'#f3f4f6',border:'none',display:'flex',alignItems:'center',justifyContent:'center',color:input.trim()&&!loading?'white':'#9ca3af',cursor:input.trim()&&!loading?'pointer':'not-allowed',transition:'all .15s',flexShrink:0 }}><I.Send/></button>
          </div>
        )}
      </div>

      {/* FIX 6: "Seek Professional Help" button at bottom of every chat */}
      <div style={{ marginTop:12,display:'flex',alignItems:'center',justifyContent:'space-between' }}>
        <p style={{ margin:0,fontSize:'.73rem',color:'#9ca3af' }}>
          {chatStage==='explain'?'Your advisor is sizing up the topic…':chatStage==='questions'?`Feasibility check · ~${questionCount}/4 questions`:chatStage==='feasibility'?'Assessing your situation…':'Writing your final topic…'}
        </p>
        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
          {helpClicked&&<motion.span initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} style={{ fontSize:'.78rem',color:'#9ca3af',fontStyle:'italic' }}>dropping son</motion.span>}
          <button onClick={()=>setHelpClicked(true)}
            style={{ display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:8,border:'1.5px solid #e8ede8',background:'white',color:'#6b7280',fontSize:'.76rem',fontWeight:600,cursor:'pointer',transition:'all .15s' }}
            onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.borderColor='#fecaca';el.style.color='#dc2626';el.style.background='#fef2f2'}}
            onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.borderColor='#e8ede8';el.style.color='#6b7280';el.style.background='white'}}>
            <I.Help/> Seek Professional Help
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Final stage with project finder ────────────────────────────────────── */
function FinalStage({ topic, description, field, level, degree }:
  { topic:string; description:string; field:string; level:string; degree:string }) {
  const router=useRouter()
  const [findingProjects,setFindingProjects]=useState(false)
  const [projects,setProjects]=useState<SimilarProject[]|null>(null)
  const [searchNote,setSearchNote]=useState('')
  const [projectError,setProjectError]=useState('')

  const handleFindProjects = async()=>{
    setFindingProjects(true); setProjectError('')
    try {
      const res=await axios.post(`${API}/topics/find-projects`,{topic_title:topic,field,degree_level:degree},{headers:authHeaders()})
      setProjects(res.data.projects||[])
      setSearchNote(res.data.search_note||'')
    } catch(e:any) {
      setProjectError(e.response?.data?.detail||'Search failed. Please try again.')
    } finally { setFindingProjects(false) }
  }

  const handleUseThis = ()=>{
    sessionStorage.setItem('prefill_topic',topic)
    sessionStorage.setItem('prefill_field',field)
    sessionStorage.setItem('prefill_level',degree)
    if(projects&&projects.length>0) sessionStorage.setItem('prefill_similar_projects',JSON.stringify(projects))
    router.push('/dashboard/generate')
  }

  return (
    <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:.5}} style={{ maxWidth:680,margin:'0 auto' }}>
      <div style={{ textAlign:'center',marginBottom:24 }}>
        <div style={{ width:80,height:80,borderRadius:22,background:'linear-gradient(135deg,#16a34a,#22c55e)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',boxShadow:'0 8px 32px rgba(22,163,74,.25)',color:'white' }}><I.Flag/></div>
        <h2 style={{ margin:'0 0 6px',fontWeight:800,color:'#0f1f0f',fontFamily:'Fraunces,serif',fontSize:'1.5rem' }}>Your Topic is Ready! 🎉</h2>
        <p style={{ margin:0,fontSize:'.88rem',color:'#6b7280' }}>Finalised and feasibility-checked by your AI advisor.</p>
      </div>

      {/* Final topic card */}
      <div style={{ background:'white',border:'1.5px solid #bbf7d0',borderRadius:18,padding:'22px',marginBottom:16,boxShadow:'0 4px 20px rgba(22,163,74,.08)' }}>
        <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:12 }}>
          <span style={{ padding:'3px 10px',borderRadius:999,background:'#f0fdf4',border:'1px solid #bbf7d0',fontSize:'.72rem',fontWeight:700,color:'#16a34a' }}>✓ Finalised</span>
          <span style={{ fontSize:'.72rem',color:'#9ca3af' }}>{degree} · {field}</span>
        </div>
        <h3 style={{ margin:'0 0 12px',fontWeight:800,color:'#0f1f0f',fontSize:'1.05rem',fontFamily:'Fraunces,serif',lineHeight:1.3 }}>{topic}</h3>
        {description&&<div style={{ fontSize:'.84rem',color:'#374151',lineHeight:1.75 }}>{renderMessage(description)}</div>}
      </div>

      {/* Find Similar Projects card */}
      <div style={{ background:'white',border:'1.5px solid #e8ede8',borderRadius:16,padding:'18px',marginBottom:16 }}>
        <div style={{ display:'flex',alignItems:'flex-start',gap:12,marginBottom:projects!==null?14:0 }}>
          <div style={{ width:38,height:38,borderRadius:10,background:'#eff6ff',display:'flex',alignItems:'center',justifyContent:'center',color:'#2563eb',flexShrink:0 }}><I.Proj/></div>
          <div style={{ flex:1 }}>
            <p style={{ margin:'0 0 3px',fontWeight:700,color:'#0f1f0f',fontSize:'.9rem' }}>Find Similar Projects</p>
            <p style={{ margin:'0 0 12px',fontSize:'.8rem',color:'#6b7280',lineHeight:1.55 }}>
              Our AI will search and find 2 real student projects similar to your topic. You can use these as reference material in your spec generation.
            </p>
            {projects===null&&!findingProjects&&(
              <button onClick={handleFindProjects} className="g-btn-outline"
                style={{ display:'inline-flex',alignItems:'center',gap:6,fontSize:'.82rem',borderColor:'#bfdbfe',color:'#2563eb' }}>
                <I.Search/> Search for Similar Projects
              </button>
            )}
            {findingProjects&&(
              <div style={{ display:'flex',alignItems:'center',gap:8,color:'#6b7280',fontSize:'.82rem' }}>
                <style>{`@keyframes sp{to{transform:rotate(360deg)}} .sp{animation:sp 1s linear infinite;display:inline-block}`}</style>
                <div className="sp" style={{ color:'#2563eb' }}><I.Spin/></div>
                Searching theses, dissertations, and project repositories…
              </div>
            )}
            {projectError&&<p style={{ margin:0,fontSize:'.8rem',color:'#dc2626' }}>{projectError}</p>}
          </div>
        </div>

        {/* Found projects */}
        {projects!==null&&(
          <div>
            {searchNote&&<p style={{ margin:'0 0 10px',fontSize:'.75rem',color:'#9ca3af',fontStyle:'italic' }}>{searchNote}</p>}
            {projects.length===0
              ? <div style={{ padding:'14px',background:'#f9fafb',borderRadius:10,textAlign:'center' }}>
                  <p style={{ margin:0,fontSize:'.82rem',color:'#9ca3af' }}>No similar projects found publicly. You can still proceed — just skip the past projects step in the generator.</p>
                </div>
              : <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
                  {projects.map((p,i)=>(
                    <div key={i} style={{ background:'#f9fafb',border:'1px solid #e8ede8',borderRadius:12,padding:'14px 16px' }}>
                      <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,marginBottom:6 }}>
                        <div style={{ flex:1 }}>
                          <p style={{ margin:'0 0 3px',fontWeight:700,color:'#0f1f0f',fontSize:'.86rem',lineHeight:1.3 }}>{p.title}</p>
                          <p style={{ margin:0,fontSize:'.74rem',color:'#9ca3af' }}>{p.author!=='Unknown'?`${p.author} · `:''}{p.institution} · {p.level} · {p.year}</p>
                        </div>
                        <span style={{ flexShrink:0,fontSize:'.7rem',fontWeight:700,color:'#16a34a',background:'#f0fdf4',padding:'3px 9px',borderRadius:999,border:'1px solid #bbf7d0' }}>{p.similarity_score}% match</span>
                      </div>
                      {p.abstract_snippet&&<p style={{ margin:'0 0 8px',fontSize:'.77rem',color:'#6b7280',lineHeight:1.55,display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden' }}>{p.abstract_snippet}</p>}
                      <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                        <p style={{ margin:0,fontSize:'.74rem',color:'#374151',flex:1 }}>{p.similarity_reason}</p>
                        <a href={p.url} target="_blank" rel="noreferrer"
                          style={{ display:'inline-flex',alignItems:'center',gap:4,padding:'4px 10px',borderRadius:8,background:'#eff6ff',border:'1px solid #bfdbfe',color:'#2563eb',fontSize:'.74rem',fontWeight:700,textDecoration:'none',flexShrink:0 }}>
                          <I.Down/> View Project
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
        <button onClick={handleUseThis} className="g-btn" style={{ width:'100%',justifyContent:'center',fontSize:'.95rem',padding:'14px',boxShadow:'0 4px 20px rgba(22,163,74,.3)' }}>
          <I.Rocket/> Use This Topic → Generate My Spec
        </button>
        <button onClick={()=>window.location.reload()} className="g-btn-outline" style={{ width:'100%',justifyContent:'center',fontSize:'.86rem' }}>
          Start Over · Find a Different Topic
        </button>
      </div>
      {projects&&projects.length>0&&<p style={{ textAlign:'center',marginTop:10,fontSize:'.74rem',color:'#9ca3af' }}>The {projects.length} found project{projects.length>1?'s':''} will be pre-loaded in the spec generator as reference material.</p>}
    </motion.div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════════════════════ */
export default function TopicsPage() {
  const router=useRouter()
  const [stage,setStage]=useState<Stage>('form')
  const [formData,setFormData]=useState<FormData|null>(null)
  const [discoveryResult,setDiscoveryResult]=useState<{clusters:string[];topics:Topic[];prompt_note:string}|null>(null)
  const [selectedTopic,setSelectedTopic]=useState<Topic|null>(null)
  const [scoutData,setScoutData]=useState<ScoutData|null>(null)
  const [finalTopic,setFinalTopic]=useState<{topic:string;description:string}|null>(null)
  const [error,setError]=useState<string|null>(null)

  const stageNum = stage==='form'?1:stage==='loading'?1:stage==='results'?2:(stage==='scouting'||stage==='chat')?3:4
  const isLiterature = formData?.project_type==='research-based'

  const handleFormSubmit = async(data:FormData)=>{
    setFormData(data); setStage('loading'); setError(null)
    try {
      const res=await axios.post(`${API}/topics/discover`,{...data},{headers:authHeaders()})
      setDiscoveryResult(res.data); setStage('results')
    } catch(e:any) { setError(e.response?.data?.detail||'Failed to generate topics.'); setStage('form') }
  }

  const handleTopicSelect = async(topic:Topic)=>{
    setSelectedTopic(topic); setStage('scouting'); setScoutData(null)
    try {
      const res=await axios.post(`${API}/topics/scout`,{
        topic_title:topic.title, field:formData?.field||'',
        degree_level:formData?.degree_level||'', project_type:formData?.project_type||'mixed',
      },{headers:authHeaders()})
      setScoutData(res.data)
    } catch { setScoutData(null) }
    setStage('chat')
  }

  const handleFinal=(topic:string,desc:string)=>{
    setFinalTopic({topic,description:desc})
    setTimeout(()=>setStage('final'),1200)
  }

  return (
    <div style={{ maxWidth:1100,margin:'0 auto' }}>
      <div style={{ display:'flex',alignItems:'flex-start',marginBottom:28,flexWrap:'wrap',gap:14 }}>
        <div>
          <button onClick={()=>router.push('/dashboard')} style={{ display:'inline-flex',alignItems:'center',gap:6,background:'none',border:'none',color:'#9ca3af',cursor:'pointer',fontSize:'.8rem',fontWeight:600,padding:'0 0 10px',transition:'color .15s' }} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color='#7c3aed'} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color='#9ca3af'}>
            <I.Back/> Back to Dashboard
          </button>
          <div style={{ display:'flex',alignItems:'center',gap:12 }}>
            <div style={{ width:44,height:44,borderRadius:13,background:'linear-gradient(135deg,#7c3aed,#a855f7)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',boxShadow:'0 4px 16px rgba(124,58,237,.3)' }}><I.Compass/></div>
            <div>
              <h1 style={{ margin:0,fontSize:'clamp(1.3rem,2vw,1.7rem)',fontWeight:800,color:'#0f1f0f',fontFamily:'Fraunces,serif',lineHeight:1.1 }}>Topic Discovery Engine</h1>
              <p style={{ margin:0,fontSize:'.82rem',color:'#6b7280' }}>Profile → topics → data scout → AI advisor → similar projects → spec ready</p>
            </div>
          </div>
        </div>
      </div>

      {stage!=='loading'&&stage!=='scouting'&&<StageBar current={stageNum}/>}

      {error&&<div style={{ background:'#fef2f2',border:'1.5px solid #fecaca',borderRadius:12,padding:'12px 16px',marginBottom:20,display:'flex',alignItems:'center',gap:10 }}>
        <div style={{ color:'#dc2626' }}><I.X/></div>
        <p style={{ margin:0,fontSize:'.84rem',color:'#dc2626',flex:1 }}>{error}</p>
        <button onClick={()=>setError(null)} style={{ background:'none',border:'none',cursor:'pointer',color:'#9ca3af' }}><I.X/></button>
      </div>}

      <AnimatePresence mode="wait">
        <motion.div key={stage} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:.2}}>
          {stage==='form'     &&<FormStage onSubmit={handleFormSubmit}/>}
          {stage==='loading'  &&<LoadingStage/>}
          {stage==='results'  &&discoveryResult&&<ResultsStage result={discoveryResult} onSelect={handleTopicSelect}/>}
          {stage==='scouting' &&selectedTopic&&<ScoutingStage topic={selectedTopic} isLiterature={isLiterature||false}/>}
          {stage==='chat'     &&selectedTopic&&formData&&<ChatStage topic={selectedTopic} formData={formData} scoutData={scoutData} onFinal={handleFinal}/>}
          {stage==='final'    &&finalTopic&&formData&&<FinalStage topic={finalTopic.topic} description={finalTopic.description} field={formData.field} level={formData.ambition_level} degree={formData.degree_level}/>}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
