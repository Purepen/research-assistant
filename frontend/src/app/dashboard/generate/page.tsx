'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import axios from 'axios'
import { ArrowLeft, ArrowRight, Sparkles, CheckCircle, AlertTriangle, FlaskConical, Brain, BarChart3 } from 'lucide-react'
import { useGenerateSpecification } from '@/hooks/useProjects'
import { useUserStats } from '@/hooks/useUser'
import { topicsApi } from '@/lib/api'
import { Step2FileUploads } from '@/components/generate/Step2FileUploads'
import { Step3Questions, TrackAAnswers, TrackBAnswers } from '@/components/generate/Step3Questions'

// ─── Track detection — B5 signals (mirrors backend locked_requirements_builder.py) ──
const TRACK_B_FIELDS = [
  'english','literature','history','law','philosophy','linguistics',
  'education','sociology','anthropology','political science','politics',
  'theology','religious','media studies','cultural studies','communication',
  'creative writing','journalism','arts','fine art','gender studies',
  'film','music','theatre','drama','international relations','policy',
]
const TRACK_A_SIGNALS = [
  // Original signals
  'machine learning','deep learning','neural network','data science',
  'algorithm','classification','regression','clustering','prediction',
  'dataset','model',' ai ','artificial intelligence','nlp',
  'computer vision','image recognition','sentiment analysis',
  'blockchain','cybersecurity','iot','bioinformatics','genomics',
  'epidemiology','public health data','econometrics','quantitative',
  'simulation','optimization','engineering','software',
  // B5 fix: new quantitative/causal phrases
  'econometric','regression analysis','statistical analysis',
  'quantitative analysis','quantitative study','empirical analysis',
  'empirical study','causal analysis','causal inference',
  'panel data','impact of','effect of','determinants of','an analysis of',
]

function detectTrackAuto(field: string, topic: string): 'A' | 'B' {
  const t = (topic || '').toLowerCase()
  for (const s of TRACK_A_SIGNALS) if (t.includes(s)) return 'A'
  const f = field.toLowerCase()
  for (const b of TRACK_B_FIELDS) if (f.includes(b)) return 'B'
  return 'A'
}

// Detect if there's a conflict — field says B but topic has quantitative language
function detectConflict(field: string, topic: string): boolean {
  const fieldTrack = (() => {
    const f = field.toLowerCase()
    for (const b of TRACK_B_FIELDS) if (f.includes(b)) return 'B'
    return 'A'
  })()
  if (fieldTrack !== 'B') return false
  const t = (topic || '').toLowerCase()
  const quantSignals = [
    'econometric','regression','statistical','quantitative','empirical',
    'causal','panel data','impact of','effect of','determinants of',
    'analysis of','human capital','performance analysis',
  ]
  return quantSignals.some(s => t.includes(s))
}

const RESEARCH_NATURE_LABELS: Record<string, string> = {
  building_model:      'ML / Prediction model',
  testing_causation:   'Econometric causal study',
  running_survey:      'Survey / Questionnaire study',
  building_system:     'Software system design',
  financial_analysis:  'Quantitative finance / Actuarial',
  not_sure:            'Auto-detect from field and topic',
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  purple: '#7c3aed',
  purpleLight: '#ede9fe',
  purpleBorder: '#c4b5fd',
  green: '#16a34a',
  greenLight: '#f0fdf4',
  greenBorder: '#bbf7d0',
  amber: '#d97706',
  amberLight: '#fffbeb',
  amberBorder: '#fde68a',
  red: '#dc2626',
  dark: '#0f1f0f',
  muted: '#6b7280',
  border: '#e5e7eb',
  bg: '#fafafa',
  white: '#ffffff',
}

// ─── Stepper ──────────────────────────────────────────────────────────────────
const STEPS = ['Basic Info', 'Documents & Data', 'Quick Questions', 'Configure', 'Review']

