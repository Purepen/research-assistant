'use client'

/**
 * GenerationLoadingScreen
 *
 * Changes (Apr 2026 — Critic + Humanizer phases):
 *   - Added two new entries to PHASE_MAP:
 *       'Running critic analysis…'  → index 12
 *       'Human rewrite complete'    → index 13
 *   - PHASE_COUNT: 12 → 14
 *   - STAGE_LABELS: added 'Critic' and 'Rewrite' stages
 *   - 'Professor review complete' re-mapped to index 11 (unchanged label)
 *
 * All other code (polling, timer, tips, progress bar, pipeline grid,
 * tip rotation, layout) is preserved verbatim.
 */

import { useEffect, useState } from 'react'
import { CheckCircle, Clock, Loader } from 'lucide-react'

interface GenerationLoadingScreenProps {
  projectId: number
  onComplete: () => void
  onError: (msg: string) => void
}

// Map backend phase strings to human-readable labels + phase index
const PHASE_MAP: Record<string, { label: string; detail: string; index: number }> = {
  'Queued for generation':                { label: 'Starting up',              detail: 'Preparing your generation pipeline…',                      index: 0  },
  'Parsing guidelines document':          { label: 'Reading your guidelines',   detail: 'Extracting word counts, citation style, and requirements…',  index: 1  },
  'Resolving research topic':             { label: 'Locking in your topic',     detail: 'Confirming and refining your research question…',            index: 2  },
  'Discovering resources via web search': { label: 'Scouting the literature',   detail: 'Searching academic databases for relevant papers…',          index: 3  },
  'Fetching paper abstracts and verifying citations': { label: 'Verifying papers', detail: 'Fetching real abstracts and confirming performance figures…', index: 4 },
  'Analysing your uploaded projects':     { label: 'Analysing past projects',   detail: 'Extracting methodology patterns from your uploads…',         index: 5  },
  'Finding similar projects online':      { label: 'Finding similar theses',    detail: 'Searching repositories for comparable dissertations…',       index: 5  },
  'Creating strategic synthesis':         { label: 'Strategic positioning',     detail: 'Identifying what makes your project unique…',                index: 6  },
  'Assembling verified context for generation': { label: 'Locking requirements', detail: 'Building the verified fact-base your spec will draw from…', index: 7  },
  'Generating specification — this takes a few minutes': { label: 'Writing your spec', detail: 'Seven specialist agents writing each section…',       index: 8  },
  'Generating specification (iteration 1)…': { label: 'Writing — round 1',     detail: 'Justification, literature, methodology, timeline…',          index: 8  },
  'Generating specification (iteration 2)…': { label: 'Revising — round 2',    detail: 'Improving based on professor feedback…',                     index: 9  },
  'Generating specification (iteration 3)…': { label: 'Final revision',         detail: 'Polishing to maximise marks…',                              index: 9  },
  'Reviewing specification (iteration 1)…': { label: 'Professor review 1',      detail: 'Running objective validation and qualitative marking…',      index: 10 },
  'Reviewing specification (iteration 2)…': { label: 'Professor review 2',      detail: 'Checking improvements against marking criteria…',            index: 10 },
  'Reviewing specification (iteration 3)…': { label: 'Final review',            detail: 'Last check before delivering your specification…',           index: 10 },
  'Professor review complete':             { label: 'Review done',               detail: 'Review locked in — moving to critic analysis…',             index: 11 },
  // ── NEW (Apr 2026) ───────────────────────────────────────────────────────────
  'Running critic analysis…':              { label: 'Critic analysis',           detail: 'Brutally identifying every gap and weakness in your spec…',  index: 12 },
  'Human rewrite complete':                { label: 'Human rewrite',             detail: 'Rewriting every section in natural human voice…',            index: 13 },
}

// CHANGED: 12 → 14
const PHASE_COUNT = 14

const TRACK_TIPS = [
  "The AI verifies every citation against real paper pages — no hallucinated references.",
  "Each section is written by a dedicated specialist agent, not a single prompt.",
  "The validation layer counts your words and in-text citations before the reviewer runs.",
  "Your methodology section will include all 8 required checklist items.",
  "The professor reviewer cannot approve if word counts or citations are below threshold.",
  "Your work plan uses weeks, not months — examiners notice the difference.",
  "The baseline paper is chosen from verified papers with real performance figures.",
  "SHAP and LIME interpretability analysis will be included if relevant to your topic.",
  "Your ethics statement is pre-written from your Step 3 answers, not guessed.",
  "Similar past projects are named and critiqued by title — not 'existing studies'.",
  "The critic agent reads your entire spec and flags every gap — brutally honestly.",
  "The human writer removes every em-dash and AI writing pattern before delivery.",
]

