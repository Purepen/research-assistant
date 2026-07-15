'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import axios from 'axios'

/* ─── Icons ──────────────────────────────────────────────────────────────── */
const I = {
  Back:    ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>,
  Brain:   ()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.66"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.66"/></svg>,
  Compass: ()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>,
  Chat:    ()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  Flag:    ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
  Check:   ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  X:       ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Spin:    ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>,
  Send:    ()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Data:    ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  Book:    ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  Link:    ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  Proj:    ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  Help:    ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Down:    ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Flask:   ()=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 3h6m-6 0v6l-4 9a1 1 0 0 0 .9 1.5h12.2a1 1 0 0 0 .9-1.5L15 9V3M9 3H6m3 0h6"/></svg>,
  FlaskSm: ()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 3h6m-6 0v6l-4 9a1 1 0 0 0 .9 1.5h12.2a1 1 0 0 0 .9-1.5L15 9V3M9 3H6m3 0h6"/></svg>,
  Rocket:  ()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>,
  Swap:    ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 16V4m0 0L3 8m4-4 4 4"/><path d="M17 8v12m0 0 4-4m-4 4-4-4"/></svg>,
  Info:    ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
}

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface FormData {
  degree_level: 'BSc'|'MSc'|''
  field: string
  project_type: string
  preferred_activity: string[]
  interest_areas: string[]
  geographic_focus: string
  ambition_level: string
  confidence_level: string
}

interface VetInput {
  original_topic: string
  field: string
  degree_level: 'BSc'|'MSc'|''
  project_type: string
  ambition_level: string
  geographic_focus: string
}

interface VetResult {
  verdict: 'STRONG'|'REFINED'|'PIVOTED'
  your_take: string
  strengths: string[]
  concerns: string[]
  original_title: string
  refined_title: string
  refined_rationale: string
  one_liner: string
  closing: string
  ai_message: string
}

interface Topic {
  id: string; title: string; cluster: string; complexity: string
  research_depth: string; implementation: string; suitability_score: number
  suitability_reason: string; one_liner: string
}
interface ScoutDataset   { name:string; description:string; source:string; url:string; access:string }
interface ScoutPaper     { title:string; year:string; relevance:string; url:string }
interface ScoutTool      { name:string; description:string; url:string }
interface ScoutKeyAuthor { name:string; institution:string; contribution:string }
interface ScoutData {
  scout_type:string; datasets:ScoutDataset[]; papers:ScoutPaper[]
  tools:ScoutTool[]; key_authors:ScoutKeyAuthor[]
  availability_summary:string; data_verdict:string; advisor_context:string
}
interface SimilarProject {
  title:string; author:string; year:string; institution:string; level:string
  similarity_score:number; similarity_reason:string; url:string; abstract_snippet:string
}
interface ChatMsg { role:'user'|'ai'; content:string }

type Stage = 'gateway'|'vet'|'vet-loading'|'vet-result'|'form'|'loading'|'results'|'scouting'|'chat'|'final'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const authHeaders = ()=>({ Authorization:`Bearer ${localStorage.getItem('access_token')}` })

function extractError(e: any, fallback: string): string {
  const detail = e?.response?.data?.detail
  if (!detail) return fallback
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((d: any) => {
      const loc = Array.isArray(d.loc) ? d.loc.filter((l: any) => l !== 'body').join(' → ') : ''
      return loc ? `${loc}: ${d.msg}` : d.msg
    }).join('; ')
  }
  if (typeof detail === 'object') return JSON.stringify(detail)
  return fallback
}
const COMPLEXITY_COLORS: Record<string,string> = { Low:'#16a34a', Medium:'#d97706', High:'#dc2626' }
const COMPLEXITY_BGS:    Record<string,string> = { Low:'#f0fdf4', Medium:'#fffbeb', High:'#fef2f2' }

