'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useGenerateSpecification } from '@/hooks/useProjects'
import axios from 'axios'

/* ─── Icons ─────────────────────────────────────────────────────────────── */
const I = {
  Check:   ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Back:    ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>,
  Next:    ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
  Upload:  ()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  File:    ()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  X:       ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Info:    ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  Spin:    ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>,
  Zap:     ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Star:    ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
}

const STEPS = [
  { n:1, label:'Basic Info',    sub:'Field & topic' },
  { n:2, label:'Files',        sub:'Upload docs' },
  { n:3, label:'Configure',    sub:'AI settings' },
  { n:4, label:'Review',       sub:'Confirm & go' },
]

/* ─── Step Indicator ─────────────────────────────────────────────────────── */
function StepBar({ current }: { current:number }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:32, position:'relative' }}>
      {/* connector line */}
      <div style={{ position:'absolute', top:16, left:'12%', right:'12%', height:2, background:'#e8ede8', zIndex:0 }}>
        <motion.div initial={{ width:0 }} animate={{ width:`${((current-1)/(STEPS.length-1))*100}%` }}
          transition={{ duration:.4 }} style={{ height:'100%', background:'#16a34a' }}/>
      </div>
      {STEPS.map(s => {
        const done = current > s.n, active = current === s.n
        return (
          <div key={s.n} style={{ display:'flex', flexDirection:'column', alignItems:'center', position:'relative', zIndex:1, flex:1 }}>
            <motion.div initial={false} animate={{ scale: active ? 1.08 : 1 }}
              style={{ width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'.82rem', transition:'all .3s',
                background: done ? '#16a34a' : active ? '#16a34a' : 'white',
                border: `2px solid ${done || active ? '#16a34a' : '#e8ede8'}`,
                color: done || active ? 'white' : '#9ca3af',
                boxShadow: active ? '0 0 0 5px rgba(22,163,74,.15)' : 'none' }}>
              {done ? <I.Check/> : s.n}
            </motion.div>
            <div style={{ marginTop:8, textAlign:'center' }}>
              <p style={{ margin:0, fontSize:'.78rem', fontWeight: active ? 700 : 500, color: active ? '#0f1f0f' : done ? '#16a34a' : '#9ca3af' }}>{s.label}</p>
              <p style={{ margin:0, fontSize:'.66rem', color:'#9ca3af' }}>{s.sub}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─── Choose button (level / effort selectors) ───────────────────────────── */
function ChoiceBtn({ label, sub, active, onClick, color='#16a34a', bg='#f0fdf4', border='#bbf7d0' }:
  { label:string; sub?:string; active:boolean; onClick:()=>void; color?:string; bg?:string; border?:string }) {
  return (
    <button onClick={onClick} style={{ padding:'12px 16px', borderRadius:11, border:`2px solid ${active?border:'#e8ede8'}`, background:active?bg:'white', cursor:'pointer', transition:'all .15s', textAlign:'left', width:'100%' }}
      onMouseEnter={e=>{ if(!active)(e.currentTarget as HTMLElement).style.borderColor=border }}
      onMouseLeave={e=>{ if(!active)(e.currentTarget as HTMLElement).style.borderColor='#e8ede8' }}>
      <p style={{ margin:0, fontWeight:700, color:active?color:'#374151', fontSize:'.86rem' }}>{label}</p>
      {sub && <p style={{ margin:'2px 0 0', fontSize:'.73rem', color:active?`${color}aa`:'#9ca3af' }}>{sub}</p>}
    </button>
  )
}

/* ─── File drop zone ─────────────────────────────────────────────────────── */
function DropZone({ label, accept, file, onChange, required=false, hint }: { label:string; accept:string; file?:File; onChange:(f:File|undefined)=>void; required?:boolean; hint?:string }) {
  const [dragging, setDragging] = useState(false)
  const id = `dz-${label.replace(/\s/g,'')}`
  return (
    <div>
      <label style={{ display:'flex', justifyContent:'space-between', marginBottom:7 }}>
        <span style={{ fontSize:'.84rem', fontWeight:700, color:'#374151' }}>{label} {required && <span style={{ color:'#dc2626' }}>*</span>}</span>
        {file && <button onClick={()=>onChange(undefined)} style={{ background:'none', border:'none', cursor:'pointer', color:'#9ca3af', fontSize:'.76rem', display:'flex', alignItems:'center', gap:4 }}><I.X/> Remove</button>}
      </label>
      {file ? (
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'#f0fdf4', border:'1.5px solid #bbf7d0', borderRadius:11 }}>
          <div style={{ width:36, height:36, borderRadius:9, background:'#dcfce7', display:'flex', alignItems:'center', justifyContent:'center', color:'#16a34a', flexShrink:0 }}><I.File/></div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ margin:0, fontWeight:600, color:'#0f1f0f', fontSize:'.86rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{file.name}</p>
            <p style={{ margin:0, fontSize:'.73rem', color:'#6b7280' }}>{(file.size/1024/1024).toFixed(2)} MB</p>
          </div>
          <div style={{ color:'#16a34a' }}><I.Check/></div>
        </div>
      ) : (
        <label htmlFor={id} style={{ display:'block' }}>
          <div onDragEnter={()=>setDragging(true)} onDragLeave={()=>setDragging(false)} onDragOver={e=>e.preventDefault()}
            onDrop={e=>{ e.preventDefault(); setDragging(false); const f=e.dataTransfer.files[0]; if(f)onChange(f) }}
            style={{ border:`2px dashed ${dragging?'#16a34a':'#d1d5db'}`, borderRadius:12, padding:'28px', textAlign:'center', cursor:'pointer', transition:'all .15s', background:dragging?'#f0fdf4':'#f9fafb' }}>
            <div style={{ width:44, height:44, borderRadius:12, background:'#f0fdf4', border:'1px solid #bbf7d0', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 10px', color:'#16a34a' }}><I.Upload/></div>
            <p style={{ margin:'0 0 4px', fontWeight:600, color:'#374151', fontSize:'.86rem' }}>Drop your file here, or <span style={{ color:'#16a34a', textDecoration:'underline' }}>browse</span></p>
            {hint && <p style={{ margin:0, fontSize:'.74rem', color:'#9ca3af' }}>{hint}</p>}
            <input id={id} type="file" accept={accept} style={{ display:'none' }} onChange={e=>{ const f=e.target.files?.[0]; if(f)onChange(f) }}/>
          </div>
        </label>
      )}
    </div>
  )
}

/* ─── Multi-file drop zone ────────────────────────────────────────────────── */
function MultiDropZone({ label, files, onChange }: { label:string; files:File[]; onChange:(f:File[])=>void }) {
  const [dragging, setDragging] = useState(false)
  const id = 'dz-multi'
  const add = (newFiles: File[]) => onChange([...files, ...newFiles.filter(f=>!files.find(x=>x.name===f.name))])
  const remove = (name: string) => onChange(files.filter(f=>f.name!==name))
  return (
    <div>
      <label style={{ display:'block', fontSize:'.84rem', fontWeight:700, color:'#374151', marginBottom:7 }}>{label}</label>
      {files.length>0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:10 }}>
          {files.map(f=>(
            <div key={f.name} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10 }}>
              <div style={{ color:'#16a34a' }}><I.File/></div>
              <p style={{ flex:1, margin:0, fontSize:'.82rem', color:'#374151', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.name}</p>
              <p style={{ margin:0, fontSize:'.72rem', color:'#9ca3af' }}>{(f.size/1024/1024).toFixed(2)} MB</p>
              <button onClick={()=>remove(f.name)} style={{ background:'none', border:'none', cursor:'pointer', color:'#9ca3af', padding:2 }}><I.X/></button>
            </div>
          ))}
        </div>
      )}
      <label htmlFor={id}>
        <div onDragEnter={()=>setDragging(true)} onDragLeave={()=>setDragging(false)} onDragOver={e=>e.preventDefault()}
          onDrop={e=>{ e.preventDefault(); setDragging(false); add(Array.from(e.dataTransfer.files)) }}
          style={{ border:`2px dashed ${dragging?'#16a34a':'#d1d5db'}`, borderRadius:11, padding:'20px', textAlign:'center', cursor:'pointer', transition:'all .15s', background:dragging?'#f0fdf4':'#f9fafb' }}>
          <p style={{ margin:0, fontWeight:600, color:'#374151', fontSize:'.84rem' }}><span style={{ color:'#16a34a', textDecoration:'underline' }}>Add files</span> or drop them here</p>
          <p style={{ margin:'3px 0 0', fontSize:'.73rem', color:'#9ca3af' }}>PDF, DOCX, DOC — past project examples</p>
          <input id={id} type="file" accept=".pdf,.doc,.docx" multiple style={{ display:'none' }} onChange={e=>{ if(e.target.files) add(Array.from(e.target.files)) }}/>
        </div>
      </label>
    </div>
  )
}