function Stepper({ step, track }: { step: number; track: 'A' | 'B' }) {
  const accent = track === 'B' ? C.purple : C.green
  const accentLight = track === 'B' ? C.purpleLight : C.greenLight

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: 15, left: '5%', right: '5%',
          height: 2, background: C.border, zIndex: 0,
        }}>
          <div style={{
            height: '100%',
            width: `${Math.max(0, ((step - 1) / (STEPS.length - 1)) * 100)}%`,
            background: `linear-gradient(90deg, ${accent}, ${accent}cc)`,
            borderRadius: 2, transition: 'width .4s ease',
          }} />
        </div>
        {STEPS.map((label, i) => {
          const idx = i + 1
          const done = idx < step
          const active = idx === step
          return (
            <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? accent : active ? C.dark : C.white,
                border: `2px solid ${done ? accent : active ? C.dark : C.border}`,
                boxShadow: active ? `0 0 0 4px ${accentLight}` : 'none',
                transition: 'all .25s',
              }}>
                {done
                  ? <CheckCircle size={15} color="white" />
                  : <span style={{ fontSize: '.72rem', fontWeight: 800, color: active ? 'white' : C.muted }}>{idx}</span>
                }
              </div>
              <span className="gen-steplabel" style={{
                fontSize: '.65rem', fontWeight: active ? 800 : 500, marginTop: 7,
                color: done ? accent : active ? C.dark : C.muted, whiteSpace: 'nowrap',
              }}>{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Topic Lab banner ─────────────────────────────────────────────────────────
function TopicLabBanner({ topic, onClear }: { topic: string; onClear: () => void }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #f0fdf4, #faf5ff)',
      border: `1.5px solid ${C.greenBorder}`,
      borderRadius: 12, padding: '12px 16px', marginBottom: 20,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: C.greenLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FlaskConical size={14} color={C.green} />
        </div>
        <span style={{ fontSize: '.82rem', color: C.green, fontWeight: 700 }}>
          From Topic Lab: <em style={{ fontWeight: 400, color: C.dark }}>{topic.length > 60 ? topic.slice(0, 60) + '…' : topic}</em>
        </span>
      </div>
      <button onClick={onClear} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.72rem', color: C.muted, fontWeight: 600, padding: '4px 8px', borderRadius: 6 }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = C.dark}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = C.muted}
      >Clear ×</button>
    </div>
  )
}

// ─── Track Confirmation Selector ──────────────────────────────────────────────
// This is the critical UX piece. Shown at the bottom of Step 1.
// Auto-detects and pre-selects the most likely track, but the student
// must explicitly click one before they can proceed to Step 2.
// This is what prevents the wrong methodology from being generated.
function TrackConfirmation({
  autoDetected,
  confirmed,
  onConfirm,
  field,
  topic,
}: {
  autoDetected: 'A' | 'B' | null
  confirmed: 'A' | 'B' | null
  onConfirm: (t: 'A' | 'B') => void
  field: string
  topic: string
}) {
  const hasConflict = field && topic && detectConflict(field, topic)

  return (
    <div style={{ marginTop: 4 }}>
      {/* Section label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1, height: 1, background: C.border }} />
        <span style={{ fontSize: '.72rem', fontWeight: 700, color: C.muted, whiteSpace: 'nowrap' }}>
          CONFIRM YOUR RESEARCH APPROACH
        </span>
        <div style={{ flex: 1, height: 1, background: C.border }} />
      </div>

      {/* Conflict alert — shown when field says B but topic signals A */}
      {hasConflict && (
        <div style={{
          display: 'flex', gap: 9, alignItems: 'flex-start',
          background: C.amberLight, border: `1.5px solid ${C.amberBorder}`,
          borderRadius: 10, padding: '10px 14px', marginBottom: 12,
        }}>
          <AlertTriangle size={14} color={C.amber} style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ margin: 0, fontSize: '.77rem', color: '#92400e', lineHeight: 1.55 }}>
            <strong>Potential mismatch:</strong> Your field ({field}) suggests a theoretical project, but your topic contains empirical/quantitative language. Pick the approach that matches what your project actually does.
          </p>
        </div>
      )}

      <p style={{ margin: '0 0 12px', fontSize: '.8rem', color: C.muted, lineHeight: 1.55 }}>
        {autoDetected
          ? `We auto-detected your project as the ${autoDetected === 'A' ? 'Empirical' : 'Theoretical'} Track. Confirm below — or switch if this is wrong.`
          : 'Select the approach that matches your project.'}
        {' '}<strong style={{ color: C.dark }}>This determines your entire methodology.</strong>
      </p>

      <div className="gen-track-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Empirical Track */}
        <button
          onClick={() => onConfirm('A')}
          style={{
            padding: '16px 14px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
            border: `2px solid ${confirmed === 'A' ? C.green : C.border}`,
            background: confirmed === 'A' ? C.greenLight : C.white,
            transition: 'all .18s', position: 'relative',
            boxShadow: confirmed === 'A' ? `0 0 0 3px rgba(22,163,74,.12)` : 'none',
          }}
          onMouseEnter={e => { if (confirmed !== 'A') (e.currentTarget as HTMLElement).style.borderColor = C.greenBorder }}
          onMouseLeave={e => { if (confirmed !== 'A') (e.currentTarget as HTMLElement).style.borderColor = C.border }}
        >
          {/* Auto-detected badge */}
          {autoDetected === 'A' && (
            <div style={{
              position: 'absolute', top: -10, left: 14,
              background: C.green, color: 'white',
              fontSize: '.6rem', fontWeight: 800, padding: '2px 8px', borderRadius: 999,
            }}>AUTO-DETECTED</div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9, flexShrink: 0,
              background: confirmed === 'A' ? C.green : '#f3f4f6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .18s',
            }}>
              <BarChart3 size={17} color={confirmed === 'A' ? 'white' : C.muted} />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: '.88rem', color: confirmed === 'A' ? C.green : C.dark, fontFamily: 'Fraunces, Georgia, serif' }}>
                Empirical Track
              </p>
              <p style={{ margin: 0, fontSize: '.68rem', color: C.muted, fontWeight: 600 }}>Quantitative / Data</p>
            </div>
            {confirmed === 'A' && <CheckCircle size={16} color={C.green} style={{ marginLeft: 'auto' }} />}
          </div>
          <p style={{ margin: 0, fontSize: '.74rem', color: C.muted, lineHeight: 1.5 }}>
            Dataset, algorithms, statistical analysis, regression, models, evaluation metrics.
          </p>
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {['ML / AI', 'Econometrics', 'Survey data', 'Causal study', 'System design'].map(tag => (
              <span key={tag} style={{ fontSize: '.65rem', padding: '2px 7px', borderRadius: 999, background: confirmed === 'A' ? '#dcfce7' : '#f3f4f6', color: confirmed === 'A' ? C.green : C.muted, fontWeight: 700 }}>{tag}</span>
            ))}
          </div>
        </button>

        {/* Theoretical Track */}
        <button
          onClick={() => onConfirm('B')}
          style={{
            padding: '16px 14px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
            border: `2px solid ${confirmed === 'B' ? C.purple : C.border}`,
            background: confirmed === 'B' ? C.purpleLight : C.white,
            transition: 'all .18s', position: 'relative',
            boxShadow: confirmed === 'B' ? `0 0 0 3px rgba(124,58,237,.12)` : 'none',
          }}
          onMouseEnter={e => { if (confirmed !== 'B') (e.currentTarget as HTMLElement).style.borderColor = C.purpleBorder }}
          onMouseLeave={e => { if (confirmed !== 'B') (e.currentTarget as HTMLElement).style.borderColor = C.border }}
        >
          {autoDetected === 'B' && (
            <div style={{
              position: 'absolute', top: -10, left: 14,
              background: C.purple, color: 'white',
              fontSize: '.6rem', fontWeight: 800, padding: '2px 8px', borderRadius: 999,
            }}>AUTO-DETECTED</div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9, flexShrink: 0,
              background: confirmed === 'B' ? C.purple : '#f3f4f6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .18s',
            }}>
              <Brain size={17} color={confirmed === 'B' ? 'white' : C.muted} />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: '.88rem', color: confirmed === 'B' ? C.purple : C.dark, fontFamily: 'Fraunces, Georgia, serif' }}>
                Theoretical Track
              </p>
              <p style={{ margin: 0, fontSize: '.68rem', color: C.muted, fontWeight: 600 }}>Qualitative / Humanities</p>
            </div>
            {confirmed === 'B' && <CheckCircle size={16} color={C.purple} style={{ marginLeft: 'auto' }} />}
          </div>
          <p style={{ margin: 0, fontSize: '.74rem', color: C.muted, lineHeight: 1.5 }}>
            Theoretical framework, scholarly debates, argument development, positionality, literature analysis.
          </p>
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {['History', 'Law', 'Policy', 'Literature', 'Education theory', 'Sociology'].map(tag => (
              <span key={tag} style={{ fontSize: '.65rem', padding: '2px 7px', borderRadius: 999, background: confirmed === 'B' ? '#ede9fe' : '#f3f4f6', color: confirmed === 'B' ? C.purple : C.muted, fontWeight: 700 }}>{tag}</span>
            ))}
          </div>
        </button>
      </div>

      {/* Prompt if nothing selected yet */}
      {!confirmed && (
        <p style={{ marginTop: 10, fontSize: '.74rem', color: C.amber, fontWeight: 700, textAlign: 'center' }}>
          ↑ Select one to continue — this cannot be changed after Step 1
        </p>
      )}
    </div>
  )
}