/* ══════════════════════════════════════════════════════════════════════════
   renderMessage — parses plain-text advisor output into JSX
══════════════════════════════════════════════════════════════════════════ */
function renderMessage(text: string, isUser = false) {
  if (isUser) return <span style={{ fontSize:'.86rem', lineHeight:1.7 }}>{text}</span>
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]; const trimmed = line.trim()
    if (!trimmed) { i++; continue }
    if (trimmed.startsWith('>>>') && trimmed.includes('<<<')) {
      const q = trimmed.replace(/^>>>/, '').replace(/<<<$/, '').trim()
      elements.push(
        <div key={i} style={{ margin:'14px 0',padding:'14px 16px',borderRadius:12,background:'#faf5ff',border:'2px solid #7c3aed',position:'relative' }}>
          <div style={{ position:'absolute',top:-10,left:12,background:'#7c3aed',color:'white',fontSize:'.62rem',fontWeight:800,padding:'2px 8px',borderRadius:999,letterSpacing:'.08em',textTransform:'uppercase' }}>Important Question</div>
          <p style={{ margin:0,fontSize:'.9rem',fontWeight:700,color:'#4c1d95',lineHeight:1.6 }}>{q}</p>
        </div>
      ); i++; continue
    }
    if (/^\d+\.\s/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s/, '')); i++
      }
      elements.push(
        <ol key={i} style={{ margin:'8px 0',paddingLeft:20,display:'flex',flexDirection:'column',gap:5 }}>
          {items.map((item,idx)=><li key={idx} style={{ fontSize:'.85rem',lineHeight:1.65,color:'#374151' }}>{item}</li>)}
        </ol>
      ); continue
    }
    if (/^[A-Z][A-Za-z\s]{2,50}:$/.test(trimmed)) {
      elements.push(
        <div key={i} style={{ fontWeight:700,color:'#0f1f0f',fontSize:'.83rem',marginTop:14,marginBottom:4,paddingTop:10,borderTop:'1px solid rgba(0,0,0,.07)' }}>
          {trimmed.replace(/:$/, '')}
        </div>
      ); i++; continue
    }
    elements.push(<p key={i} style={{ margin:'0 0 7px',fontSize:'.86rem',lineHeight:1.7,color:'#374151' }}>{trimmed}</p>)
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
        <motion.div initial={{width:0}} animate={{width:`${((current-1)/3)*100}%`}} transition={{duration:.4}}
          style={{ height:'100%',background:'linear-gradient(90deg,#7c3aed,#16a34a)' }}/>
      </div>
      {steps.map(s=>{ const done=current>s.n, active=current===s.n; return (
        <div key={s.n} style={{ display:'flex',flexDirection:'column',alignItems:'center',zIndex:1,flex:1 }}>
          <div style={{ width:30,height:30,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
            border:`2px solid ${done?'#16a34a':active?'#7c3aed':'#e8ede8'}`,
            background:done?'#16a34a':active?'#7c3aed':'white',
            color:done||active?'white':'#9ca3af',transition:'all .3s',
            boxShadow:active?'0 0 0 5px rgba(124,58,237,.12)':'none' }}>
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
  return (
    <div style={{ display:'flex',flexWrap:'wrap',gap:8 }}>
      {options.map(o=>{ const on=selected.includes(o); return (
        <button key={o} onClick={()=>onToggle(o)}
          style={{ padding:'8px 14px',borderRadius:999,border:`1.5px solid ${on?border:'#e8ede8'}`,background:on?bg:'white',color:on?color:'#6b7280',fontSize:'.82rem',fontWeight:on?700:500,cursor:'pointer',transition:'all .15s' }}>
          {on&&'✓ '}{o}
        </button>
      )})}
    </div>
  )
}

function RadioCards({ options,selected,onSelect,color='#7c3aed',bg='#faf5ff',border='#e9d5ff' }:
  { options:{value:string;label:string;sub?:string}[];selected:string;onSelect:(v:string)=>void;color?:string;bg?:string;border?:string }) {
  return (
    <div style={{ display:'grid',gridTemplateColumns:`repeat(${Math.min(options.length,4)},1fr)`,gap:10 }}>
      {options.map(o=>{ const on=selected===o.value; return (
        <button key={o.value} onClick={()=>onSelect(o.value)}
          style={{ padding:'12px 14px',borderRadius:12,border:`2px solid ${on?border:'#e8ede8'}`,background:on?bg:'white',cursor:'pointer',transition:'all .15s',textAlign:'left' }}>
          <p style={{ margin:0,fontWeight:700,color:on?color:'#374151',fontSize:'.84rem' }}>{o.label}</p>
          {o.sub&&<p style={{ margin:'2px 0 0',fontSize:'.71rem',color:on?`${color}99`:'#9ca3af' }}>{o.sub}</p>}
        </button>
      )})}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   GATEWAY STAGE
══════════════════════════════════════════════════════════════════════════ */
function GatewayStage({ onHaveTopic, onNeedHelp }:{ onHaveTopic:()=>void; onNeedHelp:()=>void }) {
  return (
    <div style={{ maxWidth:640,margin:'0 auto',textAlign:'center',paddingTop:20 }}>
      <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:.4}}>
        <div style={{ width:64,height:64,borderRadius:18,background:'linear-gradient(135deg,#7c3aed,#a855f7)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',margin:'0 auto 24px',boxShadow:'0 8px 24px rgba(124,58,237,.3)' }}>
          <I.Flask/>
        </div>
        <h2 style={{ margin:'0 0 10px',fontSize:'clamp(1.4rem,2.5vw,1.9rem)',fontWeight:800,color:'#0f1f0f',fontFamily:'Fraunces,serif' }}>
          Welcome to Topic Lab
        </h2>
        <p style={{ margin:'0 0 40px',fontSize:'.92rem',color:'#6b7280',lineHeight:1.7,maxWidth:480,marginLeft:'auto',marginRight:'auto' }}>
          Do you already have a research topic in mind, or are you starting from scratch?
        </p>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,maxWidth:540,margin:'0 auto' }}>
          <motion.button whileHover={{ y:-3,boxShadow:'0 12px 28px rgba(124,58,237,.2)' }} onClick={onHaveTopic}
            style={{ padding:'28px 20px',borderRadius:18,border:'2px solid #e9d5ff',background:'#faf5ff',cursor:'pointer',transition:'all .2s',textAlign:'left',display:'flex',flexDirection:'column',gap:12 }}>
            <div style={{ width:44,height:44,borderRadius:12,background:'#ede9fe',display:'flex',alignItems:'center',justifyContent:'center',color:'#7c3aed' }}><I.FlaskSm/></div>
            <div>
              <p style={{ margin:'0 0 5px',fontWeight:800,color:'#0f1f0f',fontSize:'1rem' }}>I have a topic</p>
              <p style={{ margin:0,fontSize:'.78rem',color:'#6b7280',lineHeight:1.55 }}>Let AI vet your idea, score it, and suggest a stronger refined version.</p>
            </div>
            <div style={{ display:'flex',gap:5,flexWrap:'wrap',marginTop:4 }}>
              {['Vet it','Refine it','Validate it'].map(t=>(
                <span key={t} style={{ fontSize:'.66rem',fontWeight:700,color:'#7c3aed',background:'#ede9fe',padding:'2px 8px',borderRadius:999 }}>{t}</span>
              ))}
            </div>
          </motion.button>

          <motion.button whileHover={{ y:-3,boxShadow:'0 12px 28px rgba(22,163,74,.2)' }} onClick={onNeedHelp}
            style={{ padding:'28px 20px',borderRadius:18,border:'2px solid #bbf7d0',background:'#f0fdf4',cursor:'pointer',transition:'all .2s',textAlign:'left',display:'flex',flexDirection:'column',gap:12 }}>
            <div style={{ width:44,height:44,borderRadius:12,background:'#dcfce7',display:'flex',alignItems:'center',justifyContent:'center',color:'#16a34a' }}><I.Brain/></div>
            <div>
              <p style={{ margin:'0 0 5px',fontWeight:800,color:'#0f1f0f',fontSize:'1rem' }}>Help me find one</p>
              <p style={{ margin:0,fontSize:'.78rem',color:'#6b7280',lineHeight:1.55 }}>Answer 8 quick questions and AI generates 10–15 personalised, ranked topics.</p>
            </div>
            <div style={{ display:'flex',gap:5,flexWrap:'wrap',marginTop:4 }}>
              {['Discover','Ranked','Personalised'].map(t=>(
                <span key={t} style={{ fontSize:'.66rem',fontWeight:700,color:'#16a34a',background:'#dcfce7',padding:'2px 8px',borderRadius:999 }}>{t}</span>
              ))}
            </div>
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   VET STAGE
══════════════════════════════════════════════════════════════════════════ */
function VetStage({ onSubmit, onBack }:{ onSubmit:(v:VetInput)=>void; onBack:()=>void }) {
  const [form, setForm] = useState<VetInput>({ original_topic:'', field:'', degree_level:'', project_type:'', ambition_level:'', geographic_focus:'none' })
  const update = (k:keyof VetInput, v:string) => setForm(p=>({...p,[k]:v}))
  const canSubmit = !!(form.original_topic.trim() && form.field.trim() && form.degree_level && form.project_type && form.ambition_level)

  const degreeOpts = [{value:'BSc',label:"Bachelor's",sub:'Undergraduate'},{value:'MSc',label:"Master's",sub:'Postgraduate'}]
  const typeOpts   = [{value:'research-based',label:'Research-based',sub:'Literature & theory'},{value:'practical',label:'Practical',sub:'Build / implement'},{value:'mixed',label:'Mixed',sub:'Both'},{value:'not-sure',label:'Not sure',sub:'Let AI decide'}]
  const ambOpts    = [{value:'manageable',label:'Manageable',sub:'Safe, low stress'},{value:'impressive',label:'Impressive',sub:'Strong novel angle'},{value:'distinction',label:'Distinction',sub:'Top grade'},{value:'cv-strong',label:'CV-Strong',sub:'Industry-ready'}]

  return (
    <div style={{ maxWidth:640,margin:'0 auto' }}>
      <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:.35}}>
        <button onClick={onBack} style={{ display:'inline-flex',alignItems:'center',gap:5,background:'none',border:'none',color:'#9ca3af',cursor:'pointer',fontSize:'.78rem',fontWeight:600,padding:'0 0 20px',transition:'color .15s' }}
          onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color='#7c3aed'}
          onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color='#9ca3af'}>
          <I.Back/> Back
        </button>

        <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:24 }}>
          <div style={{ width:44,height:44,borderRadius:12,background:'#ede9fe',display:'flex',alignItems:'center',justifyContent:'center',color:'#7c3aed',flexShrink:0 }}><I.FlaskSm/></div>
          <div>
            <h2 style={{ margin:0,fontSize:'1.3rem',fontWeight:800,color:'#0f1f0f',fontFamily:'Fraunces,serif' }}>Vet My Topic</h2>
            <p style={{ margin:0,fontSize:'.8rem',color:'#9ca3af' }}>Tell us your idea and we'll give you an honest AI assessment.</p>
          </div>
        </div>

        <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
          <div>
            <label style={{ display:'block',fontSize:'.84rem',fontWeight:700,color:'#374151',marginBottom:6 }}>
              Your research topic <span style={{ color:'#dc2626' }}>*</span>
            </label>
            <textarea value={form.original_topic} onChange={e=>update('original_topic',e.target.value)}
              placeholder="e.g. Machine Learning for Early Detection of Diabetes Using Wearable Sensor Data"
              rows={3} style={{ width:'100%',padding:'11px 13px',border:'1.5px solid #e8ede8',borderRadius:11,fontSize:'.88rem',color:'#0f1f0f',outline:'none',resize:'vertical',lineHeight:1.6,transition:'border .2s',boxSizing:'border-box' }}
              onFocus={e=>(e.target as HTMLElement).style.borderColor='#7c3aed'}
              onBlur={e=>(e.target as HTMLElement).style.borderColor='#e8ede8'}/>
            <p style={{ margin:'4px 0 0',fontSize:'.73rem',color:'#9ca3af' }}>Be as specific as possible — a rough title works perfectly.</p>
          </div>

          <div>
            <label style={{ display:'block',fontSize:'.84rem',fontWeight:700,color:'#374151',marginBottom:6 }}>
              Your field / department <span style={{ color:'#dc2626' }}>*</span>
            </label>
            <input value={form.field} onChange={e=>update('field',e.target.value)}
              placeholder="e.g. Computer Science, Public Health, Biomedical Engineering…"
              style={{ width:'100%',padding:'10px 13px',border:'1.5px solid #e8ede8',borderRadius:11,fontSize:'.87rem',color:'#0f1f0f',outline:'none',transition:'border .2s',boxSizing:'border-box' }}
              onFocus={e=>(e.target as HTMLElement).style.borderColor='#7c3aed'}
              onBlur={e=>(e.target as HTMLElement).style.borderColor='#e8ede8'}/>
          </div>

          <div>
            <label style={{ display:'block',fontSize:'.84rem',fontWeight:700,color:'#374151',marginBottom:8 }}>
              Degree level <span style={{ color:'#dc2626' }}>*</span>
            </label>
            <RadioCards options={degreeOpts} selected={form.degree_level} onSelect={v=>update('degree_level',v as 'BSc'|'MSc')}/>
          </div>

          <div>
            <label style={{ display:'block',fontSize:'.84rem',fontWeight:700,color:'#374151',marginBottom:8 }}>
              Project type <span style={{ color:'#dc2626' }}>*</span>
            </label>
            <RadioCards options={typeOpts} selected={form.project_type} onSelect={v=>update('project_type',v)}/>
          </div>

          <div>
            <label style={{ display:'block',fontSize:'.84rem',fontWeight:700,color:'#374151',marginBottom:8 }}>
              Ambition level <span style={{ color:'#dc2626' }}>*</span>
            </label>
            <RadioCards options={ambOpts} selected={form.ambition_level} onSelect={v=>update('ambition_level',v)}
              color='#16a34a' bg='#f0fdf4' border='#bbf7d0'/>
          </div>

          <button onClick={()=>canSubmit&&onSubmit(form)} disabled={!canSubmit}
            style={{ padding:'14px',borderRadius:12,background:canSubmit?'#7c3aed':'#e8ede8',color:canSubmit?'white':'#9ca3af',border:'none',cursor:canSubmit?'pointer':'not-allowed',fontWeight:700,fontSize:'.92rem',transition:'all .2s',boxShadow:canSubmit?'0 4px 16px rgba(124,58,237,.3)':'none' }}>
            Vet My Topic →
          </button>
        </div>
      </motion.div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   VET LOADING STAGE
