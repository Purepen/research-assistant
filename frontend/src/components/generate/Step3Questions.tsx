'use client'

import { useState } from 'react'
import { Brain, CheckCircle, ChevronDown, ChevronRight, Sparkles, Cpu } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface TrackAAnswers {
  data_sensitivity: 'public' | 'self_collected' | 'sensitive' | ''
  student_success_statement: string
  preferred_algorithms: string
  // NEW Q4: plain-English study type — maps to ResearchParadigm on backend
  // Empty string = "not sure" = auto-detect from field+topic (safe default)
  research_nature: string
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

// ─── Shared styles ────────────────────────────────────────────────────────────

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

const card: React.CSSProperties = {
  background: 'white',
  border: '1.5px solid #e8ede8',
  borderRadius: 16,
  padding: '20px 22px',
  boxShadow: '0 1px 4px rgba(15,31,15,.04), 0 4px 16px rgba(15,31,15,.04)',
  position: 'relative',
  overflow: 'hidden',
}

// ─── Data sensitivity options (unchanged) ─────────────────────────────────────

const DATA_SENSITIVITY_OPTIONS = [
  {
    id: 'public',
    label: 'I will use publicly available data',
    sub: 'Kaggle, UCI, open-access repositories — no consent needed',
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
  },
  {
    id: 'self_collected',
    label: 'I will collect my own data',
    sub: 'Surveys, interviews, experiments — ethics approval likely needed',
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
  },
  {
    id: 'sensitive',
    label: 'I will use restricted / sensitive data',
    sub: 'Hospital records, personal data, proprietary datasets',
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
  },
]

// ─── Research nature options (NEW Q4) ────────────────────────────────────────
// Written for a clueless student — no technical jargon, just plain descriptions.
// The `value` maps to ResearchParadigm in the backend.

const RESEARCH_NATURE_OPTIONS = [
  {
    value: 'building_model',
    label: 'Building a model that makes predictions or classifications',
    sub: 'e.g. "Will a patient get disease X?" · "Is this email spam?" · "Which category does this belong to?"',
    icon: '🤖',
    color: '#7c3aed',
    bg: '#faf5ff',
    border: '#e9d5ff',
  },
  {
    value: 'testing_causation',
    label: 'Testing whether something causes or affects something else',
    sub: 'e.g. "Does investment X increase jobs?" · "What factors explain GDP?" · "Does policy Y reduce poverty?"',
    icon: '📊',
    color: '#0369a1',
    bg: '#f0f9ff',
    border: '#bae6fd',
  },
  {
    value: 'running_survey',
    label: 'Running a survey or collecting responses from people',
    sub: 'e.g. "Questionnaire about attitudes, behaviour, or perceptions" · Likert scale study',
    icon: '📋',
    color: '#0891b2',
    bg: '#ecfeff',
    border: '#a5f3fc',
  },
  {
    value: 'building_system',
    label: 'Designing or building a software system or application',
    sub: 'e.g. "Web app, mobile app, REST API, database system" · Evaluating it for performance',
    icon: '🖥️',
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
  },
  {
    value: 'financial_analysis',
    label: 'Analysing financial markets, prices, or investment risk',
    sub: 'e.g. "Stock volatility, portfolio risk, VaR, GARCH modelling" · Actuarial / quant finance',
    icon: '📈',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
  },
  {
    value: 'not_sure',
    label: "I'm not sure yet — let the AI decide",
    sub: 'The system will auto-detect based on your field and topic. You can always change it later.',
    icon: '🤔',
    color: '#6b7280',
    bg: '#f9fafb',
    border: '#e5e7eb',
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function CardAccent({ color }: { color: string }) {
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: 4,
      height: '100%',
      background: color,
      borderRadius: '16px 0 0 16px',
    }} />
  )
}

