'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import axios from 'axios'
import { ArrowLeft, ArrowRight, Sparkles, CheckCircle } from 'lucide-react'
import { useGenerateSpecification } from '@/hooks/useProjects'
import { topicsApi } from '@/lib/api'
import { Step2FileUploads } from '@/components/generate/Step2FileUploads'
import { Step3Questions, TrackAAnswers, TrackBAnswers } from '@/components/generate/Step3Questions'

// ─── Track detection (mirrors backend logic) ──────────────────────────────────
const TRACK_B_FIELDS = [
  'english','literature','history','law','philosophy','linguistics',
  'education','sociology','anthropology','political science','politics',
  'theology','religious','media studies','cultural studies','communication',
  'creative writing','journalism','arts','fine art','gender studies',
  'film','music','theatre','drama','international relations','policy',
]
const TRACK_A_SIGNALS = [
  'machine learning','deep learning','neural network','data science',
  'algorithm','classification','regression','clustering','prediction',
  'dataset','model',' ai ','artificial intelligence','nlp',
  'computer vision','image recognition','sentiment analysis',
  'blockchain','cybersecurity','iot','bioinformatics','genomics',
  'epidemiology','public health data','econometrics','quantitative',
  'simulation','optimization','engineering','software',
]

function detectTrack(field: string, topic: string): 'A' | 'B' {
  const t = (topic || '').toLowerCase()
  for (const s of TRACK_A_SIGNALS) if (t.includes(s)) return 'A'
  const f = field.toLowerCase()
  for (const b of TRACK_B_FIELDS) if (f.includes(b)) return 'B'
  return 'A'
}

const RESEARCH_NATURE_LABELS: Record<string, string> = {
  building_model:      'ML / Prediction model',
  testing_causation:   'Econometric causal study',
  running_survey:      'Survey / Questionnaire study',
  building_system:     'Software system design',
  financial_analysis:  'Quantitative finance / Actuarial',
  not_sure:            'Auto-detect from field and topic',
}

// ─── Stepper ──────────────────────────────────────────────────────────────────
const STEPS = ['Basic Info', 'Documents & Data', 'Quick Questions', 'Configure', 'Review']