export function GenerationLoadingScreen({ projectId, onComplete, onError }: GenerationLoadingScreenProps) {
  const [progressPct,    setProgressPct]    = useState(5)
  const [currentPhase,   setCurrentPhase]   = useState('Starting up')
  const [currentDetail,  setCurrentDetail]  = useState('Preparing your generation pipeline…')
  const [phaseIndex,     setPhaseIndex]     = useState(0)
  const [tipIndex,       setTipIndex]       = useState(0)
  const [elapsed,        setElapsed]        = useState(0)
  const [completedPhases,setCompletedPhases]= useState<Set<number>>(new Set())

  // Poll every 3 seconds
  useEffect(() => {
    let cancelled = false
    const poll = async () => {
      if (cancelled) return
      try {
        const res = await fetch(`/api/research/status/${projectId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
        })
        if (!res.ok) return
        const data = await res.json()

        setProgressPct(data.progress_percentage || 5)

        const phase  = data.current_phase || ''
        const mapped = PHASE_MAP[phase] || { label: phase, detail: 'Processing…', index: phaseIndex }
        setCurrentPhase(mapped.label)
        setCurrentDetail(mapped.detail)
        setPhaseIndex(mapped.index)
        setCompletedPhases(prev => {
          const next = new Set(prev)
          for (let i = 0; i < mapped.index; i++) next.add(i)
          return next
        })

        if (data.is_complete || data.status === 'complete') {
          onComplete()
          return
        }
        if (data.status === 'failed') {
          onError(data.current_phase || 'Generation failed — please try again.')
          return
        }
      } catch (e) {
        // silently retry
      }
      if (!cancelled) setTimeout(poll, 3000)
    }
    poll()
    return () => { cancelled = true }
  }, [projectId])

  // Elapsed timer
  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // Rotate tips every 12 seconds
  useEffect(() => {
    const t = setInterval(() => setTipIndex(i => (i + 1) % TRACK_TIPS.length), 12000)
    return () => clearInterval(t)
  }, [])

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  // CHANGED: added 'Critic' and 'Rewrite' to stage labels
  const STAGE_LABELS = [
    'Setup', 'Guidelines', 'Topic', 'Discovery', 'Verification',
    'Past Projects', 'Synthesis', 'Requirements', 'Writing', 'Revision',
    'Review', 'Done', 'Critic', 'Rewrite',
  ]

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: '0 20px 80px' }}>

      {/* Main card */}
      <div style={{ background: '#fafafa', border: '1.5px solid #e8ede8', borderRadius: 20, padding: '32px 30px', textAlign: 'center', marginBottom: 18 }}>

        {/* Animated orb */}
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#0f1f0f 0%,#16a34a 100%)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 12px rgba(22,163,74,.08)', animation: 'pulse 2s ease-in-out infinite' }}>
          <Loader size={28} color="white" style={{ animation: 'spin 1.4s linear infinite' }} />
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{box-shadow:0 0 0 12px rgba(22,163,74,.08)}50%{box-shadow:0 0 0 20px rgba(22,163,74,.03)}}`}</style>

        <h2 style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '1.2rem', color: '#0f1f0f' }}>{currentPhase}</h2>
        <p style={{ margin: '0 0 22px', fontSize: '.83rem', color: '#6b7280', lineHeight: 1.5 }}>{currentDetail}</p>

        {/* Progress bar */}
        <div style={{ height: 8, background: '#f0f0f0', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg,#0f1f0f,#16a34a)', borderRadius: 99, transition: 'width 1.5s cubic-bezier(.4,0,.2,1)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '.72rem', color: '#9ca3af' }}>{progressPct}%</span>
          <span style={{ fontSize: '.72rem', color: '#9ca3af' }}>⏱ {fmt(elapsed)}</span>
        </div>
      </div>

      {/* Phase pipeline */}
      <div style={{ background: 'white', border: '1.5px solid #e8ede8', borderRadius: 16, padding: '18px 20px', marginBottom: 14 }}>
        <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: '.8rem', color: '#374151' }}>Generation Pipeline</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {STAGE_LABELS.map((label, i) => {
            const done   = completedPhases.has(i)
            const active = phaseIndex === i
            return (
              <div key={i} style={{ textAlign: 'center', padding: '8px 4px', borderRadius: 9, background: done ? '#f0fdf4' : active ? '#fafafa' : 'white', border: `1px solid ${done ? '#bbf7d0' : active ? '#e8ede8' : '#f3f4f6'}`, transition: 'all .3s' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', margin: '0 auto 5px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? '#16a34a' : active ? '#0f1f0f' : '#f3f4f6' }}>
                  {done
                    ? <CheckCircle size={13} color="white" />
                    : active
                      ? <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'white', display: 'block', animation: 'pulse 1s ease-in-out infinite' }} />
                      : <Clock size={11} color="#d1d5db" />
                  }
                </div>
                <p style={{ margin: 0, fontSize: '.6rem', fontWeight: active || done ? 700 : 500, color: done ? '#16a34a' : active ? '#0f1f0f' : '#9ca3af', lineHeight: 1.3 }}>{label}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Rotating tip */}
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '13px 16px' }}>
        <p style={{ margin: '0 0 3px', fontWeight: 700, fontSize: '.73rem', color: '#15803d' }}>💡 Did you know?</p>
        <p style={{ margin: 0, fontSize: '.78rem', color: '#166534', lineHeight: 1.5 }}>{TRACK_TIPS[tipIndex]}</p>
      </div>

      <p style={{ textAlign: 'center', marginTop: 18, fontSize: '.73rem', color: '#9ca3af' }}>
        Generation typically takes 5–12 minutes. You can safely close this tab — we'll email your spec when it's ready.
      </p>
    </div>
  )
}