// ─── Shared input style ───────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: 10,
  border: `1.5px solid ${C.border}`, fontSize: '.87rem', color: C.dark,
  outline: 'none', transition: 'all .2s', background: C.white, boxSizing: 'border-box',
  fontFamily: 'inherit',
}
const focusInp = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>, track: 'A' | 'B' = 'A') => {
  const color = track === 'B' ? C.purple : C.green
  const shadow = track === 'B' ? 'rgba(124,58,237,.12)' : 'rgba(22,163,74,.12)'
  e.target.style.borderColor = color; e.target.style.boxShadow = `0 0 0 3px ${shadow}`
}
const blurInp = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'
}

function SectionHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ margin: '0 0 4px', fontWeight: 800, color: C.dark, fontSize: '1.18rem', fontFamily: 'Fraunces, Georgia, serif', letterSpacing: '-.01em' }}>{title}</h2>
      <p style={{ margin: 0, fontSize: '.84rem', color: C.muted }}>{sub}</p>
    </div>
  )
}

function FieldCard({ children, accent = C.green }: { children: React.ReactNode; accent?: string }) {
  return (
    <div style={{ background: C.white, borderRadius: 14, border: `1.5px solid ${C.border}`, borderLeft: `4px solid ${accent}`, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
      {children}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function GeneratePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { mutateAsync: generateSpec, isPending } = useGenerateSpecification()
  const { data: userStats } = useUserStats()

  const [step, setStep] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [fromTopicsBanner, setFromTopicsBanner] = useState(false)

  // Track state: autoDetected is what the algorithm thinks, confirmedTrack is what
  // the student explicitly clicked. Both are null until field+topic are entered.
  const [autoDetectedTrack, setAutoDetectedTrack] = useState<'A' | 'B' | null>(null)
  const [confirmedTrack, setConfirmedTrack] = useState<'A' | 'B' | null>(null)

  // The active track for routing purposes — confirmed if set, auto-detected otherwise
  const track: 'A' | 'B' = confirmedTrack ?? autoDetectedTrack ?? 'A'

  const [formData, setFormData] = useState({
    field_of_study: '',
    research_topic: '',
    academic_level: 'MSc',
    effort_level: 'medium',
    past_projects_mode: 'hybrid',
    num_auto_projects_target: 3,
    min_auto_projects_required: 1,
    max_auto_projects_accepted: 3,
    deduplicate_auto_vs_user: true,
    max_iterations: 3,
    num_web_searches: 5,
    notification_email: '',
    dataset_source: 'public' as 'uploaded' | 'public' | 'scout' | 'self_collected',
    dataset_name: '',
    dataset_url: '',
    dataset_description: '',
    dataset_size: '',
    data_sensitivity: 'public' as 'public' | 'self_collected' | 'sensitive',
    student_success_statement: '',
    preferred_algorithms: '',
    research_nature: '',
    theoretical_framework: '',
    central_argument: '',
    primary_source_focus: '',
  })

  const [files, setFiles] = useState<{ guidelines?: File; pastProjects: File[]; datasetFile?: File }>({ pastProjects: [] })
  const [datasetState, setDatasetState] = useState<{ mode: any; file?: File; name?: string; url?: string; description?: string }>({ mode: null })

  const [answersA, setAnswersA] = useState<TrackAAnswers>({
    data_sensitivity: '', student_success_statement: '', preferred_algorithms: '', research_nature: '',
  })
  const [answersB, setAnswersB] = useState<TrackBAnswers>({
    theoretical_framework: '', central_argument: '', primary_source_focus: '',
  })

  const paramTopic     = searchParams.get('topic') || ''
  const paramField     = searchParams.get('field') || ''
  const paramLevel     = searchParams.get('level') || ''
  const paramSessionId = searchParams.get('topic_session_id') || ''
  const prefillDone = useRef(false)

  useEffect(() => {
    if (prefillDone.current) return
    if (paramTopic || paramField) {
      prefillDone.current = true
      setFromTopicsBanner(true)
      const level = (['BSc','MSc','PhD'].includes(paramLevel) ? paramLevel : 'MSc') as any
      setFormData(p => ({ ...p, research_topic: paramTopic, field_of_study: paramField, academic_level: level }))
      const detected = detectTrackAuto(paramField, paramTopic)
      setAutoDetectedTrack(detected)
      // For Topic Lab pre-fills, auto-confirm the detected track as a convenience
      // but it's still shown as "auto-detected" so the student can override it
    }
  }, [])

  const updateForm = (k: string, v: any) => {
    setFormData(p => {
      const next = { ...p, [k]: v }
      if (k === 'field_of_study' || k === 'research_topic') {
        const f = k === 'field_of_study' ? v : next.field_of_study
        const t = k === 'research_topic' ? v : next.research_topic
        if (f || t) {
          const detected = detectTrackAuto(f, t)
          setAutoDetectedTrack(detected)
          // Reset confirmed track when field/topic changes so student re-confirms
          setConfirmedTrack(null)
        } else {
          setAutoDetectedTrack(null)
          setConfirmedTrack(null)
        }
      }
      return next
    })
  }

  const handleConfirmTrack = (t: 'A' | 'B') => setConfirmedTrack(t)

  const updateFiles = (update: any) => setFiles(p => ({ ...p, ...update }))

  useEffect(() => {
    setFormData(p => ({
      ...p,
      dataset_source: (datasetState.mode || 'public') as any,
      dataset_name: datasetState.name || '',
      dataset_url: datasetState.url || '',
      dataset_description: datasetState.description || '',
    }))
    if (datasetState.mode === 'self_collected') {
      setAnswersA(prev => ({ ...prev, data_sensitivity: 'self_collected' }))
    } else if (datasetState.mode === 'scout') {
      setAnswersA(prev => ({ ...prev, data_sensitivity: 'public' }))
    }
  }, [datasetState])

  useEffect(() => {
    if (track === 'A') {
      setFormData(p => ({
        ...p,
        data_sensitivity: (answersA.data_sensitivity || 'public') as any,
        student_success_statement: answersA.student_success_statement,
        preferred_algorithms: answersA.preferred_algorithms,
        research_nature: answersA.research_nature || '',
      }))
    } else {
      setFormData(p => ({
        ...p,
        theoretical_framework: answersB.theoretical_framework,
        central_argument: answersB.central_argument,
        primary_source_focus: answersB.primary_source_focus,
      }))
    }
  }, [answersA, answersB, track])

  const canProceed = () => {
    if (step === 1) {
      // Must have field, level, AND a confirmed track selection
      if (!formData.field_of_study.trim() || !formData.academic_level) return false
      if (!confirmedTrack) return false   // The confirmation selector is mandatory
      return true
    }
    if (step === 2) {
      if (track === 'A') {
        if (!datasetState.mode) return false
        if (datasetState.mode === 'uploaded' && !files.datasetFile) return false
        if (datasetState.mode === 'public' && !datasetState.name?.trim()) return false
      }
      return true
    }
    if (step === 3) return track === 'A' ? !!answersA.data_sensitivity : !!answersB.central_argument.trim()
    return true
  }

  const handleSubmit = async () => {
    setError(null)
    try {
      const config = { ...formData }
      if (!config.notification_email)        delete (config as any).notification_email
      if (!config.dataset_name)              delete (config as any).dataset_name
      if (!config.dataset_url)               delete (config as any).dataset_url
      if (!config.student_success_statement) delete (config as any).student_success_statement
      if (!config.preferred_algorithms)      delete (config as any).preferred_algorithms
      if (!config.research_nature)           delete (config as any).research_nature
      if (!config.theoretical_framework)     delete (config as any).theoretical_framework
      if (!config.central_argument)          delete (config as any).central_argument
      if (!config.primary_source_focus)      delete (config as any).primary_source_focus

      const fd = new FormData()
      fd.append('config_json', JSON.stringify(config))
      if (files.guidelines)  fd.append('guidelines_file', files.guidelines)
      if (files.datasetFile) fd.append('dataset_file', files.datasetFile)
      files.pastProjects.forEach(f => fd.append('past_project_files', f))

      const result = await generateSpec(fd)

      if (paramSessionId && result.project_id) {
        try { await topicsApi.linkProject(parseInt(paramSessionId), result.project_id) }
        catch (e) { console.warn('Topic link failed (non-fatal):', e) }
      }

      router.push(`/dashboard/projects/${result.project_id}`)
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const d = e.response?.data?.detail
        setError(typeof d === 'string' ? d : `Server error ${e.response?.status || ''}`)
      } else {
        setError('An unexpected error occurred.')
      }
    }
  }

  const clearTopicFill = () => {
    setFromTopicsBanner(false)
    setFormData(p => ({ ...p, research_topic: '', field_of_study: '', academic_level: 'MSc' }))
    setAutoDetectedTrack(null)
    setConfirmedTrack(null)
  }

  const trackColor = track === 'B' ? C.purple : C.green

  // ─── Step 1 ───────────────────────────────────────────────────────────────
  const renderStep1 = () => (
    <div>
      <SectionHead title="Basic Information" sub="Tell us about your project — the more specific, the better." />
      {fromTopicsBanner && <TopicLabBanner topic={formData.research_topic} onClear={clearTopicFill} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FieldCard accent={C.green}>
          <label style={{ display: 'block', fontWeight: 700, fontSize: '.8rem', color: C.dark, marginBottom: 7 }}>
            Field of Study <span style={{ color: C.red }}>*</span>
          </label>
          <input style={inp} placeholder="e.g. Education, Computer Science, Economics"
            value={formData.field_of_study}
            onChange={e => updateForm('field_of_study', e.target.value)}
            onFocus={e => focusInp(e, track)} onBlur={blurInp} />
          <p style={{ margin: '6px 0 0', fontSize: '.72rem', color: C.muted }}>
            Include your department or sub-discipline — e.g. "Education Policy" not just "Education".
          </p>
        </FieldCard>

        <FieldCard accent={trackColor}>
          <label style={{ display: 'block', fontWeight: 700, fontSize: '.8rem', color: C.dark, marginBottom: 7 }}>Research Topic</label>
          <input style={inp} placeholder="e.g. The Impact of Teacher Quality on Academic Performance: An Econometric Analysis"
            value={formData.research_topic}
            onChange={e => updateForm('research_topic', e.target.value)}
            onFocus={e => focusInp(e, track)} onBlur={blurInp} />
          <p style={{ margin: '6px 0 0', fontSize: '.72rem', color: C.muted }}>
            Leave blank to have topics suggested. Including your method in the title (e.g. "Econometric Analysis", "Systematic Review") helps us detect your approach.
          </p>
        </FieldCard>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FieldCard accent={C.muted}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '.8rem', color: C.dark, marginBottom: 7 }}>
              Academic Level <span style={{ color: C.red }}>*</span>
            </label>
            <select style={{ ...inp, cursor: 'pointer', appearance: 'none' }}
              value={formData.academic_level}
              onChange={e => updateForm('academic_level', e.target.value)}
              onFocus={e => focusInp(e, track)} onBlur={blurInp}>
              <option value="BSc">BSc</option>
              <option value="MSc">MSc</option>
              <option value="PhD">PhD</option>
            </select>
          </FieldCard>

          <FieldCard accent={C.muted}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '.8rem', color: C.dark, marginBottom: 7 }}>Effort Level</label>
            <select style={{ ...inp, cursor: 'pointer', appearance: 'none' }}
              value={formData.effort_level}
              onChange={e => updateForm('effort_level', e.target.value)}
              onFocus={e => focusInp(e, track)} onBlur={blurInp}>
              <option value="low">Low — fast and safe</option>
              <option value="medium">Medium — standard depth</option>
              <option value="high">High — ambitious and thorough</option>
            </select>
          </FieldCard>
        </div>

        <FieldCard accent={C.muted}>
          <label style={{ display: 'block', fontWeight: 700, fontSize: '.8rem', color: C.dark, marginBottom: 7 }}>Email for delivery</label>
          <input style={inp} type="email" placeholder="your@email.com (optional)"
            value={formData.notification_email}
            onChange={e => updateForm('notification_email', e.target.value)}
            onFocus={e => focusInp(e, track)} onBlur={blurInp} />
        </FieldCard>

        {/* Track confirmation — only shown once field is entered */}
        {formData.field_of_study.trim() && (
          <TrackConfirmation
            autoDetected={autoDetectedTrack}
            confirmed={confirmedTrack}
            onConfirm={handleConfirmTrack}
            field={formData.field_of_study}
            topic={formData.research_topic}
          />
        )}
      </div>
    </div>
  )

  // ─── Cost-upfront card — no surprise 402s (design doc: "cost before the button") ──
  const renderCostCard = () => {
    const hasOwnKey = userStats?.has_own_api_key ?? false
    const specCreditUsed = userStats?.free_spec_credit_used ?? false
    const [bg, border, color, icon, text] = hasOwnKey
      ? [C.greenLight, C.greenBorder, C.green, '🔑', 'This run uses your own OpenAI key — unlimited generations, you pay OpenAI directly.']
      : !specCreditUsed
        ? [C.greenLight, C.greenBorder, C.green, '🎁', 'This run uses your free spec credit — £0, on us. Estimated time: 5–15 minutes.']
        : [C.amberLight, C.amberBorder, C.amber, '⚠️', 'Your free spec credit is used. Add your own OpenAI key in Profile before generating, or this run will fail.']
    return (
      <div style={{
        display: 'flex', gap: 10, alignItems: 'flex-start',
        background: bg, border: `1.5px solid ${border}`,
        borderRadius: 12, padding: '12px 16px',
      }}>
        <span style={{ fontSize: '1rem', flexShrink: 0 }}>{icon}</span>
        <p style={{ margin: 0, fontSize: '.8rem', color: C.dark, lineHeight: 1.55 }}>
          <strong style={{ color }}>Cost of this run:</strong> {text}
        </p>
      </div>
    )
  }

  // ─── Step 4: Configure ────────────────────────────────────────────────────
  const renderStep4 = () => {
    const MODES = [
      { value: 'user_provided', label: 'My uploaded files only', sub: 'Use only the past projects you uploaded', icon: '📂' },
      { value: 'auto_discover', label: 'Auto-discover online', sub: 'AI finds similar theses online', icon: '🔍' },
      { value: 'hybrid', label: 'Both (Recommended)', sub: 'Your files + online discovery', icon: '⚡' },
    ]
    return (
      <div>
        <SectionHead title="Configure Generation" sub="Tweak how the AI researches and builds your spec." />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {renderCostCard()}
          <FieldCard accent={trackColor}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '.86rem', color: C.dark, marginBottom: 12 }}>Past Projects Discovery</label>
            {MODES.map(m => {
              const selected = formData.past_projects_mode === m.value
              return (
                <button key={m.value} onClick={() => updateForm('past_projects_mode', m.value)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%',
                    padding: '12px 14px', borderRadius: 10, marginBottom: 8, cursor: 'pointer',
                    border: `1.5px solid ${selected ? trackColor : C.border}`,
                    background: selected ? (track === 'B' ? C.purpleLight : C.greenLight) : C.white,
                    textAlign: 'left', transition: 'all .15s',
                  }}>
                  <span style={{ fontSize: '1rem' }}>{m.icon}</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '.84rem', color: selected ? trackColor : C.dark }}>{m.label}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '.73rem', color: C.muted }}>{m.sub}</p>
                  </div>
                  {selected && <CheckCircle size={15} color={trackColor} style={{ marginLeft: 'auto', flexShrink: 0, marginTop: 2 }} />}
                </button>
              )
            })}
          </FieldCard>

          <FieldCard accent={trackColor}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '.86rem', color: C.dark, marginBottom: 6 }}>Review Iterations</label>
            <p style={{ margin: '0 0 12px', fontSize: '.76rem', color: C.muted, lineHeight: 1.55 }}>
              How many times should the AI professor review and revise before finalising?
              After the first draft, only the sections that under-scored are rewritten — extra
              iterations sharpen weak sections without redoing good ones.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[1, 2, 3].map(n => {
                const sel = formData.max_iterations === n
                return (
                  <button key={n} onClick={() => updateForm('max_iterations', n)}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 10, cursor: 'pointer',
                      border: `1.5px solid ${sel ? trackColor : C.border}`,
                      background: sel ? (track === 'B' ? C.purpleLight : C.greenLight) : C.white,
                      fontWeight: 800, fontSize: '.88rem', color: sel ? trackColor : C.muted, transition: 'all .15s',
                    }}>
                    {n}×
                  </button>
                )
              })}
            </div>
          </FieldCard>
        </div>
      </div>
    )
  }

  // ─── Step 5: Review ───────────────────────────────────────────────────────
  const renderStep5 = () => {
    const trackLabel = track === 'A' ? '📊 Empirical Track' : '📚 Theoretical Track'
    const rows = [
      ['Research Topic', formData.research_topic || 'AI will suggest a topic'],
      ['Field', formData.field_of_study],
      ['Level', formData.academic_level],
      ['Research Approach', trackLabel],
      ['Effort', formData.effort_level],
      ...(track === 'A' ? [['Dataset', formData.dataset_name || formData.dataset_source || 'AI will scout']] : []),
      ...(formData.preferred_algorithms ? [['Methods', formData.preferred_algorithms]] : []),
      ...(formData.research_nature && formData.research_nature !== 'not_sure'
        ? [['Study Type', RESEARCH_NATURE_LABELS[formData.research_nature] || formData.research_nature]] : []),
      ...(track === 'B' && formData.central_argument ? [['Argument', formData.central_argument.slice(0, 60) + '…']] : []),
      ['Guidelines', files.guidelines?.name || 'Using standard defaults'],
      ['Past Projects', files.pastProjects.length ? `${files.pastProjects.length} file(s) uploaded` : 'AI auto-discover'],
      ['Iterations', `${formData.max_iterations}×`],
      ...(formData.notification_email ? [['Email', formData.notification_email]] : []),
    ] as [string, string][]

    return (
      <div>
        <SectionHead title="Review & Generate" sub="Check everything looks right before we begin." />

        {/* Track summary card */}
        <div style={{
          background: `linear-gradient(135deg, ${track === 'B' ? '#faf5ff' : '#f0fdf4'}, ${track === 'B' ? '#ede9fe' : '#dcfce7'})`,
          border: `1.5px solid ${track === 'B' ? C.purpleBorder : C.greenBorder}`,
          borderRadius: 14, padding: '16px 20px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10, flexShrink: 0,
            background: track === 'B' ? C.purple : C.green,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {track === 'B' ? <Brain size={19} color="white" /> : <BarChart3 size={19} color="white" />}
          </div>
          <div>
            <p style={{ margin: '0 0 2px', fontWeight: 800, fontSize: '.92rem', color: C.dark, fontFamily: 'Fraunces, Georgia, serif' }}>
              {track === 'A' ? 'Empirical Track' : 'Theoretical Track'}
            </p>
            <p style={{ margin: 0, fontSize: '.75rem', color: C.muted }}>
              {track === 'A'
                ? 'Will generate: dataset methodology, algorithms, evaluation metrics, baseline comparison'
                : 'Will generate: theoretical framework, scholarly debates, analytical methodology, positionality'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map(([label, value]) => (
            <div key={label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 14px', background: C.white,
              border: `1.5px solid ${C.border}`, borderRadius: 10,
            }}>
              <span style={{ fontSize: '.81rem', color: C.muted, fontWeight: 600 }}>{label}</span>
              <span style={{ fontSize: '.81rem', color: C.dark, fontWeight: 700, maxWidth: '56%', textAlign: 'right', lineHeight: 1.3 }}>{value}</span>
            </div>
          ))}
        </div>

        {error && (
          <div style={{
            marginTop: 14, padding: '12px 16px',
            background: '#fef2f2', border: `1.5px solid #fecaca`, borderRadius: 10,
            display: 'flex', gap: 8, alignItems: 'flex-start',
          }}>
            <AlertTriangle size={14} color={C.red} style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: '.82rem', color: C.red, fontWeight: 600 }}>{error}</p>
          </div>
        )}
      </div>
    )
  }

  // ─── Layout ───────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 0 100px' }}>
      <style>{`
        .gen-spin { animation: genspin .9s linear infinite; display: inline-block; }
        @keyframes genspin { to { transform: rotate(360deg); } }
        .gen-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        @media (max-width: 560px) {
          .gen-steplabel { display: none; }
          .gen-card { padding: 20px 16px !important; }
          .gen-nav {
            position: fixed; bottom: calc(64px + env(safe-area-inset-bottom, 0px));
            left: 0; right: 0; z-index: 40; margin-top: 0 !important;
            padding: 10px 16px; background: rgba(255,255,255,.97);
            backdrop-filter: blur(12px); border-top: 1px solid #e8ede8;
          }
          .gen-track-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <button onClick={() => router.push('/dashboard')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '.8rem', fontWeight: 600, padding: '0 0 14px' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = C.dark}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = C.muted}
        >
          <ArrowLeft size={13} /> Dashboard
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h1 style={{ margin: '0 0 6px', fontWeight: 900, fontSize: 'clamp(1.4rem,2.5vw,1.8rem)', color: C.dark, letterSpacing: '-.03em', fontFamily: 'Fraunces, Georgia, serif' }}>
              Generate Your Spec
            </h1>
            <p style={{ margin: 0, fontSize: '.87rem', color: C.muted, lineHeight: 1.5 }}>
              AI builds your research specification — properly, not generically.
            </p>
          </div>

          {/* Live track badge — uses Empirical/Theoretical labels */}
          {confirmedTrack && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 999,
              background: track === 'B' ? C.purple : C.green,
              color: 'white', fontSize: '.75rem', fontWeight: 700,
            }}>
              {track === 'B' ? <Brain size={12} color="white" /> : <BarChart3 size={12} color="white" />}
              {track === 'A' ? 'Empirical Track' : 'Theoretical Track'}
            </div>
          )}
        </div>
      </div>

      {/* Stepper */}
      <Stepper step={step} track={track} />

      {/* Card */}
      <div className="gen-card" style={{
        background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 20,
        padding: '28px 30px', minHeight: 420,
        boxShadow: '0 2px 8px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.04)',
      }}>
        {step === 1 && renderStep1()}
        {step === 2 && (
          <Step2FileUploads
            files={files}
            updateFiles={updateFiles}
            datasetState={datasetState}
            updateDatasetState={setDatasetState}
            track={track}
          />
        )}
        {step === 3 && (
          <Step3Questions
            track={track}
            answersA={answersA}
            answersB={answersB}
            updateA={setAnswersA}
            updateB={setAnswersB}
            researchTopic={formData.research_topic}
            fieldOfStudy={formData.field_of_study}
          />
        )}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
      </div>

      {/* Navigation */}
      <div className="gen-nav" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, alignItems: 'center' }}>
        <button
          onClick={() => { setError(null); setStep(s => Math.max(1, s - 1)) }}
          disabled={step === 1}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '12px 22px', borderRadius: 12,
            border: `1.5px solid ${C.border}`, background: C.white,
            color: step === 1 ? C.border : C.muted,
            fontWeight: 700, fontSize: '.85rem', cursor: step === 1 ? 'default' : 'pointer', transition: 'all .15s',
          }}
          onMouseEnter={e => { if (step > 1) (e.currentTarget as HTMLElement).style.borderColor = C.dark }}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = C.border}
        >
          <ArrowLeft size={13} /> Back
        </button>

        <span style={{ fontSize: '.75rem', color: C.muted, fontWeight: 600 }}>{step} of {STEPS.length}</span>

        {step < 5 ? (
          <button
            onClick={() => { setError(null); setStep(s => s + 1) }}
            disabled={!canProceed()}
            className="gen-btn"
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '12px 24px', borderRadius: 12, border: 'none',
              background: canProceed() ? (track === 'B' ? C.purple : C.dark) : C.border,
              color: canProceed() ? 'white' : C.muted,
              fontWeight: 700, fontSize: '.85rem',
              cursor: canProceed() ? 'pointer' : 'default',
              transition: 'all .15s', boxShadow: canProceed() ? '0 2px 8px rgba(0,0,0,.15)' : 'none',
            }}
          >
            Continue <ArrowRight size={13} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="gen-btn"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '13px 28px', borderRadius: 12, border: 'none',
              background: isPending ? C.border : `linear-gradient(135deg, ${C.green}, #22c55e)`,
              color: isPending ? C.muted : 'white',
              fontWeight: 800, fontSize: '.92rem',
              cursor: isPending ? 'default' : 'pointer',
              transition: 'all .2s',
              boxShadow: isPending ? 'none' : '0 4px 16px rgba(22,163,74,.35)',
            }}
          >
            {isPending ? <><span className="gen-spin">◌</span> Generating…</> : <><Sparkles size={15} /> Generate My Spec</>}
          </button>
        )}
      </div>
    </div>
  )
}