══════════════════════════════════════════════════════════════════════════ */
function VetLoadingStage({ topic }:{ topic:string }) {
  return (
    <div style={{ maxWidth:540,margin:'0 auto',textAlign:'center',padding:'60px 0' }}>
      <div style={{ width:52,height:52,borderRadius:14,background:'#ede9fe',display:'flex',alignItems:'center',justifyContent:'center',color:'#7c3aed',margin:'0 auto 20px' }}>
        <span className="sp"><I.FlaskSm/></span>
      </div>
      <h2 style={{ margin:'0 0 8px',fontWeight:800,color:'#0f1f0f',fontFamily:'Fraunces,serif',fontSize:'1.3rem' }}>Vetting your topic…</h2>
      <p style={{ margin:'0 0 24px',fontSize:'.86rem',color:'#6b7280',lineHeight:1.6 }}>
        Evaluating <strong style={{ color:'#0f1f0f' }}>"{topic.length>55?topic.slice(0,55)+'…':topic}"</strong>
      </p>
      <div style={{ background:'white',border:'1px solid #e8ede8',borderRadius:12,padding:'16px 20px',textAlign:'left' }}>
        {['Checking scope and clarity…','Assessing feasibility for your level…','Identifying strengths and gaps…','Crafting a refined alternative…'].map((s,i)=>(
          <div key={i} style={{ display:'flex',alignItems:'center',gap:8,padding:'5px 0',color:'#6b7280',fontSize:'.81rem' }}>
            <span className="sp" style={{ transform:'scale(.6)',color:'#7c3aed',flexShrink:0 }}><I.Spin/></span>
            {s}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   VET RESULT STAGE
══════════════════════════════════════════════════════════════════════════ */
function VetResultStage({ result, onChoose, onBack }:
  { result:VetResult; onChoose:(chosenTitle:string,origin:'vetted'|'provided')=>void; onBack:()=>void }) {

  const verdictConfig = ({
    STRONG:  { color:'#16a34a', bg:'#f0fdf4', border:'#bbf7d0', label:'Strong ✓', sub:'Your topic is well-scoped and ready to go.' },
    REFINED: { color:'#d97706', bg:'#fffbeb', border:'#fde68a', label:'Refined ↑', sub:'Good bones — a tighter version is suggested below.' },
    PIVOTED: { color:'#7c3aed', bg:'#faf5ff', border:'#e9d5ff', label:'Pivoted ↗', sub:'We found a stronger direction while keeping your core interest.' },
  } as Record<string,{color:string;bg:string;border:string;label:string;sub:string}>)[result.verdict] || { color:'#9ca3af', bg:'#f9fafb', border:'#e8ede8', label:result.verdict, sub:'' }

  const showRefined = result.verdict !== 'STRONG' && !!result.refined_title && result.refined_title !== result.original_title

  return (
    <div style={{ maxWidth:680,margin:'0 auto' }}>
      <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:.4}}>
        <button onClick={onBack} style={{ display:'inline-flex',alignItems:'center',gap:5,background:'none',border:'none',color:'#9ca3af',cursor:'pointer',fontSize:'.78rem',fontWeight:600,padding:'0 0 20px',transition:'color .15s' }}
          onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color='#7c3aed'}
          onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color='#9ca3af'}>
          <I.Back/> Back
        </button>

        <div style={{ display:'flex',alignItems:'center',gap:12,padding:'16px 20px',background:verdictConfig.bg,border:`1.5px solid ${verdictConfig.border}`,borderRadius:14,marginBottom:20 }}>
          <span style={{ fontSize:'1.05rem',fontWeight:800,color:verdictConfig.color,fontFamily:'Fraunces,serif',flexShrink:0 }}>{verdictConfig.label}</span>
          <p style={{ margin:0,fontSize:'.84rem',color:'#374151',lineHeight:1.5 }}>{verdictConfig.sub}</p>
        </div>

        <div style={{ background:'white',border:'1.5px solid #e8ede8',borderRadius:14,padding:'20px',marginBottom:16 }}>
          <p style={{ margin:'0 0 14px',fontSize:'.72rem',fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'.09em' }}>AI Assessment</p>
          <p style={{ margin:'0 0 16px',fontSize:'.9rem',color:'#374151',lineHeight:1.7,fontStyle:'italic' }}>&ldquo;{result.your_take}&rdquo;</p>

          {result.strengths.length>0&&(
            <div style={{ marginBottom:14 }}>
              <p style={{ margin:'0 0 8px',fontSize:'.76rem',fontWeight:700,color:'#16a34a',textTransform:'uppercase',letterSpacing:'.07em' }}>What's Working</p>
              {result.strengths.map((s,i)=>(
                <div key={i} style={{ display:'flex',gap:8,marginBottom:5 }}>
                  <span style={{ color:'#16a34a',flexShrink:0,marginTop:2 }}><I.Check/></span>
                  <p style={{ margin:0,fontSize:'.83rem',color:'#374151',lineHeight:1.55 }}>{s}</p>
                </div>
              ))}
            </div>
          )}

          {result.concerns.length>0&&(
            <div>
              <p style={{ margin:'0 0 8px',fontSize:'.76rem',fontWeight:700,color:'#d97706',textTransform:'uppercase',letterSpacing:'.07em' }}>What Needs Attention</p>
              {result.concerns.map((c,i)=>(
                <div key={i} style={{ display:'flex',gap:8,marginBottom:5 }}>
                  <span style={{ color:'#d97706',flexShrink:0,marginTop:2 }}>→</span>
                  <p style={{ margin:0,fontSize:'.83rem',color:'#374151',lineHeight:1.55 }}>{c}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display:'grid',gridTemplateColumns:showRefined?'1fr 1fr':'1fr',gap:12,marginBottom:16 }}>
          <div style={{ background:'white',border:'1.5px solid #e8ede8',borderRadius:14,padding:'18px' }}>
            <p style={{ margin:'0 0 8px',fontSize:'.7rem',fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'.09em' }}>
              {showRefined?'Original':'Your Title'}
            </p>
            <p style={{ margin:'0 0 14px',fontWeight:700,color:'#0f1f0f',fontSize:'.9rem',lineHeight:1.4 }}>{result.original_title}</p>
            <button onClick={()=>onChoose(result.original_title,'provided')}
              style={{ width:'100%',padding:'9px',borderRadius:9,border:'1.5px solid #e8ede8',background:'white',color:'#374151',fontSize:'.82rem',fontWeight:600,cursor:'pointer',transition:'all .15s' }}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor='#9ca3af';(e.currentTarget as HTMLElement).style.background='#f9fafb'}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor='#e8ede8';(e.currentTarget as HTMLElement).style.background='white'}}>
              {showRefined?'Use Original':'Proceed →'}
            </button>
          </div>

          {showRefined&&(
            <div style={{ background:'#faf5ff',border:'2px solid #7c3aed',borderRadius:14,padding:'18px',position:'relative' }}>
              <div style={{ position:'absolute',top:-11,left:14,background:'#7c3aed',color:'white',fontSize:'.62rem',fontWeight:800,padding:'3px 10px',borderRadius:999,letterSpacing:'.06em' }}>RECOMMENDED</div>
              <p style={{ margin:'0 0 8px',fontSize:'.7rem',fontWeight:700,color:'#7c3aed',textTransform:'uppercase',letterSpacing:'.09em' }}>Refined Version</p>
              <p style={{ margin:'0 0 8px',fontWeight:800,color:'#0f1f0f',fontSize:'.9rem',lineHeight:1.4 }}>{result.refined_title}</p>
              {result.refined_rationale&&<p style={{ margin:'0 0 14px',fontSize:'.75rem',color:'#6b7280',lineHeight:1.55 }}>{result.refined_rationale}</p>}
              <button onClick={()=>onChoose(result.refined_title,'vetted')}
                style={{ width:'100%',padding:'9px',borderRadius:9,border:'none',background:'#7c3aed',color:'white',fontSize:'.82rem',fontWeight:700,cursor:'pointer',transition:'all .15s',boxShadow:'0 3px 10px rgba(124,58,237,.3)' }}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='#6d28d9'}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='#7c3aed'}>
                Use Refined Version
              </button>
            </div>
          )}
        </div>

        {result.one_liner&&(
          <div style={{ background:'#f9fafb',border:'1px solid #e8ede8',borderRadius:12,padding:'12px 16px',marginBottom:10 }}>
            <p style={{ margin:'0 0 3px',fontSize:'.7rem',fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'.08em' }}>Project in one line</p>
            <p style={{ margin:0,fontSize:'.84rem',color:'#374151',lineHeight:1.6,fontStyle:'italic' }}>{result.one_liner}</p>
          </div>
        )}
        {result.closing&&<p style={{ margin:0,fontSize:'.81rem',color:'#9ca3af',textAlign:'center',lineHeight:1.6,paddingTop:6 }}>{result.closing}</p>}
      </motion.div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   FORM STAGE (discovery path — unchanged)
══════════════════════════════════════════════════════════════════════════ */
const QUESTIONS = [
  {id:'degree_level',      label:'What is your degree level?',note:''},
  {id:'field',             label:'What is your field or department?',note:'Be specific — e.g. "Computer Science — AI" or "Public Health"'},
  {id:'project_type',      label:'What type of project do you need?',note:''},
  {id:'preferred_activity',label:'What kind of work do you enjoy most?',note:'Pick all that apply'},
  {id:'interest_areas',    label:'Which areas interest you most?',note:'Pick as many as you like'},
  {id:'geographic_focus',  label:'What is your geographic focus?',note:'Where should the research be relevant?'},
  {id:'ambition_level',    label:'What is your ambition level for this project?',note:''},
  {id:'confidence_level',  label:'How clear are you on your topic right now?',note:''},
]
const Q_OPTIONS: Record<string,any[]> = {
  degree_level:       [{value:'BSc',label:"Bachelor's",sub:'Undergraduate'},{value:'MSc',label:"Master's",sub:'Postgraduate'}],
  project_type:       [{value:'research-based',label:'Research-based',sub:'Literature & theory'},{value:'practical',label:'Practical',sub:'Build / implement'},{value:'mixed',label:'Mixed',sub:'Both'},{value:'not-sure',label:'Not sure',sub:'Let AI decide'}],
  preferred_activity: ['Problem-solving','Building','Data Analysis','Studying People','Theory','Unsure'],
  interest_areas:     ['Technology','Business','Health','Education','Environment','Agriculture','Social Issues','Policy','Psychology','Engineering','Media','Open to anything'],
  geographic_focus:   [{value:'university',label:'My University',sub:'Campus'},{value:'city',label:'City/Region',sub:'Urban'},{value:'country',label:'My Country',sub:'National'},{value:'nigeria',label:'🇳🇬 Nigeria',sub:'Nigerian'},{value:'africa',label:'Africa',sub:'Pan-African'},{value:'europe',label:'Europe',sub:'European'},{value:'global',label:'Global',sub:'Worldwide'},{value:'none',label:'No focus',sub:'Agnostic'}],
  ambition_level:     [{value:'manageable',label:'Manageable',sub:'Safe, low stress'},{value:'impressive',label:'Impressive',sub:'Strong novel angle'},{value:'distinction',label:'Distinction',sub:'Top grade'},{value:'cv-strong',label:'CV-Strong',sub:'Industry-ready'}],
  confidence_level:   [{value:'very-confused',label:'Very Confused',sub:'No idea'},{value:'somewhat-unsure',label:'Somewhat Unsure',sub:'Area known'},{value:'rough-direction',label:'Rough Direction',sub:'Need narrowing'},{value:'have-idea',label:'Have an Idea',sub:'Need validation'}],
}
const RADIO_IDS = ['degree_level','project_type','geographic_focus','ambition_level','confidence_level']

function FormStage({ onSubmit }:{ onSubmit:(d:FormData)=>void }) {
  const [q,setQ]         = useState(0)
  const [form,setForm]   = useState<FormData>({degree_level:'',field:'',project_type:'',preferred_activity:[],interest_areas:[],geographic_focus:'',ambition_level:'',confidence_level:''})
  const [customGeo,setCustomGeo] = useState('')
  const update   = (k:keyof FormData,v:any) => setForm(p=>({...p,[k]:v}))
  const toggleArr= (k:'preferred_activity'|'interest_areas',v:string) => { const a=form[k] as string[]; update(k,a.includes(v)?a.filter(x=>x!==v):[...a,v]) }
  const canNext  = () => { const v=form[QUESTIONS[q].id as keyof FormData]; return Array.isArray(v)?v.length>0:!!(v&&v!=='') }
  const isLast   = q===QUESTIONS.length-1
  const next     = () => { if(!canNext())return; if(isLast){onSubmit(form);return}; setQ(p=>p+1) }

  const PREDEFINED_GEO = ['university','city','country','nigeria','africa','europe','global','none']
  const geoIsCustom = !!form.geographic_focus && !PREDEFINED_GEO.includes(form.geographic_focus)

  const renderQ  = () => {
    const qid=QUESTIONS[q].id
    if(qid==='field') return <input value={form.field} onChange={e=>update('field',e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&canNext())next()}} placeholder="e.g. Computer Science, Public Health…" className="g-input" style={{ fontSize:'1rem',padding:'14px 16px' }}/>
    if(qid==='preferred_activity'||qid==='interest_areas'){ const isInt=qid==='interest_areas'; return <ChipSelect options={Q_OPTIONS[qid] as string[]} selected={form[qid] as string[]} onToggle={v=>toggleArr(qid as any,v)} color={isInt?'#16a34a':'#7c3aed'} bg={isInt?'#f0fdf4':'#faf5ff'} border={isInt?'#bbf7d0':'#e9d5ff'}/> }
    if(qid==='geographic_focus') return (
      <div>
        <RadioCards
          options={Q_OPTIONS.geographic_focus}
          selected={geoIsCustom ? '' : form.geographic_focus}
          onSelect={v=>{ setCustomGeo(''); update('geographic_focus',v); setTimeout(()=>next(),200) }}
          color='#7c3aed' bg='#faf5ff' border='#e9d5ff'/>
        <div style={{ marginTop:14 }}>
          <p style={{ margin:'0 0 8px',fontSize:'.78rem',fontWeight:600,color:'#6b7280' }}>Or type your specific location:</p>
          <input
            value={customGeo}
            onChange={e=>{
              const val = e.target.value
              setCustomGeo(val)
              update('geographic_focus', val.trim() || '')
            }}
            onKeyDown={e=>{if(e.key==='Enter'&&canNext())next()}}
            placeholder="e.g. Lagos, South Africa, Kenya…"
            style={{ width:'100%',padding:'10px 13px',border:`1.5px solid ${geoIsCustom?'#7c3aed':'#e8ede8'}`,borderRadius:10,fontSize:'.87rem',color:'#0f1f0f',outline:'none',transition:'border .2s',boxSizing:'border-box' }}
            onFocus={e=>(e.target as HTMLElement).style.borderColor='#7c3aed'}
            onBlur={e=>(e.target as HTMLElement).style.borderColor=geoIsCustom?'#7c3aed':'#e8ede8'}/>
          {geoIsCustom&&<p style={{ margin:'4px 0 0',fontSize:'.72rem',color:'#7c3aed',fontWeight:600 }}>✓ Using: {form.geographic_focus}</p>}
        </div>
      </div>
    )
    const isGreen=['ambition_level','confidence_level'].includes(qid)
    return <RadioCards options={Q_OPTIONS[qid]} selected={form[qid as keyof FormData] as string} onSelect={v=>{update(qid as keyof FormData,v);if(RADIO_IDS.includes(qid))setTimeout(()=>next(),200)}} color={isGreen?'#16a34a':'#7c3aed'} bg={isGreen?'#f0fdf4':'#faf5ff'} border={isGreen?'#bbf7d0':'#e9d5ff'}/>
  }
  return (
    <div style={{ maxWidth:640,margin:'0 auto' }}>
      <div style={{ height:4,background:'#e8ede8',borderRadius:2,marginBottom:36,overflow:'hidden' }}>
        <motion.div initial={{width:0}} animate={{width:`${(q/QUESTIONS.length)*100}%`}} transition={{duration:.4}}
          style={{ height:'100%',background:'linear-gradient(90deg,#7c3aed,#a855f7)',borderRadius:2 }}/>
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
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:32 }}>
        <button onClick={()=>setQ(p=>Math.max(0,p-1))} disabled={q===0}
          style={{ display:'inline-flex',alignItems:'center',gap:5,background:'none',border:'none',color:q===0?'#d1d5db':'#6b7280',cursor:q===0?'default':'pointer',fontWeight:600,fontSize:'.82rem',padding:'8px 12px',borderRadius:8,transition:'all .15s' }}>
          <I.Back/> Back
        </button>
        <button onClick={next} disabled={!canNext()}
          style={{ padding:'10px 24px',borderRadius:10,background:canNext()?'#7c3aed':'#e8ede8',color:canNext()?'white':'#9ca3af',border:'none',cursor:canNext()?'pointer':'not-allowed',fontWeight:700,fontSize:'.84rem',transition:'all .2s' }}>
          {isLast?'Generate Topics →':'Next →'}
        </button>
      </div>
    </div>
  )
}

