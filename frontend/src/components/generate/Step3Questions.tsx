'use client'

import { useState } from 'react'
import { Brain, CheckCircle, ChevronDown, ChevronRight, Sparkles, Cpu } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface TrackAAnswers {
  data_sensitivity: 'public' | 'self_collected' | 'sensitive' | ''
  student_success_statement: string
  // WEEK 2: student's algorithm preferences — feeds _pick_algorithms() priority 1
  preferred_algorithms: string
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

// ─── Data sensitivity options ─────────────────────────────────────────────────

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function QuestionLabel({ n, text, color = '#16a34a', bg = '#f0fdf4', border = '#bbf7d0' }: {
  n: number; text: string; color?: string; bg?: string; border?: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
      <div style={{
        width: 26, height: 26, borderRadius: 8,
        background: bg, border: `1.5px solid ${border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontWeight: 800, fontSize: '.72rem', color,
        boxShadow: `0 0 0 3px ${bg}`,
      }}>{n}</div>
      <p style={{ margin: 0, fontWeight: 700, fontSize: '.88rem', color: '#0f1f0f', lineHeight: 1.45 }}>{text}</p>
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
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#9ca3af', fontSize: '.73rem', padding: 0,
          transition: 'color .15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#6b7280')}
        onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
      >
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        Why do we ask this?
      </button>
      <AnimatePresence>
        {open && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: .2 }}
            style={{
              margin: '8px 0 0', fontSize: '.76rem', color: '#6b7280',
              lineHeight: 1.65, paddingLeft: 18,
              borderLeft: '2px solid #e8ede8',
            }}>
            {text}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

function CardAccent({ color }: { color: string }) {
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0,
      height: 3, background: `linear-gradient(90deg, ${color}60 0%, ${color} 40%, ${color}60 100%)`,
      borderRadius: '16px 16px 0 0',
    }} />
  )
}

// ─── Track A Questions ────────────────────────────────────────────────────────

function TrackAQuestions({ answers, update, topic }: {
  answers: TrackAAnswers
  update: (a: TrackAAnswers) => void
  topic: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Q1 — Data sensitivity */}
      <div style={card}>
        <CardAccent color="#16a34a" />
        <QuestionLabel n={1} text="Is your data publicly available, or will you need to collect or access it yourself?" />
        <p style={{ margin: '0 0 13px', fontSize: '.78rem', color: '#6b7280', lineHeight: 1.55 }}>
          This shapes the ethics section of your specification — required by every university.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {DATA_SENSITIVITY_OPTIONS.map(opt => {
            const selected = answers.data_sensitivity === opt.id
            return (
              <motion.button
                key={opt.id}
                onClick={() => update({ ...answers, data_sensitivity: opt.id as any })}
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: .998 }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
                  border: `1.5px solid ${selected ? opt.border : '#e8ede8'}`,
                  borderRadius: 11, background: selected ? opt.bg : 'white',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'border-color .15s, background .15s, box-shadow .15s',
                  boxShadow: selected ? `0 0 0 3px ${opt.color}14` : 'none',
                }}
              >
                <div style={{
                  width: 19, height: 19, borderRadius: '50%',
                  border: `2px solid ${selected ? opt.color : '#d1d5db'}`,
                  background: selected ? opt.color : 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginTop: 1,
                  transition: 'all .15s',
                }}>
                  {selected && (
                    <motion.div
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      style={{ width: 7, height: 7, borderRadius: '50%', background: 'white' }}
                    />
                  )}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '.84rem', color: '#0f1f0f', lineHeight: 1.3 }}>{opt.label}</p>
                  <p style={{ margin: '3px 0 0', fontSize: '.74rem', color: '#6b7280', lineHeight: 1.4 }}>{opt.sub}</p>
                </div>
              </motion.button>
            )
          })}
        </div>
        <WhyNote text="Examiners require an ethics statement in the methodology section. Your answer determines what gets written — public data means no consent needed; collected data means you need ethical approval." />
      </div>

      {/* Q2 — Success statement */}
      <div style={card}>
        <CardAccent color="#16a34a" />
        <QuestionLabel n={2} text="What would success look like for your project — what should it do well?" />
        <p style={{ margin: '0 0 11px', fontSize: '.78rem', color: '#6b7280', lineHeight: 1.55 }}>
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

      {/* Q3 — Preferred algorithms (WEEK 2) */}
      <div style={card}>
        <CardAccent color="#059669" />
        {/* Optional badge */}
        <div style={{
          position: 'absolute', top: 14, right: 16,
          fontSize: '.67rem', fontWeight: 700, color: '#6b7280',
          background: '#f9fafb', border: '1px solid #e5e7eb',
          borderRadius: 999, padding: '2px 8px',
        }}>Optional</div>
        <QuestionLabel n={3} text="Which algorithms or methods are you thinking of using — or do you have a preference?" />
        <p style={{ margin: '0 0 11px', fontSize: '.78rem', color: '#6b7280', lineHeight: 1.55 }}>
          Don't know yet? Leave it blank and the AI will choose based on your topic and the literature it reads.
        </p>
        <input
          type="text"
          placeholder={`e.g. "Random Forest, XGBoost, LSTM" or "I'm not sure yet" or "whatever works best for classification"`}
          value={answers.preferred_algorithms}
          onChange={e => update({ ...answers, preferred_algorithms: e.target.value })}
          style={inp}
          onFocus={e => { e.target.style.borderColor = '#059669'; e.target.style.boxShadow = '0 0 0 3px rgba(5,150,105,.1)' }}
          onBlur={e => { e.target.style.borderColor = '#e8ede8'; e.target.style.boxShadow = 'none' }}
        />
        {/* Chip suggestions */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {['Random Forest', 'XGBoost', 'LSTM', 'BERT', 'SVM', 'CNN'].map(alg => (
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
                background: '#f0fdf4', color: '#059669',
                transition: 'all .12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#d1fae5'; e.currentTarget.style.borderColor = '#6ee7b7' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.borderColor = '#d1fae5' }}
            >
              + {alg}
            </button>
          ))}
        </div>
        <WhyNote text="When you name your algorithms, the AI uses exactly those in the work plan and methodology — instead of guessing from your topic. If you say 'I don't know', that's fine too and it falls back to literature-based selection." />
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Q1 — Theoretical framework */}
      <div style={card}>
        <CardAccent color="#7c3aed" />
        <QuestionLabel n={1} text="Which theoretical or analytical lens feels most right for your project?" color="#7c3aed" bg="#faf5ff" border="#e9d5ff" />
        <p style={{ margin: '0 0 11px', fontSize: '.78rem', color: '#6b7280', lineHeight: 1.55 }}>
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
      <div style={card}>
        <CardAccent color="#7c3aed" />
        <QuestionLabel n={2} text="What's the main argument or question you want to answer — in one sentence?" color="#7c3aed" bg="#faf5ff" border="#e9d5ff" />
        <p style={{ margin: '0 0 11px', fontSize: '.78rem', color: '#6b7280', lineHeight: 1.55 }}>
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

  const canProceed = track === 'A'
    ? !!answersA.data_sensitivity
    : !!answersB.central_argument

  const trackColor = track === 'A' ? '#16a34a' : '#7c3aed'
  const trackBg    = track === 'A' ? '#f0fdf4' : '#faf5ff'
  const trackBorder = track === 'A' ? '#bbf7d0' : '#e9d5ff'

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: '0 0 5px', fontWeight: 800, color: '#0f1f0f', fontSize: '1.17rem', fontFamily: 'Fraunces, serif' }}>
          A Few Quick Questions
        </h2>
        <p style={{ margin: '0 0 13px', fontSize: '.84rem', color: '#9ca3af', lineHeight: 1.55 }}>
          {track === 'A'
            ? 'Three questions that ground your specification in real information — not AI guesses.'
            : 'Three questions that give your specification its academic backbone.'}
        </p>

        {/* Track badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 9,
          background: trackBg, border: `1.5px solid ${trackBorder}`,
          boxShadow: `0 0 0 3px ${trackColor}0a`,
        }}>
          <Sparkles size={12} color={trackColor} />
          <span style={{ fontSize: '.74rem', fontWeight: 700, color: trackColor }}>
            {track === 'A' ? 'Empirical / Data Project' : 'Theoretical / Humanities Project'}
          </span>
        </div>
      </div>

      {track === 'A' ? (
        <TrackAQuestions answers={answersA} update={updateA} topic={researchTopic} />
      ) : (
        <TrackBQuestions answers={answersB} update={updateB} topic={researchTopic} field={fieldOfStudy} />
      )}

      {/* Completion banner */}
      <AnimatePresence>
        {canProceed && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: .25 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 9, marginTop: 20,
              padding: '12px 16px',
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              border: '1.5px solid #bbf7d0', borderRadius: 12,
              boxShadow: '0 2px 8px rgba(22,163,74,.08)',
            }}
          >
            <CheckCircle size={16} color="#16a34a" />
            <span style={{ fontSize: '.79rem', color: '#15803d', fontWeight: 600 }}>
              Ready — your answers are locked in. Click Continue to generate.
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}