/* ─── Slider ─────────────────────────────────────────────────────────────── */
function Slider({ label, min, max, value, onChange, hint }: { label:string; min:number; max:number; value:number; onChange:(n:number)=>void; hint?:string }) {
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
        <label style={{ fontSize:'.84rem', fontWeight:700, color:'#374151' }}>{label}</label>
        <span style={{ fontSize:'1.1rem', fontWeight:800, color:'#16a34a', fontFamily:'Fraunces,serif', minWidth:24, textAlign:'right' }}>{value}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={e=>onChange(parseInt(e.target.value))}
        style={{ width:'100%', accentColor:'#16a34a', height:4, cursor:'pointer' }}/>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:3 }}>
        <span style={{ fontSize:'.65rem', color:'#9ca3af' }}>{min}</span>
        <span style={{ fontSize:'.65rem', color:'#9ca3af' }}>{max}</span>
      </div>
      {hint && (
        <div style={{ display:'flex', alignItems:'flex-start', gap:6, marginTop:8, padding:'8px 10px', background:'#f9fafb', borderRadius:8 }}>
          <div style={{ color:'#9ca3af', flexShrink:0, marginTop:1 }}><I.Info/></div>
          <p style={{ margin:0, fontSize:'.76rem', color:'#6b7280', lineHeight:1.5 }}>{hint}</p>
        </div>
      )}
    </div>
  )
}