/* ─── Loading stage ──────────────────────────────────────────────────────── */
function LoadingStage() {
  return (
    <div style={{ maxWidth:540,margin:'0 auto',textAlign:'center',padding:'60px 0' }}>
      <div style={{ width:52,height:52,borderRadius:14,background:'#f0fdf4',display:'flex',alignItems:'center',justifyContent:'center',color:'#16a34a',margin:'0 auto 20px' }}>
        <span className="sp"><I.Brain/></span>
      </div>
      <h2 style={{ margin:'0 0 8px',fontWeight:800,color:'#0f1f0f',fontFamily:'Fraunces,serif',fontSize:'1.3rem' }}>Generating your topics…</h2>
      <p style={{ margin:'0 0 24px',fontSize:'.86rem',color:'#6b7280',lineHeight:1.6 }}>Finding personalised topics based on your profile.</p>
      <div style={{ background:'white',border:'1px solid #e8ede8',borderRadius:12,padding:'16px 20px',textAlign:'left' }}>
        {['Analysing your research interests…','Scanning academic databases…','Scoring topic suitability…','Clustering by theme…'].map((s,i)=>(
          <div key={i} style={{ display:'flex',alignItems:'center',gap:8,padding:'5px 0',color:'#6b7280',fontSize:'.81rem' }}>
            <span className="sp" style={{ transform:'scale(.6)',color:'#16a34a',flexShrink:0 }}><I.Spin/></span>{s}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Results grid ───────────────────────────────────────────────────────── */
function ResultsStage({ result, onSelect }:{ result:{clusters:string[];topics:Topic[];prompt_note:string}; onSelect:(t:Topic)=>void }) {
  const [cluster,setCluster] = useState('All')
  const clusters = ['All',...result.clusters]
  const filtered = cluster==='All'?result.topics:result.topics.filter(t=>t.cluster===cluster)
  return (
    <div>
      <div style={{ background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'14px 16px',marginBottom:22,display:'flex',alignItems:'flex-start',gap:10 }}>
        <div style={{ color:'#7c3aed',flexShrink:0,marginTop:1 }}><I.Brain/></div>
        <p style={{ margin:0,fontSize:'.84rem',color:'#374151',lineHeight:1.6 }}>{result.prompt_note}</p>
      </div>
      <div style={{ display:'flex',gap:6,flexWrap:'wrap',marginBottom:22 }}>
        {clusters.map(c=>(
          <button key={c} onClick={()=>setCluster(c)}
            style={{ padding:'6px 14px',borderRadius:999,border:`1.5px solid ${cluster===c?'#7c3aed':'#e8ede8'}`,background:cluster===c?'#7c3aed':'white',color:cluster===c?'white':'#6b7280',fontSize:'.78rem',fontWeight:600,cursor:'pointer',transition:'all .15s' }}>
            {c}
            {c==='All'&&(
              <span style={{ marginLeft:5,background:cluster===c?'rgba(255,255,255,.25)':'#f0fdf4',color:cluster===c?'white':'#16a34a',borderRadius:999,padding:'1px 7px',fontSize:'.68rem',fontWeight:700 }}>
                {result.topics.length}
              </span>
            )}
          </button>
        ))}
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:14 }}>
        {filtered.map((t,i)=>(
          <motion.div key={t.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*.04}}
            onClick={()=>onSelect(t)}
            style={{ background:'white',border:'1.5px solid #e8ede8',borderRadius:14,padding:'18px 20px',cursor:'pointer',transition:'all .2s' }}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor='rgba(124,58,237,.3)';(e.currentTarget as HTMLElement).style.boxShadow='0 8px 24px rgba(0,0,0,.08)';(e.currentTarget as HTMLElement).style.transform='translateY(-2px)'}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor='#e8ede8';(e.currentTarget as HTMLElement).style.boxShadow='none';(e.currentTarget as HTMLElement).style.transform='none'}}>
            <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:10,marginBottom:10 }}>
              <span style={{ fontSize:'.7rem',fontWeight:700,color:'#7c3aed',background:'#faf5ff',padding:'2px 9px',borderRadius:999,border:'1px solid #e9d5ff' }}>{t.cluster}</span>
              <span style={{ fontSize:'1.05rem',fontWeight:800,color:t.suitability_score>=80?'#16a34a':t.suitability_score>=60?'#d97706':'#dc2626',fontFamily:'Fraunces,serif',flexShrink:0 }}>{t.suitability_score}</span>
            </div>
            <h3 style={{ margin:'0 0 6px',fontWeight:700,color:'#0f1f0f',fontSize:'.9rem',lineHeight:1.35 }}>{t.title}</h3>
            <p style={{ margin:'0 0 12px',fontSize:'.77rem',color:'#6b7280',lineHeight:1.55 }}>{t.one_liner}</p>
            <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
              {([
                {label:t.complexity,     colors:COMPLEXITY_COLORS,                                                           bgs:COMPLEXITY_BGS},
                {label:t.research_depth, colors:{Light:'#2563eb',Moderate:'#d97706',Deep:'#dc2626'},                        bgs:{Light:'#eff6ff',Moderate:'#fffbeb',Deep:'#fef2f2'}},
                {label:t.implementation, colors:{Theoretical:'#7c3aed',Mixed:'#16a34a','Hands-on':'#0891b2'},               bgs:{Theoretical:'#faf5ff',Mixed:'#f0fdf4','Hands-on':'#ecfeff'}},
              ] as any[]).map(({label,colors,bgs})=>(
                <span key={label} style={{ fontSize:'.68rem',fontWeight:600,color:colors[label]||'#9ca3af',background:bgs[label]||'#f9fafb',padding:'2px 8px',borderRadius:999 }}>{label}</span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* ─── Scouting stage ─────────────────────────────────────────────────────── */
function ScoutingStage({ topic, isLiterature }:{ topic:Topic; isLiterature:boolean }) {
  return (
    <div style={{ maxWidth:540,margin:'0 auto',textAlign:'center',padding:'60px 0' }}>
      <div style={{ width:52,height:52,borderRadius:14,background:'#f0fdf4',display:'flex',alignItems:'center',justifyContent:'center',color:'#16a34a',margin:'0 auto 20px' }}>
        <span className="sp">{isLiterature?<I.Book/>:<I.Data/>}</span>
      </div>
      <h2 style={{ margin:'0 0 8px',fontWeight:800,color:'#0f1f0f',fontFamily:'Fraunces,serif',fontSize:'1.3rem' }}>
        {isLiterature?'Scouting the literature…':'Searching for available data…'}
      </h2>
      <p style={{ margin:'0 0 20px',fontSize:'.86rem',color:'#6b7280',lineHeight:1.6 }}>
        Checking what exists for<br/><strong style={{ color:'#0f1f0f' }}>"{topic.title.length>60?topic.title.slice(0,60)+'…':topic.title}"</strong>
      </p>
      <div style={{ background:'white',border:'1px solid #e8ede8',borderRadius:12,padding:'16px 20px',textAlign:'left' }}>
        {(isLiterature
          ? ['Searching for survey papers…','Finding seminal works…','Identifying key authors…','Looking up literature tools…']
          : ['Searching Kaggle for datasets…','Checking HuggingFace and UCI…','Scanning GitHub repos…','Finding relevant papers…']
        ).map((s,i)=>(
          <div key={i} style={{ display:'flex',alignItems:'center',gap:8,padding:'5px 0',color:'#6b7280',fontSize:'.81rem' }}>
            <span className="sp" style={{ transform:'scale(.6)',color:'#16a34a',flexShrink:0 }}><I.Spin/></span>{s}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Scout card ─────────────────────────────────────────────────────────── */
function ScoutCard({ data, isLiterature }:{ data:ScoutData; isLiterature:boolean }) {
  const [expanded,setExpanded] = useState(false)
  const verdictColors: Record<string,string> = { GOOD:'#16a34a',RICH:'#16a34a',LIMITED:'#d97706',MODERATE:'#d97706',SCARCE:'#dc2626',SPARSE:'#dc2626' }
  const vc = verdictColors[data.data_verdict]||'#6b7280'
  return (
    <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:.4}}
      style={{ background:'#f0fdf4',border:'1.5px solid #bbf7d0',borderRadius:14,padding:'16px 18px',marginBottom:18 }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12 }}>
        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
          <div style={{ width:28,height:28,borderRadius:8,background:'#dcfce7',display:'flex',alignItems:'center',justifyContent:'center',color:'#16a34a' }}>
            {isLiterature?<I.Book/>:<I.Data/>}
          </div>
          <div>
            <p style={{ margin:0,fontSize:'.72rem',fontWeight:700,color:'#16a34a',textTransform:'uppercase',letterSpacing:'.07em' }}>{isLiterature?'Literature Found':'Resources Found'}</p>
            <p style={{ margin:0,fontSize:'.74rem',color:'#374151' }}>
              {isLiterature?`${data.papers.length} papers · ${data.key_authors.length} key authors`:`${data.datasets.length} datasets · ${data.papers.length} papers · ${data.tools.length} tools`}
            </p>
          </div>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
          <span style={{ fontSize:'.7rem',fontWeight:700,color:vc,background:`${vc}18`,padding:'2px 9px',borderRadius:999,border:`1px solid ${vc}30` }}>{data.data_verdict}</span>
          <button onClick={()=>setExpanded(e=>!e)} style={{ background:'none',border:'none',cursor:'pointer',fontSize:'.72rem',color:'#16a34a',fontWeight:700 }}>{expanded?'Hide ↑':'Show details ↓'}</button>
        </div>
      </div>

      {expanded&&(
        <div>
          {!isLiterature&&data.datasets.length>0&&(
            <div style={{ marginBottom:10 }}>
              <p style={{ margin:'0 0 6px',fontSize:'.72rem',fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'.06em' }}>Datasets</p>
              {data.datasets.map((d,i)=>(
                <div key={i} style={{ padding:'8px 10px',background:'white',borderRadius:8,marginBottom:5,border:'1px solid #e5e7eb' }}>
                  <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8 }}>
                    <div style={{ flex:1 }}>
                      <span style={{ fontSize:'.79rem',fontWeight:700,color:'#0f1f0f' }}>{d.name}</span>
                      <span style={{ fontSize:'.68rem',color:'#9ca3af',marginLeft:6 }}>{d.source}</span>
                      <p style={{ margin:'2px 0 4px',fontSize:'.75rem',color:'#6b7280' }}>{d.description}</p>
                      {d.url&&<a href={d.url} target="_blank" rel="noreferrer" style={{ display:'inline-flex',alignItems:'center',gap:4,fontSize:'.72rem',color:'#2563eb',fontWeight:600,textDecoration:'none' }}><I.Link/> Open Dataset</a>}
                    </div>
                    <span style={{ fontSize:'.65rem',fontWeight:600,color:d.access==='Free'?'#16a34a':'#d97706',background:d.access==='Free'?'#f0fdf4':'#fffbeb',padding:'2px 7px',borderRadius:999,flexShrink:0 }}>{d.access}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {data.papers.length>0&&(
            <div style={{ marginBottom:10 }}>
              <p style={{ margin:'0 0 6px',fontSize:'.72rem',fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'.06em' }}>{isLiterature?'Key Papers':'Related Papers'}</p>
              {data.papers.map((p,i)=>(
                <div key={i} style={{ padding:'6px 10px',background:'white',borderRadius:8,marginBottom:5,border:'1px solid #e5e7eb' }}>
                  <span style={{ fontSize:'.79rem',fontWeight:600,color:'#0f1f0f' }}>{p.title} ({p.year})</span>
                  <p style={{ margin:'2px 0 4px',fontSize:'.75rem',color:'#6b7280' }}>{p.relevance}</p>
                  {p.url&&<a href={p.url} target="_blank" rel="noreferrer" style={{ display:'inline-flex',alignItems:'center',gap:4,fontSize:'.72rem',color:'#2563eb',fontWeight:600,textDecoration:'none' }}><I.Link/> Open Paper</a>}
                </div>
              ))}
            </div>
          )}
          {data.key_authors.length>0&&(
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
        </div>
      )}
    </motion.div>
  )
}

/* ─── Chat stage ─────────────────────────────────────────────────────────── */
function ChatStage({ topic, formData, scoutData, onFinal, onChangeTopic }:
  { topic:Topic; formData:FormData; scoutData:ScoutData|null; onFinal:(t:string,d:string)=>void; onChangeTopic:()=>void }) {
  const [messages,setMessages]           = useState<ChatMsg[]>([])
  const [input,setInput]                 = useState('')
  const [loading,setLoading]             = useState(false)
  const [chatStage,setChatStage]         = useState<'explain'|'questions'|'feasibility'|'final'>('explain')
  const [questionCount,setQuestionCount] = useState(0)
  const [helpClicked,setHelpClicked]     = useState(false)
  const bottomRef   = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)
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
        scout_context: stage==='explain'?(scoutData?.advisor_context||null):undefined,
      },{headers:authHeaders()})
      const data=res.data
      setMessages(p=>[...p,{role:'ai',content:data.ai_message}])
      if(data.is_final&&data.refined_topic) onFinal(data.refined_topic,data.refined_description||'')
    } catch { setMessages(p=>[...p,{role:'ai',content:"Hmm, something went sideways on my end. Try again?"}]) }
    finally { setLoading(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])

  useEffect(()=>{
    if(initialized.current) return
    initialized.current=true
    callAI('explain')
  },[callAI])

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}) },[messages])

  const sendMessage=async()=>{
    if(!input.trim()||loading) return
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
      {scoutData&&<ScoutCard data={scoutData} isLiterature={isLiterature}/>}

      <div style={{ background:'#faf5ff',border:'1.5px solid #e9d5ff',borderRadius:14,padding:'12px 18px',marginBottom:14,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12 }}>
        <div style={{ display:'flex',alignItems:'flex-start',gap:10,flex:1,minWidth:0 }}>
          <div style={{ width:36,height:36,borderRadius:10,background:'#7c3aed',display:'flex',alignItems:'center',justifyContent:'center',color:'white',flexShrink:0 }}><I.Chat/></div>
          <div style={{ minWidth:0 }}>
            <p style={{ margin:'0 0 2px',fontSize:'.7rem',fontWeight:700,color:'#7c3aed',textTransform:'uppercase',letterSpacing:'.08em' }}>AI Advisor · Exploring</p>
            <p style={{ margin:0,fontWeight:700,color:'#0f1f0f',fontSize:'.9rem',lineHeight:1.3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{topic.title}</p>
          </div>
        </div>
        <button onClick={onChangeTopic}
          style={{ display:'flex',alignItems:'center',gap:5,padding:'7px 12px',borderRadius:9,border:'1.5px solid #e9d5ff',background:'white',color:'#7c3aed',fontSize:'.76rem',fontWeight:700,cursor:'pointer',transition:'all .15s',flexShrink:0,whiteSpace:'nowrap' }}
          onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.background='#faf5ff';el.style.borderColor='#c4b5fd'}}
          onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.background='white';el.style.borderColor='#e9d5ff'}}>
          <I.Swap/> Change Topic
        </button>
      </div>

      <div style={{ background:'white',border:'1px solid #e8ede8',borderRadius:16,overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
        <div style={{ height:400,overflowY:'auto',padding:'18px' }}>
          {messages.map((m,i)=>(
            <div key={i} style={{ display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start',marginBottom:14 }}>
              {m.role==='ai'&&<div style={{ width:30,height:30,borderRadius:'50%',background:'#7c3aed',display:'flex',alignItems:'center',justifyContent:'center',color:'white',flexShrink:0,marginRight:10,marginTop:2 }}><I.Brain/></div>}
              <div style={{ maxWidth:'78%',padding:'12px 15px',borderRadius:m.role==='user'?'16px 16px 4px 16px':'16px 16px 16px 4px',background:m.role==='user'?'#7c3aed':'#f9fafb',border:m.role==='ai'?'1px solid #e8ede8':'none' }}>
                <div style={{ color:m.role==='user'?'white':'#0f1f0f' }}>
                  {renderMessage(m.content, m.role==='user')}
                </div>
              </div>
            </div>
          ))}
          {loading&&(
            <div style={{ display:'flex',gap:8,alignItems:'center',padding:'8px 4px' }}>
              <div style={{ width:30,height:30,borderRadius:'50%',background:'#7c3aed',display:'flex',alignItems:'center',justifyContent:'center',color:'white',flexShrink:0 }}><I.Brain/></div>
              <div style={{ display:'flex',gap:4 }}>{[0,1,2].map(i=><div key={i} style={{ width:7,height:7,borderRadius:'50%',background:'#9ca3af',animation:`bounce .8s ${i*.15}s ease-in-out infinite` }}/>)}</div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {chatStage!=='final'&&(
          <div style={{ borderTop:'1px solid #e8ede8',padding:'12px 14px',display:'flex',gap:8 }}>
            <input value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()}}}
              placeholder="Type your response…"
              style={{ flex:1,padding:'10px 13px',border:'1.5px solid #e8ede8',borderRadius:10,fontSize:'.85rem',outline:'none',transition:'border .2s' }}
              onFocus={e=>(e.target as HTMLElement).style.borderColor='#7c3aed'}
              onBlur={e=>(e.target as HTMLElement).style.borderColor='#e8ede8'}/>
            <button onClick={sendMessage} disabled={!input.trim()||loading}
              style={{ width:40,height:40,borderRadius:10,background:input.trim()&&!loading?'#7c3aed':'#e8ede8',color:input.trim()&&!loading?'white':'#9ca3af',border:'none',cursor:input.trim()&&!loading?'pointer':'not-allowed',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s',flexShrink:0 }}>
              <I.Send/>
            </button>
          </div>
        )}
      </div>

      <div style={{ marginTop:12,display:'flex',alignItems:'center',justifyContent:'space-between' }}>
        <p style={{ margin:0,fontSize:'.73rem',color:'#9ca3af' }}>
          {chatStage==='explain'?'Your advisor is sizing up the topic…':chatStage==='questions'?`Feasibility check · ~${questionCount}/4 questions`:chatStage==='feasibility'?'Assessing your situation…':'Writing your final topic…'}
        </p>
        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
          {helpClicked&&<motion.span initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} style={{ fontSize:'.78rem',color:'#9ca3af',fontStyle:'italic' }}>Coming soon</motion.span>}
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

/* ─── Final stage ────────────────────────────────────────────────────────── */
function FinalStage({ topic, description, field, level, degree }:
  { topic:string; description:string; field:string; level:string; degree:string }) {
  const router=useRouter()
  const [findingProjects,setFindingProjects] = useState(false)
  const [projects,setProjects]               = useState<SimilarProject[]|null>(null)
  const [searchNote,setSearchNote]           = useState('')
  const [projectError,setProjectError]       = useState('')

  const handleFindProjects=async()=>{
    setFindingProjects(true); setProjectError('')
    try {
      const res=await axios.post(`${API}/topics/find-projects`,{topic_title:topic,field,degree_level:degree},{headers:authHeaders()})
      setProjects(res.data.projects||[]); setSearchNote(res.data.search_note||'')
    } catch(e:any) { setProjectError(extractError(e,'Search failed. Please try again.')) }
    finally { setFindingProjects(false) }
  }

  const handleUseThis=()=>{
    const params=new URLSearchParams({ topic, field, level:degree, from_topics:'true' })
    router.push(`/dashboard/generate?${params.toString()}`)
  }

  return (
    <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:.5}} style={{ maxWidth:680,margin:'0 auto' }}>
      <div style={{ background:'linear-gradient(135deg,#16a34a,#22c55e)',borderRadius:18,padding:'28px',color:'white',marginBottom:20,position:'relative',overflow:'hidden' }}>
        <div style={{ position:'absolute',top:-20,right:-20,width:120,height:120,borderRadius:'50%',background:'rgba(255,255,255,.1)',pointerEvents:'none' }}/>
        <p style={{ margin:'0 0 6px',fontSize:'.72rem',fontWeight:700,color:'rgba(255,255,255,.75)',textTransform:'uppercase',letterSpacing:'.1em' }}>🎉 Your final topic</p>
        <h2 style={{ margin:'0 0 10px',fontWeight:800,fontSize:'clamp(1.1rem,2vw,1.4rem)',fontFamily:'Fraunces,serif',lineHeight:1.3 }}>{topic}</h2>
        {description&&<p style={{ margin:0,fontSize:'.85rem',color:'rgba(255,255,255,.88)',lineHeight:1.65 }}>{description}</p>}
      </div>

      {!projects&&(
        <div style={{ background:'white',border:'1.5px solid #e8ede8',borderRadius:14,padding:'20px',marginBottom:20,textAlign:'center' }}>
          <p style={{ margin:'0 0 6px',fontWeight:700,color:'#0f1f0f',fontSize:'.9rem' }}>Find similar student projects?</p>
          <p style={{ margin:'0 0 16px',fontSize:'.82rem',color:'#9ca3af',lineHeight:1.6 }}>We can search for real MSc/BSc projects similar to yours — useful as past project examples when generating your spec.</p>
          {projectError&&<p style={{ margin:'0 0 10px',fontSize:'.8rem',color:'#dc2626' }}>{projectError}</p>}
          <button onClick={handleFindProjects} disabled={findingProjects}
            style={{ display:'inline-flex',alignItems:'center',gap:7,padding:'10px 22px',borderRadius:10,background:'#7c3aed',color:'white',fontWeight:700,fontSize:'.84rem',border:'none',cursor:findingProjects?'not-allowed':'pointer',opacity:findingProjects?.7:1 }}>
            {findingProjects?<><span className="sp"><I.Spin/></span> Searching…</>:<><I.Proj/> Find Similar Projects</>}
          </button>
        </div>
      )}

      {projects&&(
        <div style={{ background:'white',border:'1.5px solid #e8ede8',borderRadius:14,padding:'20px',marginBottom:20 }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14 }}>
            <p style={{ margin:0,fontWeight:700,color:'#0f1f0f',fontSize:'.9rem' }}>Similar Projects Found</p>
            {searchNote&&<p style={{ margin:0,fontSize:'.72rem',color:'#9ca3af' }}>{searchNote}</p>}
          </div>
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
                <div style={{ background:'#fffbeb',border:'1.5px solid #fde68a',borderRadius:12,padding:'14px 16px',display:'flex',alignItems:'flex-start',gap:10,marginTop:4 }}>
                  <div style={{ color:'#d97706',flexShrink:0,marginTop:1 }}><I.Info/></div>
                  <div>
                    <p style={{ margin:'0 0 4px',fontWeight:700,color:'#92400e',fontSize:'.82rem' }}>How to use these in your specification</p>
                    <p style={{ margin:0,fontSize:'.78rem',color:'#78350f',lineHeight:1.65 }}>
                      Download each project using the "View Project" button above and save them to your device. When you reach the <strong>Past Projects</strong> step in the spec generator, upload them manually — the AI will analyse them and use them to strengthen your specification.
                    </p>
                  </div>
                </div>
              </div>
          }
        </div>
      )}

      <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
        <button onClick={handleUseThis} className="g-btn" style={{ width:'100%',justifyContent:'center',fontSize:'.95rem',padding:'14px',boxShadow:'0 4px 20px rgba(22,163,74,.3)' }}>
          <I.Rocket/> Use This Topic → Generate My Spec
        </button>
        <button onClick={()=>window.location.reload()} className="g-btn-outline" style={{ width:'100%',justifyContent:'center',fontSize:'.86rem' }}>
          Start Over · Find a Different Topic
        </button>
      </div>
      {projects&&projects.length>0&&(
        <p style={{ textAlign:'center',marginTop:10,fontSize:'.74rem',color:'#9ca3af' }}>
          The {projects.length} found project{projects.length>1?'s':''} will be pre-loaded in the spec generator as reference material.
        </p>
      )}
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════ */
export default function TopicsPage() {
  const router=useRouter()

  const [stage,setStage]                     = useState<Stage>('gateway')
  const [formData,setFormData]               = useState<FormData|null>(null)
  const [vetInput,setVetInput]               = useState<VetInput|null>(null)
  const [vetResult,setVetResult]             = useState<VetResult|null>(null)
  const [discoveryResult,setDiscoveryResult] = useState<{clusters:string[];topics:Topic[];prompt_note:string}|null>(null)
  const [selectedTopic,setSelectedTopic]     = useState<Topic|null>(null)
  const [scoutData,setScoutData]             = useState<ScoutData|null>(null)
  const [finalTopic,setFinalTopic]           = useState<{topic:string;description:string}|null>(null)
  const [error,setError]                     = useState<string|null>(null)
  const [flowOrigin,setFlowOrigin]           = useState<'vet'|'discovery'>('discovery')

  const stageNum = (stage==='results') ? 2 : (stage==='scouting'||stage==='chat') ? 3 : stage==='final' ? 4 : 1
  const isLiterature = formData?.project_type==='research-based'

  /* ── Discovery path ─────────────────────────────────────────────────── */
  const handleFormSubmit=async(data:FormData)=>{
    setFormData(data); setStage('loading'); setError(null); setFlowOrigin('discovery')
    try {
      const KNOWN_GEO = ['university','city','country','nigeria','africa','europe','global','none']
      const geoVal = data.geographic_focus || 'none'
      const apiGeo = KNOWN_GEO.includes(geoVal) ? geoVal : 'none'
      const geoContext = KNOWN_GEO.includes(geoVal) ? undefined : geoVal
      const res=await axios.post(`${API}/topics/discover`,{
        ...data,
        geographic_focus: apiGeo,
        ...(geoContext ? { geo_context: geoContext } : {})
      },{headers:authHeaders()})
      setDiscoveryResult(res.data); setStage('results')
    } catch(e:any) { setError(extractError(e,'Failed to generate topics.')); setStage('form') }
  }

  const handleTopicSelect=async(topic:Topic)=>{
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

  const handleChangeTopic=()=>{
    setSelectedTopic(null); setScoutData(null)
    if(flowOrigin==='vet') setStage('vet')
    else setStage('results')
  }

  const handleFinal=(topic:string,desc:string)=>{ setFinalTopic({topic,description:desc})
    setTimeout(()=>setStage('final'),1200)
  }

  /* ── Vet path ────────────────────────────────────────────────────────── */
  const handleVetSubmit=async(input:VetInput)=>{
    setVetInput(input); setStage('vet-loading'); setError(null); setFlowOrigin('vet')
    try {
      const res=await axios.post(`${API}/topics/vet`,{
        original_topic: input.original_topic,
        field:          input.field,
        degree_level:   input.degree_level,
        project_type:   input.project_type,
        geographic_focus: input.geographic_focus,
        ambition_level: input.ambition_level,
      },{headers:authHeaders()})
      setVetResult(res.data); setStage('vet-result')
    } catch(e:any) {
      setError(extractError(e,'Vetting failed. Please try again.'))
      setStage('vet')
    }
  }

  // BUG FIX: previously routed through scout→chat→final which required the advisor
  // to produce an is_final signal before FinalStage was reached. Now goes directly
  // to FinalStage so both paths (vet and discover) end with the same experience:
  // find similar projects + "Use This Topic → Generate My Spec" button.
  const handleVetChoose=async(chosenTitle:string, origin:'vetted'|'provided')=>{
    if(!vetInput||!vetResult) return
    setError(null)

    // Save the vet session to DB (non-fatal — never blocks the user)
    try {
      await axios.post(`${API}/topics/vet/save`,{
        original_topic:  vetInput.original_topic,
        chosen_title:    chosenTitle,
        one_liner:       vetResult.one_liner,
        field:           vetInput.field,
        degree_level:    vetInput.degree_level,
        project_type:    vetInput.project_type,
        ambition_level:  vetInput.ambition_level,
        geographic_focus:vetInput.geographic_focus,
        origin,
      },{headers:authHeaders()})
    } catch(e) { console.warn('Vet save non-fatal:', e) }

    // Set formData so FinalStage has valid field/level/degree context
    setFormData({
      degree_level:        vetInput.degree_level,
      field:               vetInput.field,
      project_type:        vetInput.project_type,
      preferred_activity:  [],
      interest_areas:      [],
      geographic_focus:    vetInput.geographic_focus,
      ambition_level:      vetInput.ambition_level,
      confidence_level:    'have-idea',
    })

    // Skip scout+chat — go directly to FinalStage
    setFinalTopic({ topic: chosenTitle, description: vetResult.one_liner })
    setStage('final')
  }

  return (
    <div style={{ maxWidth:1100,margin:'0 auto' }}>
      <style>{`
        @keyframes sp-rot { to { transform:rotate(360deg) } }
        .sp { animation:sp-rot .9s linear infinite; display:inline-block; }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        .g-input { width:100%;padding:10px 13px;border-radius:10px;border:1.5px solid #e8ede8;font-size:.87rem;color:#0f1f0f;outline:none;transition:all .2s;background:white;box-sizing:border-box; }
        .g-input:focus { border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,.1); }
      `}</style>

      {/* Header */}
      <div style={{ display:'flex',alignItems:'flex-start',marginBottom:28,flexWrap:'wrap',gap:14 }}>
        <div>
          <button onClick={()=>router.push('/dashboard')}
            style={{ display:'inline-flex',alignItems:'center',gap:6,background:'none',border:'none',color:'#9ca3af',cursor:'pointer',fontSize:'.8rem',fontWeight:600,padding:'0 0 10px',transition:'color .15s' }}
            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color='#7c3aed'}
            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color='#9ca3af'}>
            <I.Back/> Back to Dashboard
          </button>
          <div style={{ display:'flex',alignItems:'center',gap:12 }}>
            <div style={{ width:44,height:44,borderRadius:13,background:'linear-gradient(135deg,#7c3aed,#a855f7)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',boxShadow:'0 4px 16px rgba(124,58,237,.3)' }}><I.Flask/></div>
            <div>
              <h1 style={{ margin:0,fontSize:'clamp(1.3rem,2vw,1.7rem)',fontWeight:800,color:'#0f1f0f',fontFamily:'Fraunces,serif',lineHeight:1.1 }}>Topic Lab</h1>
              <p style={{ margin:0,fontSize:'.82rem',color:'#6b7280' }}>Vet your topic · or discover one · then refine with AI · spec ready</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stage bar — show only during discovery chat / final path */}
      {(stage==='results'||stage==='scouting'||stage==='chat'||stage==='final')&&<StageBar current={stageNum}/>}

      {/* Error banner */}
      {error&&(
        <div style={{ background:'#fef2f2',border:'1.5px solid #fecaca',borderRadius:12,padding:'12px 16px',marginBottom:20,display:'flex',alignItems:'center',gap:10 }}>
          <div style={{ color:'#dc2626' }}><I.X/></div>
          <p style={{ margin:0,fontSize:'.84rem',color:'#dc2626',flex:1 }}>{error}</p>
          <button onClick={()=>setError(null)} style={{ background:'none',border:'none',cursor:'pointer',color:'#9ca3af' }}><I.X/></button>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={stage} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:.2}}>

          {stage==='gateway'    && <GatewayStage onHaveTopic={()=>setStage('vet')} onNeedHelp={()=>setStage('form')}/>}
          {stage==='vet'        && <VetStage onSubmit={handleVetSubmit} onBack={()=>setStage('gateway')}/>}
          {stage==='vet-loading'&& vetInput && <VetLoadingStage topic={vetInput.original_topic}/>}
          {stage==='vet-result' && vetResult && (
            <VetResultStage result={vetResult} onChoose={handleVetChoose} onBack={()=>setStage('vet')}/>
          )}
          {stage==='form'       && <FormStage onSubmit={handleFormSubmit}/>}
          {stage==='loading'    && <LoadingStage/>}
          {stage==='results'    && discoveryResult && (
            <ResultsStage result={discoveryResult} onSelect={handleTopicSelect}/>
          )}
          {stage==='scouting'   && selectedTopic && (
            <ScoutingStage topic={selectedTopic} isLiterature={isLiterature||false}/>
          )}
          {stage==='chat'       && selectedTopic && formData && (
            <ChatStage topic={selectedTopic} formData={formData} scoutData={scoutData} onFinal={handleFinal} onChangeTopic={handleChangeTopic}/>
          )}
          {stage==='final'      && finalTopic && formData && (
            <FinalStage topic={finalTopic.topic} description={finalTopic.description}
              field={formData.field} level={formData.ambition_level} degree={formData.degree_level}/>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  )
}