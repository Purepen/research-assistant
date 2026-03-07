'use client'

import { useState } from 'react'
import { Brain, CheckCircle, ChevronDown, ChevronRight, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export interface TrackAAnswers {
  data_sensitivity: 'public' | 'self_collected' | 'sensitive' | ''
  student_success_statement: string
}

export interface TrackBAnswers {
  theoretical_framework: string
  central_argument: string
  primary_source_focus: string
}

interface Step3Props {
  track: 'A' | 'B'
  answersA: TrackAAnswers
  answersB: TrackBAnswers
  updateA: (a: TrackAAnswers) => void
  updateB: (b: TrackBAnswers) => void
  researchTopic: string
  fieldOfStudy: string
}

const inp: React.CSSProperties = {
  width: '100%',
  padding: '10px 13px',
  border: '1.5px solid #e8ede8',
  borderRadius: 10,
  fontSize: '.86rem',
  color: '#0f1f0f',
  outline: 'none',
  transition: 'border-color .2s, box-shadow .2s',
  background: 'white',
  boxSizing: 'border-box',
}

const DATA_SENSITIVITY_OPTIONS = [
  {
    id: 'public',
    label: 'I will use publicly available data',
    sub: 'Kaggle, UCI, open-access repositories — no consent needed',
    color: '#16a34a',
    bg: '#f0fdf4',
  },
  {
    id: 'self_collected',
    label: 'I will collect my own data',
    sub: 'Surveys, interviews, experiments — ethics approval likely needed',
    color: '#2563eb',
    bg: '#eff6ff',
  },
  {
    id: 'sensitive',
    label: 'I will use restricted / sensitive data',
    sub: 'Hospital records, personal data, proprietary datasets',
    color: '#dc2626',
    bg: '#fef2f2',
  },
]

function QuestionLabel({ n, text }: { n: number; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
      <div style={{ width: 24, height: 24, borderRadius: 7, background: '#f0fdf4', border: '1.5px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800, fontSize: '.72rem', color: '#16a34a' }}>{n}</div>
      <p style={{ margin: 0, fontWeight: 700, fontSize: '.87rem', color: '#0f1f0f', lineHeight: 1.4 }}>{text}</p>
    </div>
  )
}

function WhyNote({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '.73rem', padding: 0 }}
      >
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        Why do we ask this?
      </button>
      <AnimatePresence>
        {open && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ margin: '6px 0 0', fontSize: '.76rem', color: '#6b7280', lineHeight: 1.6, paddingLeft: 18, borderLeft: '2px solid #e8ede8' }}>
            {text}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Track A Questions ────────────────────────────────────────────────────────

function TrackAQuestions({ answers, update, topic }: {
  answers: TrackAAnswers
  update: (a: TrackAAnswers) => void
  topic: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Q1 — Data sensitivity */}
      <div style={{ background: 'white', border: '1.5px solid #e8ede8', borderRadius: 14, padding: '18px 20px' }}>
        <QuestionLabel n={1} text="Is your data publicly available, or will you need to collect or access it yourself?" />
        <p style={{ margin: '0 0 12px', fontSize: '.78rem', color: '#6b7280', lineHeight: 1.5 }}>
          This shapes the ethics section of your specification — required by every university.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {DATA_SENSITIVITY_OPTIONS.map(opt => {
            const selected = answers.data_sensitivity === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => update({ ...answers, data_sensitivity: opt.id as any })}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 13px',
                  border: `1.5px solid ${selected ? opt.color : '#e8ede8'}`,
                  borderRadius: 10, background: selected ? opt.bg : 'white',
                  cursor: 'pointer', textAlign: 'left', transition: 'all .15s',
                }}
              >
                <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${selected ? opt.color : '#d1d5db'}`, background: selected ? opt.color : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  {selected && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'white' }} />}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '.83rem', color: '#0f1f0f', lineHeight: 1.3 }}>{opt.label}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '.74rem', color: '#6b7280', lineHeight: 1.4 }}>{opt.sub}</p>
                </div>
              </button>
            )
          })}
        </div>
        <WhyNote text="Examiners require an ethics statement in the methodology section. Your answer determines what gets written — public data means no consent needed; collected data means you need ethical approval." />
      </div>

      {/* Q2 — Success statement */}
      <div style={{ background: 'white', border: '1.5px solid #e8ede8', borderRadius: 14, padding: '18px 20px' }}>
        <QuestionLabel n={2} text="What would success look like for your project — what should it do well?" />
        <p style={{ margin: '0 0 10px', fontSize: '.78rem', color: '#6b7280', lineHeight: 1.5 }}>
          Describe it like you're telling a friend. Don't worry about technical language.
        </p>
        <textarea
          placeholder={`e.g. "I want the model to accurately predict heart disease early enough to help doctors, even when the data is messy or imbalanced"`}
          value={answers.student_success_statement}
          onChange={e => update({ ...answers, student_success_statement: e.target.value })}
          rows={3}
          style={{ ...inp, resize: 'vertical' }}
          onFocus={e => { e.target.style.borderColor = '#16a34a'; e.target.style.boxShadow = '0 0 0 3px rgba(22,163,74,.1)' }}
          onBlur={e => { e.target.style.borderColor = '#e8ede8'; e.target.style.boxShadow = 'none' }}
        />
        <WhyNote text="This tells the AI what your project is actually trying to achieve — not just technically, but in terms of real-world value. It becomes the foundation for your abstract and justification sections." />
      </div>
    </div>
  )
}

// ─── Track B Questions ────────────────────────────────────────────────────────

function TrackBQuestions({ answers, update, topic, field }: {
  answers: TrackBAnswers
  update: (b: TrackBAnswers) => void
  topic: string
  field: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Q1 — Theoretical framework */}
      <div style={{ background: 'white', border: '1.5px solid #e8ede8', borderRadius: 14, padding: '18px 20px' }}>
        <QuestionLabel n={1} text="Which theoretical or analytical lens feels most right for your project?" />
        <p style={{ margin: '0 0 10px', fontSize: '.78rem', color: '#6b7280', lineHeight: 1.5 }}>
          If you're not sure, describe how you want to approach the material — the AI will suggest a framework.
        </p>
        <input
          type="text"
          placeholder={`e.g. "Postcolonial theory", "Feminist lens", "Critical discourse analysis", "Not sure yet"`}
          value={answers.theoretical_framework}
          onChange={e => update({ ...answers, theoretical_framework: e.target.value })}
          style={inp}
          onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,.1)' }}
          onBlur={e => { e.target.style.borderColor = '#e8ede8'; e.target.style.boxShadow = 'none' }}
        />
        <WhyNote text="Every humanities and social science dissertation needs a named theoretical lens. It shows examiners you know how to position your work within the scholarly conversation." />
      </div>

      {/* Q2 — Central argument */}
      <div style={{ background: 'white', border: '1.5px solid #e8ede8', borderRadius: 14, padding: '18px 20px' }}>
        <QuestionLabel n={2} text="What's the main argument or question you want to answer — in one sentence?" />
        <p style={{ margin: '0 0 10px', fontSize: '.78rem', color: '#6b7280', lineHeight: 1.5 }}>
          Don't overthink it. Even a rough version helps the AI build your justification section.
        </p>
        <textarea
          placeholder={`e.g. "I want to argue that Achebe's trilogy reclaims African identity from colonial narratives by inverting the European gaze"`}
          value={answers.central_argument}
          onChange={e => update({ ...answers, central_argument: e.target.value })}
          rows={3}
          style={{ ...inp, resize: 'vertical' }}
          onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,.1)' }}
          onBlur={e => { e.target.style.borderColor = '#e8ede8'; e.target.style.boxShadow = 'none' }}
        />
        <WhyNote text="This becomes the spine of your specification. The AI will build your justification, objectives, and methodology around it." />
      </div>

      {/* Q3 — Primary source focus */}
      <div style={{ background: 'white', border: '1.5px solid #e8ede8', borderRadius: 14, padding: '18px 20px' }}>
        <QuestionLabel n={3} text="Are you focusing on specific texts, an author, a time period, or a place?" />
        <p style={{ margin: '0 0 10px', fontSize: '.78rem', color: '#6b7280' }}>
          Optional — skip if it's broad.
        </p>
        <input
          type="text"
          placeholder={`e.g. "Chinua Achebe's trilogy, 1958–1964" or "Victorian literature 1837–1901" or "West African legal frameworks"`}
          value={answers.primary_source_focus}
          onChange={e => update({ ...answers, primary_source_focus: e.target.value })}
          style={inp}
          onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,.1)' }}
          onBlur={e => { e.target.style.borderColor = '#e8ede8'; e.target.style.boxShadow = 'none' }}
        />
        <WhyNote text="Naming your primary sources helps the AI write a more specific and credible methodology section." />
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Step3Questions({
  track, answersA, answersB, updateA, updateB, researchTopic, fieldOfStudy
}: Step3Props) {

  const canProceed = track === 'A'
    ? !!answersA.data_sensitivity
    : !!answersB.central_argument

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: '0 0 4px', fontWeight: 800, color: '#0f1f0f', fontSize: '1.15rem' }}>
          A Few Quick Questions
        </h2>
        <p style={{ margin: '0 0 12px', fontSize: '.84rem', color: '#9ca3af', lineHeight: 1.5 }}>
          {track === 'A'
            ? 'Two questions that ground your specification in real, verifiable information — not AI guesses.'
            : 'Three questions that give your specification its academic backbone.'}
        </p>

        {/* Track badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 8, background: track === 'A' ? '#f0fdf4' : '#faf5ff', border: `1px solid ${track === 'A' ? '#bbf7d0' : '#e9d5ff'}` }}>
          <Sparkles size={12} color={track === 'A' ? '#16a34a' : '#7c3aed'} />
          <span style={{ fontSize: '.74rem', fontWeight: 700, color: track === 'A' ? '#16a34a' : '#7c3aed' }}>
            {track === 'A' ? 'Empirical / Data Project' : 'Theoretical / Humanities Project'}
          </span>
        </div>
      </div>

      {track === 'A' ? (
        <TrackAQuestions answers={answersA} update={updateA} topic={researchTopic} />
      ) : (
        <TrackBQuestions answers={answersB} update={updateB} topic={researchTopic} field={fieldOfStudy} />
      )}

      {/* Completion hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: canProceed ? 1 : 0 }}
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 18, padding: '11px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10 }}
      >
        <CheckCircle size={15} color="#16a34a" />
        <span style={{ fontSize: '.78rem', color: '#16a34a', fontWeight: 600 }}>
          Ready — your answers are locked in. Click Continue to generate.
        </span>
      </motion.div>
    </div>
  )
}