function Stepper({ step }: { step: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
      {STEPS.map((label, i) => {
        const idx = i + 1
        const done = idx < step
        const active = idx === step
        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', flex: idx < STEPS.length ? 1 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 44 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: done ? '#16a34a' : active ? '#0f1f0f' : '#f3f4f6',
                border: `2px solid ${done ? '#16a34a' : active ? '#0f1f0f' : '#e8ede8'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all .2s',
              }}>
                {done
                  ? <CheckCircle size={15} color="white" />
                  : <span style={{ fontSize: '.72rem', fontWeight: 700, color: active ? 'white' : '#9ca3af' }}>{idx}</span>
                }
              </div>
              <span style={{ fontSize: '.66rem', fontWeight: active ? 700 : 500, color: active ? '#0f1f0f' : '#9ca3af', whiteSpace: 'nowrap' }}>{label}</span>
            </div>
            {idx < STEPS.length && (
              <div style={{ flex: 1, height: 2, background: done ? '#16a34a' : '#e8ede8', margin: '0 4px', marginBottom: 18, transition: 'background .3s' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Topic Lab banner ─────────────────────────────────────────────────────────
function TopicLabBanner({ topic, onClear }: { topic: string; onClear: () => void }) {
  return (
    <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Sparkles size={14} color="#16a34a" />
        <span style={{ fontSize: '.8rem', color: '#15803d', fontWeight: 600 }}>
          Topic from Topic Lab: <em style={{ fontStyle: 'italic' }}>{topic}</em>
        </span>
      </div>
      <button onClick={onClear} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.73rem', color: '#9ca3af', textDecoration: 'underline' }}>Clear</button>
    </div>
  )
}

// ─── Shared input style ───────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: '100%', padding: '10px 13px', borderRadius: 10,
  border: '1.5px solid #e8ede8', fontSize: '.87rem', color: '#0f1f0f',
  outline: 'none', transition: 'all .2s', background: 'white', boxSizing: 'border-box',
}
const focusInp = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.target.style.borderColor = '#16a34a'; e.target.style.boxShadow = '0 0 0 3px rgba(22,163,74,.1)'
}
const blurInp = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.target.style.borderColor = '#e8ede8'; e.target.style.boxShadow = 'none'
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function GeneratePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { mutateAsync: generateSpec, isPending } = useGenerateSpecification()

  // Step
  const [step, setStep] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [fromTopicsBanner, setFromTopicsBanner] = useState(false)

  // Track (auto-detected)
  const [track, setTrack] = useState<'A' | 'B'>('A')

  // Step 1 data
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
    // Step 2 dataset
    dataset_source: 'public' as 'uploaded' | 'public' | 'scout' | 'self_collected',
    dataset_name: '',
    dataset_url: '',
    dataset_description: '',
    dataset_size: '',
    // Step 3 answers
    data_sensitivity: 'public' as 'public' | 'self_collected' | 'sensitive',
    student_success_statement: '',
    preferred_algorithms: '',  
    research_nature: '',       // WEEK 2: Track A Q3
    theoretical_framework: '',
    central_argument: '',
    primary_source_focus: '',
  })

  // Step 2 files
  const [files, setFiles] = useState<{ guidelines?: File; pastProjects: File[]; datasetFile?: File }>({ pastProjects: [] })
  const [datasetState, setDatasetState] = useState<{ mode: any; file?: File; name?: string; url?: string; description?: string }>({ mode: null })

  // Step 3 answers — preferred_algorithms included from week 2
  const [answersA, setAnswersA] = useState<TrackAAnswers>({
    data_sensitivity: '',
    student_success_statement: '',
    preferred_algorithms: '',
    research_nature: '',          // NEW Q4 — empty = auto-detect (safe default)
  })
  const [answersB, setAnswersB] = useState<TrackBAnswers>({
    theoretical_framework: '',
    central_argument: '',
    primary_source_focus: '',
  })

  // Topic Lab prefill
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
      setTrack(detectTrack(paramField, paramTopic))
    }
  }, [])

  // Re-detect track when field/topic changes
  const updateForm = (k: string, v: any) => {
    setFormData(p => {
      const next = { ...p, [k]: v }
      if (k === 'field_of_study' || k === 'research_topic') {
        setTrack(detectTrack(next.field_of_study, next.research_topic))
      }
      return next
    })
  }

  const updateFiles = (update: any) => setFiles(p => ({ ...p, ...update }))

  // Sync dataset state into formData
  // BUG FIX: also auto-set data_sensitivity for scout and self_collected modes
  // so the user isn't blocked at Step 3 asking about data they haven't picked yet
  useEffect(() => {
    setFormData(p => ({
      ...p,
      dataset_source: (datasetState.mode || 'public') as any,
      dataset_name: datasetState.name || '',
      dataset_url: datasetState.url || '',
      dataset_description: datasetState.description || '',
    }))

    // Auto-answer data_sensitivity based on dataset mode so Step 3 doesn't block
    if (datasetState.mode === 'self_collected') {
      // Self-collected means they ARE collecting data — sensitivity is 'self_collected'
      setAnswersA(prev => ({ ...prev, data_sensitivity: 'self_collected' }))
    } else if (datasetState.mode === 'scout') {
      // AI will find a public dataset — default to 'public', user can override in Step 3
      setAnswersA(prev => ({ ...prev, data_sensitivity: 'public' }))
    }
  }, [datasetState])

  // Sync Step 3 answers into formData
  useEffect(() => {
    if (track === 'A') {
      setFormData(p => ({
        ...p,
        data_sensitivity: (answersA.data_sensitivity || 'public') as any,
        student_success_statement: answersA.student_success_statement,
        preferred_algorithms: answersA.preferred_algorithms,
        research_nature: answersA.research_nature || '',    // NEW Q4
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

  // ── canProceed per step ────────────────────────────────────────────────────
  const canProceed = () => {
    if (step === 1) return !!(formData.field_of_study.trim() && formData.academic_level)
    if (step === 2) {
      if (track === 'A') {
        // Track A: must pick a dataset mode
        if (!datasetState.mode) return false
        // If uploaded mode, must have actual file
        if (datasetState.mode === 'uploaded' && !files.datasetFile) return false
        // If public mode, must have a name
        if (datasetState.mode === 'public' && !datasetState.name?.trim()) return false
        // scout and self_collected: no further input required at Step 2
      }
      return true
    }
    if (step === 3) return track === 'A' ? !!answersA.data_sensitivity : !!answersB.central_argument.trim()
    return true
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError(null)
    try {
      const config = { ...formData }
      // Clean empty strings to undefined
      if (!config.notification_email)        delete (config as any).notification_email
      if (!config.dataset_name)              delete (config as any).dataset_name
      if (!config.dataset_url)               delete (config as any).dataset_url
      if (!config.student_success_statement) delete (config as any).student_success_statement
      if (!config.preferred_algorithms)      delete (config as any).preferred_algorithms  // WEEK 2
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
    setTrack('A')
  }

  // ─── Step 1 ───────────────────────────────────────────────────────────────
  const renderStep1 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: '0 0 4px', fontWeight: 800, color: '#0f1f0f', fontSize: '1.15rem' }}>Basic Information</h2>
        <p style={{ margin: 0, fontSize: '.84rem', color: '#9ca3af' }}>Tell us about your project</p>
      </div>

      {fromTopicsBanner && <TopicLabBanner topic={formData.research_topic} onClear={clearTopicFill} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ display: 'block', fontWeight: 700, fontSize: '.8rem', color: '#374151', marginBottom: 6 }}>Field of Study *</label>
          <input style={inp} placeholder="e.g. Computer Science — Machine Learning" value={formData.field_of_study}
            onChange={e => updateForm('field_of_study', e.target.value)} onFocus={focusInp} onBlur={blurInp} />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 700, fontSize: '.8rem', color: '#374151', marginBottom: 6 }}>Research Topic</label>
          <input style={inp} placeholder="e.g. Heart Disease Prediction using Ensemble Machine Learning" value={formData.research_topic}
            onChange={e => updateForm('research_topic', e.target.value)} onFocus={focusInp} onBlur={blurInp} />
          <p style={{ margin: '4px 0 0', fontSize: '.72rem', color: '#9ca3af' }}>Leave blank and we'll suggest topics based on your field.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '.8rem', color: '#374151', marginBottom: 6 }}>Academic Level *</label>
            <select style={{ ...inp, appearance: 'none', cursor: 'pointer' }} value={formData.academic_level}
              onChange={e => updateForm('academic_level', e.target.value)} onFocus={focusInp} onBlur={blurInp}>
              <option value="BSc">BSc</option>
              <option value="MSc">MSc</option>
              <option value="PhD">PhD</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '.8rem', color: '#374151', marginBottom: 6 }}>Effort Level</label>
            <select style={{ ...inp, appearance: 'none', cursor: 'pointer' }} value={formData.effort_level}
              onChange={e => updateForm('effort_level', e.target.value)} onFocus={focusInp} onBlur={blurInp}>
              <option value="low">Low — fast and safe</option>
              <option value="medium">Medium — standard depth</option>
              <option value="high">High — ambitious and thorough</option>
            </select>
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 700, fontSize: '.8rem', color: '#374151', marginBottom: 6 }}>Email for delivery</label>
          <input style={inp} type="email" placeholder="your@email.com (optional)" value={formData.notification_email}
            onChange={e => updateForm('notification_email', e.target.value)} onFocus={focusInp} onBlur={blurInp} />
        </div>

        {/* Track indicator */}
        {(formData.field_of_study || formData.research_topic) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 13px', borderRadius: 9, background: track === 'A' ? '#f0fdf4' : '#faf5ff', border: `1px solid ${track === 'A' ? '#bbf7d0' : '#e9d5ff'}` }}>
            <Sparkles size={12} color={track === 'A' ? '#16a34a' : '#7c3aed'} />
            <span style={{ fontSize: '.74rem', fontWeight: 700, color: track === 'A' ? '#16a34a' : '#7c3aed' }}>
              {track === 'A' ? 'Empirical / Data project detected — dataset questions ahead' : 'Theoretical / Humanities project detected — framework questions ahead'}
            </span>
          </div>
        )}
      </div>
    </div>
  )

  // ─── Step 4: Configure ────────────────────────────────────────────────────
  const renderStep4 = () => {
    const MODES = [
      { value: 'user_provided', label: 'My uploaded files only', sub: 'Use only the past projects you uploaded' },
      { value: 'auto_discover', label: 'Auto-discover online', sub: 'AI finds similar theses online' },
      { value: 'hybrid', label: 'Both (Recommended)', sub: 'Your files + online discovery' },
    ]
    return (
      <div>
        <div style={{ marginBottom: 22 }}>
          <h2 style={{ margin: '0 0 4px', fontWeight: 800, color: '#0f1f0f', fontSize: '1.15rem' }}>Configure Generation</h2>
          <p style={{ margin: 0, fontSize: '.84rem', color: '#9ca3af' }}>Tweak how the AI researches and builds your spec</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'white', border: '1.5px solid #e8ede8', borderRadius: 14, padding: '18px 20px' }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '.84rem', color: '#0f1f0f', marginBottom: 10 }}>Past Projects Discovery</label>
            {MODES.map(m => (
              <button key={m.value} onClick={() => updateForm('past_projects_mode', m.value)}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 9, marginBottom: 7, border: `1.5px solid ${formData.past_projects_mode === m.value ? '#16a34a' : '#e8ede8'}`, background: formData.past_projects_mode === m.value ? '#f0fdf4' : 'white', cursor: 'pointer', textAlign: 'left', transition: 'all .15s' }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${formData.past_projects_mode === m.value ? '#16a34a' : '#d1d5db'}`, background: formData.past_projects_mode === m.value ? '#16a34a' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  {formData.past_projects_mode === m.value && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'white' }} />}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '.83rem', color: '#0f1f0f' }}>{m.label}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '.73rem', color: '#6b7280' }}>{m.sub}</p>
                </div>
              </button>
            ))}
          </div>
          <div style={{ background: 'white', border: '1.5px solid #e8ede8', borderRadius: 14, padding: '18px 20px' }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '.84rem', color: '#0f1f0f', marginBottom: 10 }}>Review Iterations</label>
            <p style={{ margin: '0 0 10px', fontSize: '.76rem', color: '#6b7280', lineHeight: 1.5 }}>How many times should the AI professor review and revise before finalising?</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[1, 2, 3].map(n => (
                <button key={n} onClick={() => updateForm('max_iterations', n)}
                  style={{ flex: 1, padding: '9px', borderRadius: 9, border: `1.5px solid ${formData.max_iterations === n ? '#16a34a' : '#e8ede8'}`, background: formData.max_iterations === n ? '#f0fdf4' : 'white', fontWeight: 700, fontSize: '.84rem', color: formData.max_iterations === n ? '#16a34a' : '#374151', cursor: 'pointer', transition: 'all .15s' }}>
                  {n}×
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Step 5: Review ───────────────────────────────────────────────────────
  const renderStep5 = () => (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: '0 0 4px', fontWeight: 800, color: '#0f1f0f', fontSize: '1.15rem' }}>Review & Generate</h2>
        <p style={{ margin: 0, fontSize: '.84rem', color: '#9ca3af' }}>Everything looks good — ready to go</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          ['Research Topic', formData.research_topic || 'AI will suggest a topic'],
          ['Field', formData.field_of_study],
          ['Level', formData.academic_level],
          ['Track', track === 'A' ? 'Empirical / Data (Track A)' : 'Theoretical / Humanities (Track B)'],
          ['Effort', formData.effort_level],
          ['Dataset', formData.dataset_name || formData.dataset_source || 'AI will scout'],
          ...(formData.preferred_algorithms ? [['Algorithms', formData.preferred_algorithms]] : []),
          ...(formData.research_nature && formData.research_nature !== 'not_sure'
            ? [['Study Type', RESEARCH_NATURE_LABELS[formData.research_nature] || formData.research_nature]]
            : []),
          ['Guidelines', files.guidelines?.name || 'Using standard defaults'],
          ['Past Projects', files.pastProjects.length ? `${files.pastProjects.length} file(s) uploaded` : 'AI auto-discover'],
          ['Iterations', `${formData.max_iterations}`],
          ...(formData.notification_email ? [['Email', formData.notification_email]] : []),
        ].map(([label, value]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'white', border: '1.5px solid #e8ede8', borderRadius: 10 }}>
            <span style={{ fontSize: '.82rem', color: '#6b7280', fontWeight: 600 }}>{label}</span>
            <span style={{ fontSize: '.82rem', color: '#0f1f0f', fontWeight: 700, maxWidth: '55%', textAlign: 'right' }}>{value}</span>
          </div>
        ))}
      </div>
      {error && (
        <div style={{ marginTop: 14, padding: '11px 14px', background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 10 }}>
          <p style={{ margin: 0, fontSize: '.82rem', color: '#dc2626', fontWeight: 600 }}>{error}</p>
        </div>
      )}
    </div>
  )

  // ─── Layout ───────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 80px' }}>
      <style>{`.spin{animation:sp .9s linear infinite;display:inline-block}@keyframes sp{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <button onClick={() => router.push('/dashboard')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '.8rem', fontWeight: 600, padding: 0, marginBottom: 12 }}>
          <ArrowLeft size={14} /> Dashboard
        </button>
        <h1 style={{ margin: '0 0 4px', fontWeight: 900, fontSize: '1.5rem', color: '#0f1f0f', letterSpacing: '-.02em' }}>Generate Specification</h1>
        <p style={{ margin: 0, fontSize: '.87rem', color: '#9ca3af' }}>AI builds your academic project specification in minutes</p>
      </div>

      {/* Stepper */}
      <Stepper step={step} />

      {/* Card */}
      <div style={{ background: '#fafafa', border: '1.5px solid #e8ede8', borderRadius: 18, padding: '26px 28px', minHeight: 400 }}>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18 }}>
        <button
          onClick={() => { setError(null); setStep(s => Math.max(1, s - 1)) }}
          disabled={step === 1}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '11px 20px', borderRadius: 11, border: '1.5px solid #e8ede8', background: 'white', color: step === 1 ? '#d1d5db' : '#374151', fontWeight: 700, fontSize: '.85rem', cursor: step === 1 ? 'default' : 'pointer' }}
        >
          <ArrowLeft size={14} /> Back
        </button>

        {step < 5 ? (
          <button
            onClick={() => { setError(null); setStep(s => s + 1) }}
            disabled={!canProceed()}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '11px 22px', borderRadius: 11, border: 'none', background: canProceed() ? '#0f1f0f' : '#e8ede8', color: canProceed() ? 'white' : '#9ca3af', fontWeight: 700, fontSize: '.85rem', cursor: canProceed() ? 'pointer' : 'default', transition: 'all .15s' }}
          >
            Continue <ArrowRight size={14} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isPending}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 26px', borderRadius: 11, border: 'none', background: isPending ? '#e8ede8' : '#16a34a', color: isPending ? '#9ca3af' : 'white', fontWeight: 800, fontSize: '.9rem', cursor: isPending ? 'default' : 'pointer', transition: 'all .15s' }}
          >
            {isPending ? (
              <><span className="spin">◌</span> Generating…</>
            ) : (
              <><Sparkles size={15} /> Generate My Spec</>
            )}
          </button>
        )}
      </div>
    </div>
  )
}