/* ─── Review row ─────────────────────────────────────────────────────────── */
function ReviewRow({ label, value }: { label:string; value:string|number }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:'1px solid #f3f4f6' }}>
      <span style={{ fontSize:'.82rem', color:'#6b7280' }}>{label}</span>
      <span style={{ fontSize:'.82rem', fontWeight:600, color:'#0f1f0f', textAlign:'right', maxWidth:220 }}>{value}</span>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════════════════════ */
export default function GeneratePage() {
  const router = useRouter()
  const [step, setStep]   = useState(1)
  const [error, setError] = useState<string|null>(null)

  const [formData, setFormData] = useState({
    field_of_study:     '',
    research_topic:     '',
    academic_level:     'MSc' as 'BSc'|'MSc'|'PhD',
    effort_level:       'medium' as 'low'|'medium'|'high',
    past_projects_mode: 'hybrid' as 'user_provided'|'auto_discover'|'hybrid',
    max_iterations:     3,
    num_web_searches:   5,
    notification_email: '',
  })

  const [files, setFiles] = useState<{ guidelines?: File; pastProjects: File[] }>({ pastProjects:[] })
  const { mutateAsync:generateSpec, isPending } = useGenerateSpecification()

  const update = (k: string, v: any) => setFormData(p=>({...p,[k]:v}))

  const canProceed = () => {
    if (step===1) return !!(formData.field_of_study.trim() && formData.academic_level)
    if (step===2) return !!files.guidelines
    return true
  }

  const handleSubmit = async () => {
    setError(null)
    try {
      const fd = new FormData()
      fd.append('config_json', JSON.stringify(formData))
      if (files.guidelines) fd.append('guidelines_file', files.guidelines)
      files.pastProjects.forEach(f => fd.append('past_project_files', f))
      const result = await generateSpec(fd)
      router.push(`/dashboard/projects/${result.project_id}`)
    } catch(e) {
      if (axios.isAxiosError(e)) {
        const d = e.response?.data?.detail
        setError(typeof d==='string' ? d : `Server error ${e.response?.status||''}`)
      } else { setError('An unexpected error occurred.') }
    }
  }

  const EFFORT = [
    { value:'low',    label:'Low',    sub:'Simple project, faster' },
    { value:'medium', label:'Medium', sub:'Standard depth' },
    { value:'high',   label:'High',   sub:'Complex, thorough' },
  ]
  const MODES = [
    { value:'user_provided',  label:'My files only',    sub:'Use only my uploaded examples' },
    { value:'auto_discover',  label:'Auto-discover',    sub:'AI finds similar projects online' },
    { value:'hybrid',         label:'Both (Recommended)', sub:'My files + online discovery' },
  ]

  return (
    <div style={{ maxWidth:780, margin:'0 auto' }}>
      <style>{`@keyframes sp2{to{transform:rotate(360deg)}} .spin2{animation:sp2 .9s linear infinite;display:inline-block}`}</style>

      {/* Header */}
      <div style={{ marginBottom:32 }}>
        <h1 style={{ margin:'0 0 6px', fontSize:'clamp(1.5rem,2.5vw,2rem)', fontWeight:800, color:'#0f1f0f', fontFamily:'Fraunces,serif' }}>Generate New Specification</h1>
        <p style={{ margin:0, fontSize:'.88rem', color:'#6b7280' }}>Follow the steps below to create your AI-powered research specification.</p>
      </div>

      {/* Step bar */}
      <StepBar current={step}/>

      {/* Error banner */}
      {error && (
        <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
          style={{ display:'flex', alignItems:'center', gap:10, background:'#fef2f2', border:'1.5px solid #fecaca', borderRadius:12, padding:'12px 16px', marginBottom:18 }}>
          <div style={{ color:'#dc2626' }}><I.Info/></div>
          <p style={{ margin:0, fontSize:'.84rem', color:'#dc2626', flex:1 }}>{error}</p>
          <button onClick={()=>setError(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#9ca3af' }}><I.X/></button>
        </motion.div>
      )}

      {/* Card */}
      <div style={{ background:'white', border:'1px solid #e8ede8', borderRadius:16, boxShadow:'0 2px 12px rgba(0,0,0,.06)', overflow:'hidden', marginBottom:20 }}>
        {/* Card header */}
        <div style={{ padding:'18px 24px', borderBottom:'1px solid #f0f4f0', background:'#fafcfa' }}>
          <h2 style={{ margin:0, fontWeight:700, color:'#0f1f0f', fontSize:'1.05rem' }}>
            Step {step}: {STEPS[step-1].label}
          </h2>
          <p style={{ margin:'3px 0 0', fontSize:'.8rem', color:'#9ca3af' }}>{STEPS[step-1].sub}</p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }} transition={{ duration:.25 }}
            style={{ padding:'24px' }}>

            {/* ── STEP 1: Basic Info ── */}
            {step===1 && (
              <div style={{ display:'flex', flexDirection:'column', gap:22 }}>
                <div>
                  <label style={{ display:'block', fontSize:'.84rem', fontWeight:700, color:'#374151', marginBottom:7 }}>
                    Field of Study <span style={{ color:'#dc2626' }}>*</span>
                  </label>
                  <input className="g-input" value={formData.field_of_study}
                    onChange={e=>update('field_of_study',e.target.value)}
                    placeholder="e.g., Computer Science, Biomedical Engineering, Finance…"/>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:'.84rem', fontWeight:700, color:'#374151', marginBottom:4 }}>Research Topic <span style={{ color:'#9ca3af', fontWeight:400 }}>(optional)</span></label>
                  <p style={{ margin:'0 0 7px', fontSize:'.76rem', color:'#9ca3af' }}>Leave blank and AI will suggest a topic based on your field.</p>
                  <textarea className="g-input" value={formData.research_topic}
                    onChange={e=>update('research_topic',e.target.value)}
                    placeholder="e.g., Machine Learning for early disease detection…"
                    rows={3} style={{ resize:'vertical', lineHeight:1.6 }}/>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:'.84rem', fontWeight:700, color:'#374151', marginBottom:10 }}>Academic Level <span style={{ color:'#dc2626' }}>*</span></label>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                    {(['BSc','MSc','PhD'] as const).map(l => (
                      <ChoiceBtn key={l} label={l} active={formData.academic_level===l} onClick={()=>update('academic_level',l)}/>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:'.84rem', fontWeight:700, color:'#374151', marginBottom:10 }}>Effort Level</label>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                    {EFFORT.map(e => (
                      <ChoiceBtn key={e.value} label={e.label} sub={e.sub} active={formData.effort_level===e.value} onClick={()=>update('effort_level',e.value)}/>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:'.84rem', fontWeight:700, color:'#374151', marginBottom:7 }}>Notification Email <span style={{ color:'#9ca3af', fontWeight:400 }}>(optional)</span></label>
                  <input className="g-input" type="email" value={formData.notification_email}
                    onChange={e=>update('notification_email',e.target.value)} placeholder="your@email.com"/>
                  <p style={{ margin:'6px 0 0', fontSize:'.74rem', color:'#9ca3af' }}>Get emailed when your specification is ready</p>
                </div>
              </div>
            )}

            {/* ── STEP 2: Files ── */}
            {step===2 && (
              <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
                <DropZone label="University Guidelines / Marking Rubric" accept=".pdf,.doc,.docx" required
                  file={files.guidelines}
                  onChange={f=>setFiles(p=>({...p,guidelines:f}))}
                  hint="PDF or DOCX — your university's specification or marking rubric. Required."/>
                <div style={{ height:1, background:'#f0f4f0' }}/>
                <MultiDropZone label="Past Project Examples (Optional)" files={files.pastProjects}
                  onChange={fs=>setFiles(p=>({...p,pastProjects:fs}))}/>
                <div style={{ padding:'14px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:11, display:'flex', alignItems:'flex-start', gap:10 }}>
                  <div style={{ color:'#16a34a', flexShrink:0, marginTop:1 }}><I.Info/></div>
                  <p style={{ margin:0, fontSize:'.8rem', color:'#374151', lineHeight:1.6 }}>
                    <strong>Guidelines are required</strong> and directly improve your score. Specs with uploaded guidelines score 15-20 points higher on average. Past project examples help the AI learn your university's style.
                  </p>
                </div>
              </div>
            )}

            {/* ── STEP 3: Configure ── */}
            {step===3 && (
              <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
                <div>
                  <label style={{ display:'block', fontSize:'.84rem', fontWeight:700, color:'#374151', marginBottom:10 }}>Past Projects Mode</label>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {MODES.map(m => (
                      <ChoiceBtn key={m.value} label={m.label} sub={m.sub} active={formData.past_projects_mode===m.value} onClick={()=>update('past_projects_mode',m.value)}/>
                    ))}
                  </div>
                </div>
                <Slider label="Max Review Iterations" min={1} max={5} value={formData.max_iterations}
                  onChange={v=>update('max_iterations',v)}
                  hint={`The AI professor will review and refine your spec up to ${formData.max_iterations} time${formData.max_iterations!==1?'s':''}. More iterations = higher quality, longer wait.`}/>
                <Slider label="Web Searches" min={3} max={10} value={formData.num_web_searches}
                  onChange={v=>update('num_web_searches',v)}
                  hint="More searches find better resources and references, but add time. 5 is the sweet spot."/>
                <div style={{ padding:'14px', background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:11, display:'flex', alignItems:'flex-start', gap:10 }}>
                  <I.Info/><p style={{ margin:0, fontSize:'.8rem', color:'#1e40af', lineHeight:1.6 }}>
                    <strong>Default settings are optimised</strong> for most projects. Only change these if you have specific requirements.
                  </p>
                </div>
              </div>
            )}

            {/* ── STEP 4: Review ── */}
            {step===4 && (
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                {/* Summary cards */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  {/* Basic info */}
                  <div style={{ background:'#fafcfa', border:'1px solid #e8ede8', borderRadius:12, padding:'16px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:12 }}>
                      <div style={{ width:24, height:24, borderRadius:7, background:'#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center', color:'#16a34a' }}><I.File/></div>
                      <span style={{ fontWeight:700, color:'#0f1f0f', fontSize:'.84rem' }}>Basic Info</span>
                    </div>
                    <ReviewRow label="Field" value={formData.field_of_study||'—'}/>
                    <ReviewRow label="Level" value={formData.academic_level}/>
                    <ReviewRow label="Effort" value={formData.effort_level}/>
                    {formData.research_topic && <ReviewRow label="Topic" value={formData.research_topic.slice(0,50)+(formData.research_topic.length>50?'…':'')}/>}
                  </div>
                  {/* Files */}
                  <div style={{ background:'#fafcfa', border:'1px solid #e8ede8', borderRadius:12, padding:'16px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:12 }}>
                      <div style={{ width:24, height:24, borderRadius:7, background:'#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center', color:'#16a34a' }}><I.Upload/></div>
                      <span style={{ fontWeight:700, color:'#0f1f0f', fontSize:'.84rem' }}>Files</span>
                    </div>
                    <ReviewRow label="Guidelines" value={files.guidelines?.name || '—'}/>
                    <ReviewRow label="Past projects" value={files.pastProjects.length ? `${files.pastProjects.length} file${files.pastProjects.length!==1?'s':''}` : 'None'}/>
                  </div>
                </div>
                {/* Config */}
                <div style={{ background:'#fafcfa', border:'1px solid #e8ede8', borderRadius:12, padding:'16px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:12 }}>
                    <div style={{ width:24, height:24, borderRadius:7, background:'#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center', color:'#16a34a' }}><I.Zap/></div>
                    <span style={{ fontWeight:700, color:'#0f1f0f', fontSize:'.84rem' }}>Configuration</span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:0 }}>
                    <ReviewRow label="Past projects mode" value={formData.past_projects_mode.replace('_',' ')}/>
                    <ReviewRow label="Max iterations" value={formData.max_iterations}/>
                    <ReviewRow label="Web searches" value={formData.num_web_searches}/>
                  </div>
                </div>
                {/* Time estimate */}
                <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:12, padding:'16px', display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{ width:42, height:42, borderRadius:11, background:'#dcfce7', display:'flex', alignItems:'center', justifyContent:'center', color:'#16a34a', flexShrink:0 }}>
                    <I.Star/>
                  </div>
                  <div>
                    <p style={{ margin:'0 0 3px', fontWeight:700, color:'#0f1f0f', fontSize:'.9rem' }}>Ready to generate!</p>
                    <p style={{ margin:0, fontSize:'.8rem', color:'#374151' }}>
                      Estimated time: <strong>8–12 minutes</strong>. You can leave this page — the spec generates in the background.
                      {formData.notification_email && <> You'll be notified at <strong>{formData.notification_email}</strong></>}.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <button className="g-btn-outline" onClick={()=>setStep(s=>s-1)} disabled={step===1||isPending} style={{ opacity:step===1?0.4:1 }}>
          <I.Back/> Back
        </button>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span style={{ fontSize:'.78rem', color:'#9ca3af' }}>Step {step} of {STEPS.length}</span>
          {step < STEPS.length ? (
            <button className="g-btn" onClick={()=>setStep(s=>s+1)} disabled={!canProceed()}>
              Continue <I.Next/>
            </button>
          ) : (
            <button className="g-btn" onClick={handleSubmit} disabled={isPending||!canProceed()} style={{ minWidth:160, justifyContent:'center' }}>
              {isPending ? <><span className="spin2"><I.Spin/></span> Generating…</> : <><I.Zap/> Generate Spec</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