function QuestionLabel({ n, text, color = '#16a34a', bg = '#f0fdf4', border = '#bbf7d0' }: {
  n: number; text: string; color?: string; bg?: string; border?: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
      <div style={{
        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
        background: bg, border: `1.5px solid ${border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '.72rem', fontWeight: 800, color,
      }}>
        {n}
      </div>
      <p style={{ margin: 0, fontWeight: 700, color: '#0f1f0f', fontSize: '.92rem', lineHeight: 1.35 }}>
        {text}
      </p>
    </div>
  )
}

function WhyNote({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginTop: 10 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#9ca3af', fontSize: '.72rem', fontWeight: 600, padding: 0,
        }}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        Why does this matter?
      </button>
      <AnimatePresence>
        {open && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              margin: '6px 0 0', fontSize: '.76rem', color: '#6b7280',
              lineHeight: 1.6, borderLeft: '2px solid #e8ede8', paddingLeft: 10,
            }}
          >
            {text}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Track A Questions ────────────────────────────────────────────────────────

function TrackAQuestions({ answers, update, topic, field }: {
  answers: TrackAAnswers
  update: (a: TrackAAnswers) => void
  topic: string
  field: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Q1 — Data sensitivity (unchanged) */}
      <div style={card}>
        <CardAccent color="#16a34a" />
        <QuestionLabel n={1} text="Where is your data coming from?" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {DATA_SENSITIVITY_OPTIONS.map(opt => {
            const selected = answers.data_sensitivity === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => update({ ...answers, data_sensitivity: opt.id as TrackAAnswers['data_sensitivity'] })}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                  border: `1.5px solid ${selected ? opt.border : '#e8ede8'}`,
                  background: selected ? opt.bg : 'white',
                  transition: 'all .15s', textAlign: 'left',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                  border: `2px solid ${selected ? opt.color : '#d1d5db'}`,
                  background: selected ? opt.color : 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {selected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'white' }} />}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '.84rem', color: selected ? opt.color : '#374151' }}>
                    {opt.label}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '.74rem', color: '#6b7280', lineHeight: 1.4 }}>
                    {opt.sub}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
        <WhyNote text="This determines the ethics statement that goes into your methodology section — an examiner will specifically look for it." />
      </div>

      {/* Q2 — Success statement (unchanged) */}
      <div style={card}>
        <CardAccent color="#16a34a" />
        <QuestionLabel n={2} text="What would success look like for this project?" />
        <p style={{ margin: '0 0 11px', fontSize: '.78rem', color: '#6b7280', lineHeight: 1.55 }}>
          In your own words — what result would make you happy to show your supervisor?
        </p>
        <textarea
          placeholder={`e.g. "I want to beat the existing 85% accuracy benchmark" · "A working system that processes 100 requests/sec" · "Show that X significantly affects Y"`}
          value={answers.student_success_statement}
          onChange={e => update({ ...answers, student_success_statement: e.target.value })}
          rows={3}
          style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }}
          onFocus={e => { e.target.style.borderColor = '#16a34a'; e.target.style.boxShadow = '0 0 0 3px rgba(22,163,74,.1)' }}
          onBlur={e => { e.target.style.borderColor = '#e8ede8'; e.target.style.boxShadow = 'none' }}
        />
        <WhyNote text="Your answer shapes the objectives section — the AI writes 'to achieve X as defined by the student' which is always stronger than a generic objective." />
      </div>

      {/* Q3 — Algorithm preferences (unchanged) */}
      <div style={card}>
        <CardAccent color="#059669" />
        <div style={{
          position: 'absolute', top: 14, right: 16,
          fontSize: '.67rem', fontWeight: 700, color: '#6b7280',
          background: '#f9fafb', border: '1px solid #e5e7eb',
          borderRadius: 999, padding: '2px 8px',
        }}>Optional</div>
        <QuestionLabel n={3} text="Which methods or techniques are you thinking of using?" color="#059669" bg="#f0fdf4" border="#6ee7b7" />
        <p style={{ margin: '0 0 11px', fontSize: '.78rem', color: '#6b7280', lineHeight: 1.55 }}>
          Don't know yet? Leave it blank and the AI will choose based on your topic and the literature it reads.
        </p>
        <input
          type="text"
          placeholder={`ML: "Random Forest, XGBoost, LSTM" · Stats: "OLS, PSM, Fixed Effects" · Survey: "Likert, regression, SPSS"`}
          value={answers.preferred_algorithms}
          onChange={e => update({ ...answers, preferred_algorithms: e.target.value })}
          style={inp}
          onFocus={e => { e.target.style.borderColor = '#059669'; e.target.style.boxShadow = '0 0 0 3px rgba(5,150,105,.1)' }}
          onBlur={e => { e.target.style.borderColor = '#e8ede8'; e.target.style.boxShadow = 'none' }}
        />
        {/* Chip shortcuts */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {['Random Forest', 'XGBoost', 'LSTM', 'BERT', 'OLS Regression', 'PSM', 'Likert + Regression'].map(alg => (
            <button
              key={alg}
              onClick={() => {
                const current = answers.preferred_algorithms.trim()
                const already = current.toLowerCase().includes(alg.toLowerCase())
                if (!already) {
                  update({ ...answers, preferred_algorithms: current ? `${current}, ${alg}` : alg })
                }
              }}
              style={{
                padding: '4px 10px', borderRadius: 999, fontSize: '.71rem', fontWeight: 600,
                cursor: 'pointer', border: '1.5px solid #d1fae5',
                background: '#f0fdf4', color: '#059669', transition: 'all .12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#d1fae5'; e.currentTarget.style.borderColor = '#6ee7b7' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.borderColor = '#d1fae5' }}
            >
              + {alg}
            </button>
          ))}
        </div>
        <WhyNote text="When you name your methods, the AI uses exactly those in the work plan and methodology — instead of guessing. Economists: type 'OLS, PSM'. Survey students: type 'Likert, regression'. ML students: type your algorithms." />
      </div>

      {/* Q4 — Research nature (NEW) */}
      <div style={card}>
        <CardAccent color="#7c3aed" />
        <QuestionLabel n={4} text="What kind of study is this?" color="#7c3aed" bg="#faf5ff" border="#e9d5ff" />
        <p style={{ margin: '0 0 14px', fontSize: '.78rem', color: '#6b7280', lineHeight: 1.55 }}>
          Pick the one that best describes what you're doing. This helps the AI write the right methodology — 
          an economics student and a CS student need very different sections.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {RESEARCH_NATURE_OPTIONS.map(opt => {
            const selected = answers.research_nature === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => update({ ...answers, research_nature: opt.value })}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                  border: `1.5px solid ${selected ? opt.border : '#e8ede8'}`,
                  background: selected ? opt.bg : 'white',
                  transition: 'all .15s', textAlign: 'left',
                }}
              >
                <div style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: 1 }}>{opt.icon}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '.85rem', color: selected ? opt.color : '#374151', lineHeight: 1.3 }}>
                    {opt.label}
                  </p>
                  <p style={{ margin: '3px 0 0', fontSize: '.73rem', color: '#6b7280', lineHeight: 1.45 }}>
                    {opt.sub}
                  </p>
                </div>
                {selected && (
                  <CheckCircle size={16} color={opt.color} style={{ flexShrink: 0, marginTop: 2 }} />
                )}
              </button>
            )
          })}
        </div>
        <WhyNote text="This is the most important question for getting the methodology right. An accounting student testing causal impact needs OLS regression and PSM — not AUC-ROC and scikit-learn. Without this, the AI defaults to machine learning for every empirical project." />
      </div>

    </div>
  )
}

// ─── Track B Questions (unchanged) ───────────────────────────────────────────

function TrackBQuestions({ answers, update, topic, field }: {
  answers: TrackBAnswers
  update: (b: TrackBAnswers) => void
  topic: string
  field: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Q1 — Theoretical framework */}
      <div style={card}>
        <CardAccent color="#7c3aed" />
        <QuestionLabel n={1} text="Which theoretical or analytical lens feels most right for your project?" color="#7c3aed" bg="#faf5ff" border="#e9d5ff" />
        <p style={{ margin: '0 0 11px', fontSize: '.78rem', color: '#6b7280', lineHeight: 1.55 }}>
          E.g. "Postcolonial theory" · "Critical discourse analysis" · "Feminist theory" · "Grounded theory" · "Not sure yet"
        </p>
        <input
          type="text"
          placeholder={`e.g. "Postcolonial theory (Bhabha, 1994)" or "Critical realism" or "Social constructivism"`}
          value={answers.theoretical_framework}
          onChange={e => update({ ...answers, theoretical_framework: e.target.value })}
          style={inp}
          onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,.1)' }}
          onBlur={e => { e.target.style.borderColor = '#e8ede8'; e.target.style.boxShadow = 'none' }}
        />
        <WhyNote text="Examiners in humanities and social sciences award significant marks for clearly stating and justifying your theoretical lens. If you don't know yet, type 'not sure' and the AI will suggest one based on your field." />
      </div>

      {/* Q2 — Central argument */}
      <div style={card}>
        <CardAccent color="#7c3aed" />
        <QuestionLabel n={2} text="In one sentence — what is the main argument or claim of your project?" color="#7c3aed" bg="#faf5ff" border="#e9d5ff" />
        <p style={{ margin: '0 0 11px', fontSize: '.78rem', color: '#6b7280', lineHeight: 1.55 }}>
          This becomes the backbone of your justification, objectives, and conclusion.
        </p>
        <textarea
          placeholder={`e.g. "This project argues that colonial legacy in Nigerian land law continues to shape contemporary property disputes" · Or just your rough idea`}
          value={answers.central_argument}
          onChange={e => update({ ...answers, central_argument: e.target.value })}
          rows={3}
          style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }}
          onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,.1)' }}
          onBlur={e => { e.target.style.borderColor = '#e8ede8'; e.target.style.boxShadow = 'none' }}
        />
        <WhyNote text="The AI will build your justification, objectives, and methodology around it." />
      </div>

      {/* Q3 — Primary source focus */}
      <div style={card}>
        <CardAccent color="#7c3aed" />
        <div style={{
          position: 'absolute', top: 14, right: 16,
          fontSize: '.67rem', fontWeight: 700, color: '#6b7280',
          background: '#f9fafb', border: '1px solid #e5e7eb',
          borderRadius: 999, padding: '2px 8px',
        }}>Optional</div>
        <QuestionLabel n={3} text="Are you focusing on specific texts, an author, a time period, or a place?" color="#7c3aed" bg="#faf5ff" border="#e9d5ff" />
        <p style={{ margin: '0 0 11px', fontSize: '.78rem', color: '#6b7280' }}>
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

  // canProceed: Track A requires data_sensitivity (Q1) to be answered.
  // research_nature (Q4) is not required — empty string is valid ("not sure" = auto-detect).
  const canProceed = track === 'A'
    ? !!answersA.data_sensitivity
    : !!answersB.central_argument

  const trackColor  = track === 'A' ? '#16a34a' : '#7c3aed'
  const trackBg     = track === 'A' ? '#f0fdf4' : '#faf5ff'
  const trackBorder = track === 'A' ? '#bbf7d0' : '#e9d5ff'

  // Detect what paradigm the Q4 answer implies, for the badge
  const paradigmBadge = (): { label: string; color: string; bg: string } | null => {
    if (track !== 'A' || !answersA.research_nature) return null
    const opt = RESEARCH_NATURE_OPTIONS.find(o => o.value === answersA.research_nature)
    if (!opt || opt.value === 'not_sure') return null
    return { label: opt.label.split(' ').slice(0, 4).join(' ') + '…', color: opt.color, bg: opt.bg }
  }
  const badge = paradigmBadge()

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: '0 0 5px', fontWeight: 800, color: '#0f1f0f', fontSize: '1.17rem', fontFamily: 'Fraunces, serif' }}>
          A Few Quick Questions
        </h2>
        <p style={{ margin: '0 0 13px', fontSize: '.84rem', color: '#9ca3af', lineHeight: 1.55 }}>
          {track === 'A'
            ? 'Four questions that ground your specification in real information — not AI guesses.'
            : 'Three questions that give your specification its academic backbone.'}
        </p>

        {/* Track badge (unchanged) */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '5px 12px', borderRadius: 999,
          background: trackBg, border: `1.5px solid ${trackBorder}`,
        }}>
          {track === 'A' ? <Cpu size={12} color={trackColor} /> : <Brain size={12} color={trackColor} />}
          <span style={{ fontSize: '.74rem', fontWeight: 700, color: trackColor }}>
            {track === 'A' ? 'Empirical / Data project (Track A)' : 'Theoretical / Humanities project (Track B)'}
          </span>
          {badge && (
            <span style={{
              fontSize: '.67rem', fontWeight: 700,
              color: badge.color, background: badge.bg,
              padding: '1px 8px', borderRadius: 999, marginLeft: 4,
            }}>
              {badge.label}
            </span>
          )}
        </div>
      </div>

      {/* Questions */}
      {track === 'A' ? (
        <TrackAQuestions
          answers={answersA}
          update={updateA}
          topic={researchTopic}
          field={fieldOfStudy}
        />
      ) : (
        <TrackBQuestions
          answers={answersB}
          update={updateB}
          topic={researchTopic}
          field={fieldOfStudy}
        />
      )}
    </div>
  )
}