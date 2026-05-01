'use client'

/**
 * Profile Page
 *
 * Changes (Apr 2026 — Model Tier + BYOK):
 *   - Added 'settings' to Tab union type
 *   - Added 'Settings' to TABS array (icon: I.Gear)
 *   - Added I.Gear, I.Key, I.Bot, I.ChevDown SVG icon helpers
 *   - Added Settings tab panel with:
 *       • OpenAI API Key section (BYOK — bring-your-own-key)
 *       • Model Tier section (Testing / Production / Custom)
 *       • When Custom: per-agent model selector grid
 *   - Added hooks: useModelSettings, useUpdateModelSettings, useApiKeyStatus, useSaveApiKey
 *
 * ALL existing code (Overview, Security, Notifications tabs, icons, helpers,
 * hero section, stats, Toggle, ComingSoonOverlay) is preserved verbatim.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { useUserStats } from '@/hooks/useUser'
import { useProjects } from '@/hooks/useProjects'
import {
  useModelSettings,
  useUpdateModelSettings,
  useApiKeyStatus,
  useSaveApiKey,
} from '@/hooks/useUser'

// ─── SVG icon helpers — EXISTING (unchanged) ─────────────────────────────────
const I = {
  Chart:  ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  Shield: ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Bell:   ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Check:  ()=><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Lock:   ()=><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Mail:   ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  User:   ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>,
  Logout: ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Info:   ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  Trash:  ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Google: ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#16a34a"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#22c55e"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#16a34a"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#15803d"/></svg>,
  // ── NEW icons for Settings tab ──────────────────────────────────────────────
  Gear:     ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Key:      ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>,
  Bot:      ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>,
  Eye:      ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  EyeOff:   ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
}

// ─── Types ────────────────────────────────────────────────────────────────────
// CHANGED: added 'settings' to the Tab union
type Tab = 'overview' | 'security' | 'notifications' | 'settings'

// ─── Existing helpers — UNCHANGED ─────────────────────────────────────────────
function scoreColor(n: number) { return n >= 75 ? '#16a34a' : n >= 55 ? '#d97706' : '#dc2626' }
const fu = (delay = 0) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, delay } })

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button onClick={() => !disabled && onChange(!on)}
      style={{ width: 44, height: 24, borderRadius: 12, background: on ? '#16a34a' : '#e5e7eb', border: `2px solid ${on ? '#16a34a' : '#d1d5db'}`, cursor: disabled ? 'not-allowed' : 'pointer', position: 'relative', transition: 'all .2s', opacity: disabled ? .5 : 1, flexShrink: 0 }}>
      <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', position: 'absolute', top: 1, left: on ? 23 : 1, transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
    </button>
  )
}

function ComingSoonOverlay({ label = 'Coming soon' }: { label?: string }) {
  return (
    <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: 'rgba(255,255,255,.82)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 9, padding: '8px 16px' }}>
        <I.Lock /><span style={{ fontSize: '.78rem', fontWeight: 700, color: '#16a34a' }}>{label}</span>
      </div>
    </div>
  )
}

// ─── NEW: Settings tab sub-components ────────────────────────────────────────

/** Tier badge pill shown on each tier card */
function TierBadge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ fontSize: '.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: `${color}15`, color, border: `1px solid ${color}30`, textTransform: 'uppercase', letterSpacing: '.06em' }}>
      {label}
    </span>
  )
}

/** Phase badge pill shown on each agent card */
function PhasePill({ phase }: { phase: string }) {
  const map: Record<string, string> = {
    Discovery: '#7c3aed', Synthesis: '#0369a1', Writing: '#16a34a',
    Assembly: '#d97706', Review: '#dc2626', Delivery: '#6b7280',
  }
  const c = map[phase] ?? '#6b7280'
  return (
    <span style={{ fontSize: '.62rem', fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: `${c}12`, color: c, border: `1px solid ${c}25` }}>
      {phase}
    </span>
  )
}

/** Cost impact badge */
function CostBadge({ impact }: { impact: string }) {
  const map: Record<string, string> = { Low: '#16a34a', Medium: '#d97706', High: '#dc2626' }
  const c = map[impact] ?? '#6b7280'
  return (
    <span style={{ fontSize: '.62rem', fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: `${c}10`, color: c }}>
      {impact} cost
    </span>
  )
}

/** Full Settings tab panel — API key + model tier */
function SettingsTab() {
  const { data: modelData, isLoading: modelsLoading } = useModelSettings()
  const { data: keyData,   isLoading: keyLoading }    = useApiKeyStatus()
  const { mutateAsync: saveModels, isPending: savingModels } = useUpdateModelSettings()
  const { mutateAsync: saveKey,   isPending: savingKey }     = useSaveApiKey()

  // API key state
  const [keyInput,   setKeyInput]   = useState('')
  const [showKey,    setShowKey]    = useState(false)
  const [keyMsg,     setKeyMsg]     = useState<{ text: string; ok: boolean } | null>(null)

  // Model tier state (local before save)
  const [tier,       setTier]       = useState<'testing' | 'production' | 'custom'>(
    modelData?.tier ?? 'production'
  )
  const [customCfg,  setCustomCfg]  = useState<Record<string, string>>({})
  const [modelMsg,   setModelMsg]   = useState<{ text: string; ok: boolean } | null>(null)

  // When remote data arrives, sync local tier state
  const activeTier = tier ?? modelData?.tier ?? 'production'

  const handleSaveKey = async () => {
    setKeyMsg(null)
    try {
      const val = keyInput.trim() || null
      await saveKey(val)
      setKeyInput('')
      setKeyMsg({ text: val ? 'API key saved.' : 'API key cleared.', ok: true })
    } catch (e: any) {
      setKeyMsg({ text: e?.response?.data?.detail ?? 'Failed to save key.', ok: false })
    }
  }

  const handleSaveModels = async () => {
    setModelMsg(null)
    try {
      await saveModels({ tier: activeTier, customConfig: activeTier === 'custom' ? customCfg : undefined })
      setModelMsg({ text: 'Settings saved.', ok: true })
    } catch {
      setModelMsg({ text: 'Failed to save. Please try again.', ok: false })
    }
  }

  const tierCards = [
    {
      id:    'testing' as const,
      label: 'Testing',
      sub:   'All agents use GPT-4o Mini. Cheapest option — use when verifying structure, not quality.',
      badge: 'Cheapest',
      color: '#7c3aed',
    },
    {
      id:    'production' as const,
      label: 'Production',
      sub:   'Recommended defaults. Quality-critical agents (reviewer, synthesiser) use GPT-4o. Best balance.',
      badge: 'Recommended',
      color: '#16a34a',
    },
    {
      id:    'custom' as const,
      label: 'Custom',
      sub:   'Choose the model for every agent individually. Full control, full responsibility.',
      badge: 'Advanced',
      color: '#0369a1',
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── API Key section ──────────────────────────────────────────────── */}
      <motion.div {...fu(.08)} style={{ background: 'white', border: '1px solid #e8ede8', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
        <div className="g-section-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}><I.Key /></div>
            <div>
              <span style={{ fontWeight: 700, color: '#0f1f0f', fontSize: '.9rem' }}>OpenAI API Key</span>
              <span style={{ marginLeft: 8, fontSize: '.72rem', color: '#7c3aed', fontWeight: 700, background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 6, padding: '1px 7px' }}>BYOK</span>
            </div>
          </div>
        </div>

        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Status row */}
          {!keyLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: keyData?.has_key ? '#f0fdf4' : '#fafafa', border: `1px solid ${keyData?.has_key ? '#bbf7d0' : '#e8ede8'}`, borderRadius: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: keyData?.has_key ? '#16a34a' : '#9ca3af', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                {keyData?.has_key
                  ? <><span style={{ fontWeight: 700, color: '#16a34a', fontSize: '.82rem' }}>Key saved · </span><span style={{ fontSize: '.82rem', color: '#374151', fontFamily: 'monospace' }}>{keyData.masked_key}</span></>
                  : <span style={{ fontSize: '.82rem', color: '#6b7280' }}>No key set — generations use the shared system key</span>
                }
              </div>
              <span style={{ fontSize: '.7rem', fontWeight: 600, color: keyData?.has_key ? '#16a34a' : '#9ca3af' }}>
                {keyData?.has_key ? 'Your key' : 'System key'}
              </span>
            </div>
          )}

          <p style={{ margin: 0, fontSize: '.78rem', color: '#6b7280', lineHeight: 1.6 }}>
            Paste your OpenAI API key below. It will be used for all your generations instead of the shared key.
            Get yours at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" style={{ color: '#7c3aed', fontWeight: 600 }}>platform.openai.com/api-keys</a>.
          </p>

          {/* Key input row */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
                placeholder="sk-..."
                style={{ width: '100%', padding: '10px 38px 10px 13px', border: '1.5px solid #e8ede8', borderRadius: 10, fontSize: '.84rem', color: '#0f1f0f', outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box', transition: 'border .2s' }}
                onFocus={e => (e.target.style.borderColor = '#7c3aed')}
                onBlur={e  => (e.target.style.borderColor = '#e8ede8')}
              />
              <button
                onClick={() => setShowKey(v => !v)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 0 }}
              >
                {showKey ? <I.EyeOff /> : <I.Eye />}
              </button>
            </div>
            <button
              onClick={handleSaveKey}
              disabled={savingKey}
              style={{ padding: '10px 18px', borderRadius: 10, background: '#7c3aed', color: 'white', border: 'none', fontWeight: 700, fontSize: '.82rem', cursor: savingKey ? 'not-allowed' : 'pointer', opacity: savingKey ? .7 : 1, flexShrink: 0 }}
            >
              {savingKey ? 'Saving…' : 'Save Key'}
            </button>
            {keyData?.has_key && (
              <button
                onClick={() => { setKeyInput(''); saveKey(null).then(() => setKeyMsg({ text: 'Key cleared.', ok: true })) }}
                style={{ padding: '10px 14px', borderRadius: 10, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontWeight: 700, fontSize: '.82rem', cursor: 'pointer', flexShrink: 0 }}
              >
                Clear
              </button>
            )}
          </div>

          {keyMsg && (
            <p style={{ margin: 0, fontSize: '.78rem', fontWeight: 700, color: keyMsg.ok ? '#16a34a' : '#dc2626' }}>
              {keyMsg.ok ? '✓' : '✗'} {keyMsg.text}
            </p>
          )}
        </div>
      </motion.div>

      {/* ── Model Tier section ───────────────────────────────────────────── */}
      <motion.div {...fu(.13)} style={{ background: 'white', border: '1px solid #e8ede8', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
        <div className="g-section-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}><I.Bot /></div>
            <span style={{ fontWeight: 700, color: '#0f1f0f', fontSize: '.9rem' }}>AI Model Tier</span>
          </div>
        </div>

        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ margin: 0, fontSize: '.78rem', color: '#6b7280', lineHeight: 1.6 }}>
            Choose how much AI power is used across the pipeline. Testing is cheapest; Production is the recommended balance; Custom lets you pick per agent.
          </p>

          {/* Tier cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
            {tierCards.map(tc => (
              <button
                key={tc.id}
                onClick={() => setTier(tc.id)}
                style={{
                  textAlign: 'left', padding: '14px 16px', borderRadius: 12,
                  border: `2px solid ${activeTier === tc.id ? tc.color : '#e8ede8'}`,
                  background: activeTier === tc.id ? `${tc.color}08` : 'white',
                  cursor: 'pointer', transition: 'all .2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 800, fontSize: '.88rem', color: activeTier === tc.id ? tc.color : '#0f1f0f' }}>{tc.label}</span>
                  <TierBadge label={tc.badge} color={tc.color} />
                </div>
                <p style={{ margin: 0, fontSize: '.74rem', color: '#6b7280', lineHeight: 1.5 }}>{tc.sub}</p>
                {activeTier === tc.id && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, color: tc.color, fontSize: '.72rem', fontWeight: 700 }}>
                    <I.Check /> Selected
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Custom agent grid — only shown when Custom tier is selected */}
          {activeTier === 'custom' && (
            <div style={{ marginTop: 8 }}>
              <p style={{ margin: '0 0 10px', fontSize: '.8rem', fontWeight: 700, color: '#0f1f0f' }}>
                Per-agent model selection
              </p>
              {modelsLoading && <p style={{ fontSize: '.8rem', color: '#9ca3af' }}>Loading agents…</p>}
              {!modelsLoading && modelData && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {modelData.agents.map(agent => (
                    <div key={agent.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1.5px solid #e8ede8', borderRadius: 10, background: '#fafafa', flexWrap: 'wrap' }}>
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '.84rem', color: '#0f1f0f' }}>{agent.display_name}</span>
                          <PhasePill phase={agent.phase} />
                          <CostBadge impact={agent.cost_impact} />
                        </div>
                        <p style={{ margin: 0, fontSize: '.73rem', color: '#6b7280', lineHeight: 1.5 }}>{agent.description}</p>
                      </div>
                      {/* Model picker */}
                      <select
                        value={customCfg[agent.key] ?? agent.current_model}
                        onChange={e => setCustomCfg(prev => ({ ...prev, [agent.key]: e.target.value }))}
                        style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid #e8ede8', fontSize: '.8rem', color: '#0f1f0f', background: 'white', cursor: 'pointer', outline: 'none', flexShrink: 0 }}
                      >
                        {modelData.available_models.map(m => (
                          <option key={m.id} value={m.id}>{m.label} · {m.description}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Save button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <button
              onClick={handleSaveModels}
              disabled={savingModels}
              style={{ padding: '10px 22px', borderRadius: 10, background: '#16a34a', color: 'white', border: 'none', fontWeight: 700, fontSize: '.84rem', cursor: savingModels ? 'not-allowed' : 'pointer', opacity: savingModels ? .7 : 1 }}
            >
              {savingModels ? 'Saving…' : 'Save Model Settings'}
            </button>
            {modelMsg && (
              <p style={{ margin: 0, fontSize: '.78rem', fontWeight: 700, color: modelMsg.ok ? '#16a34a' : '#dc2626' }}>
                {modelMsg.ok ? '✓' : '✗'} {modelMsg.text}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}


// ─── Main page — EXISTING layout preserved; only Tab union + TABS array + render changed ──

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const { data: stats }    = useUserStats()
  const { data: projects } = useProjects({ limit: 50 })
  const [tab, setTab]     = useState<Tab>('overview')
  const [notifs, setNotifs] = useState({ email: true, weekly: false, tips: true })

  const initials = user?.full_name ? user.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'R'
  const joined   = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
  const avgScore  = stats?.average_marks ? Math.round(stats.average_marks) : 0
  const completionRate = stats?.total_projects ? Math.round((stats.completed_projects / stats.total_projects) * 100) : 0
  const bestProject = (projects || []).reduce((best: any, p: any) => {
    if (p.total_marks != null && (!best || p.total_marks > best.total_marks)) return p; return best
  }, null)

  // CHANGED: added 'settings' tab
  const TABS: { key: Tab; label: string; icon: () => JSX.Element }[] = [
    { key: 'overview',      label: 'Overview',      icon: I.Chart  },
    { key: 'security',      label: 'Security',      icon: I.Shield },
    { key: 'notifications', label: 'Notifications', icon: I.Bell   },
    { key: 'settings',      label: 'Settings',      icon: I.Gear   },
  ]

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      {/* ── Hero — UNCHANGED ── */}
      <motion.div {...fu(0)} style={{ background: 'white', border: '1.5px solid #e8ede8', borderRadius: 18, padding: '24px', marginBottom: 18, boxShadow: '0 2px 12px rgba(0,0,0,.06)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 160, height: 160, borderRadius: '50%', background: '#f0fdf4', filter: 'blur(30px)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', position: 'relative' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: 72, height: 72, borderRadius: 18, background: 'linear-gradient(135deg,#16a34a,#22c55e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, color: 'white', border: '3px solid white', boxShadow: '0 0 0 2px #16a34a' }}>
              {initials}
            </div>
            <div style={{ position: 'absolute', bottom: -4, right: -4, width: 22, height: 22, borderRadius: '50%', background: 'white', border: '2px solid #e8ede8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <I.Google />
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: '0 0 4px', fontSize: 'clamp(1.2rem,2vw,1.5rem)', fontWeight: 800, color: '#0f1f0f', fontFamily: 'Fraunces,serif' }}>{user?.full_name || 'Researcher'}</h1>
            <p style={{ margin: '0 0 8px', fontSize: '.84rem', color: '#6b7280' }}>{user?.email}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '.72rem', fontWeight: 700, color: '#16a34a' }}><I.Check /> Verified</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, background: '#fafafa', border: '1px solid #e8ede8', fontSize: '.72rem', color: '#6b7280' }}>Member since {joined}</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, flexShrink: 0 }}>
            {[
              { label: 'Projects',    value: stats?.total_projects     ?? 0 },
              { label: 'Completed',   value: stats?.completed_projects ?? 0 },
              { label: 'Avg Score',   value: avgScore ? `${avgScore}%` : '—' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', padding: '10px 14px', background: '#fafcfa', borderRadius: 10, border: '1px solid #e8ede8' }}>
                <p style={{ margin: '0 0 2px', fontWeight: 800, color: '#0f1f0f', fontSize: '1.2rem', fontFamily: 'Fraunces,serif' }}>{s.value}</p>
                <p style={{ margin: 0, fontSize: '.68rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Tabs — UNCHANGED logic, 'settings' added above ── */}
      <motion.div {...fu(.06)} style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'white', padding: 5, borderRadius: 12, border: '1px solid #e8ede8', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 12px', borderRadius: 9, border: 'none', fontWeight: tab === t.key ? 700 : 500, fontSize: '.8rem', cursor: 'pointer', transition: 'all .2s', background: tab === t.key ? '#f0fdf4' : 'transparent', color: tab === t.key ? '#16a34a' : '#6b7280' }}>
            <t.icon />{t.label}
          </button>
        ))}
      </motion.div>

      {/* ── OVERVIEW — UNCHANGED ── */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Stats grid */}
          <motion.div {...fu(.1)} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10 }}>
            {[
              { label: 'Total Projects',    value: stats?.total_projects ?? 0,    color: '#0369a1' },
              { label: 'Completed',         value: stats?.completed_projects ?? 0, color: '#16a34a' },
              { label: 'Completion Rate',   value: completionRate ? `${completionRate}%` : '—', color: '#7c3aed' },
              { label: 'Average Score',     value: avgScore ? `${avgScore}%` : '—', color: scoreColor(avgScore) },
            ].map(s => (
              <div key={s.label} style={{ background: 'white', border: '1px solid #e8ede8', borderRadius: 12, padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,.04)', borderTop: `3px solid ${s.color}` }}>
                <p style={{ margin: '0 0 4px', fontSize: '1.5rem', fontWeight: 800, color: s.color, fontFamily: 'Fraunces,serif', lineHeight: 1 }}>{s.value}</p>
                <p style={{ margin: 0, fontSize: '.72rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{s.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Best project */}
          {bestProject && (
            <motion.div {...fu(.14)} style={{ background: 'white', border: '1px solid #e8ede8', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
              <div className="g-section-head">
                <span style={{ fontWeight: 700, color: '#0f1f0f', fontSize: '.9rem' }}>Best Project</span>
              </div>
              <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '2rem', fontWeight: 800, color: scoreColor(bestProject.total_marks), fontFamily: 'Fraunces,serif', lineHeight: 1 }}>{bestProject.total_marks}</span>
                  <span style={{ fontSize: '.55rem', color: '#9ca3af' }}>/100</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 3px', fontWeight: 700, color: '#0f1f0f', fontSize: '.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bestProject.research_topic || bestProject.field_of_study}</p>
                  <p style={{ margin: 0, fontSize: '.76rem', color: '#6b7280' }}>{bestProject.field_of_study} · {bestProject.academic_level}</p>
                </div>
                <span style={{ padding: '3px 10px', borderRadius: 999, background: `${scoreColor(bestProject.total_marks)}10`, border: `1px solid ${scoreColor(bestProject.total_marks)}25`, fontSize: '.72rem', fontWeight: 700, color: scoreColor(bestProject.total_marks), flexShrink: 0 }}>
                  {bestProject.total_marks >= 75 ? 'Excellent' : bestProject.total_marks >= 55 ? 'Good' : 'Fair'}
                </span>
              </div>
            </motion.div>
          )}

          {/* Account info */}
          <motion.div {...fu(.18)} style={{ background: 'white', border: '1px solid #e8ede8', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
            <div className="g-section-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}><I.User /></div>
                <span style={{ fontWeight: 700, color: '#0f1f0f', fontSize: '.9rem' }}>Account Information</span>
              </div>
            </div>
            {[
              { label: 'Full Name',    value: user?.full_name || '—',   icon: <I.User /> },
              { label: 'Email',        value: user?.email     || '—',   icon: <I.Mail /> },
              { label: 'Account Type', value: 'Google OAuth 2.0',       icon: <I.Google /> },
              { label: 'Member Since', value: joined,                   icon: <I.Shield /> },
            ].map((row, i, arr) => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 20px', borderBottom: i < arr.length - 1 ? '1px solid #f9fafb' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ color: '#9ca3af', display: 'flex' }}>{row.icon}</div>
                  <div>
                    <p style={{ margin: '0 0 1px', fontSize: '.7rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>{row.label}</p>
                    <p style={{ margin: 0, fontSize: '.88rem', color: '#0f1f0f', fontWeight: 500 }}>{row.value}</p>
                  </div>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 6, background: '#f9fafb', border: '1px solid #e8ede8', fontSize: '.7rem', color: '#9ca3af' }}><I.Lock /> Managed</span>
              </div>
            ))}
            <div style={{ padding: '12px 20px', background: '#fafcfa' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ color: '#9ca3af', flexShrink: 0, marginTop: 1 }}><I.Info /></div>
                <p style={{ margin: 0, fontSize: '.76rem', color: '#9ca3af', lineHeight: 1.6 }}>Profile details are managed via your Google account. Direct editing will be available in a future update.</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── SECURITY — UNCHANGED ── */}
      {tab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <motion.div {...fu(.1)} style={{ background: 'white', border: '1px solid #e8ede8', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
            <div className="g-section-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}><I.Shield /></div>
                <span style={{ fontWeight: 700, color: '#0f1f0f', fontSize: '.9rem' }}>Authentication</span>
              </div>
            </div>
            <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><I.Google /></div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 3px', fontWeight: 700, color: '#0f1f0f', fontSize: '.9rem' }}>Google Sign-In</p>
                <p style={{ margin: 0, fontSize: '.78rem', color: '#6b7280' }}>Secured via Google OAuth 2.0 — industry-standard authentication</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '.72rem', fontWeight: 700, color: '#16a34a', flexShrink: 0 }}><I.Check /> Active</div>
            </div>
          </motion.div>

          <motion.div {...fu(.14)} style={{ background: 'white', border: '1px solid #e8ede8', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)', position: 'relative' }}>
            <ComingSoonOverlay label="2FA coming soon" />
            <div className="g-section-head">
              <span style={{ fontWeight: 700, color: '#0f1f0f', fontSize: '.9rem' }}>Two-Factor Authentication</span>
            </div>
            <div style={{ padding: '18px 20px', opacity: .4 }}>
              <p style={{ margin: 0, fontSize: '.84rem', color: '#6b7280' }}>Add an extra layer of security to your account with an authenticator app.</p>
            </div>
          </motion.div>

          <motion.div {...fu(.18)} style={{ background: 'white', border: '1px solid #e8ede8', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
            <div className="g-section-head">
              <span style={{ fontWeight: 700, color: '#0f1f0f', fontSize: '.9rem' }}>Active Sessions</span>
            </div>
            <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ margin: '0 0 2px', fontWeight: 600, color: '#0f1f0f', fontSize: '.87rem' }}>Browser session</p>
                <p style={{ margin: 0, fontSize: '.76rem', color: '#6b7280' }}>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              <span style={{ padding: '3px 9px', borderRadius: 999, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '.7rem', fontWeight: 700, color: '#16a34a' }}>Active now</span>
            </div>
          </motion.div>

          <motion.div {...fu(.22)} style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #fecaca' }}>
              <span style={{ fontWeight: 700, color: '#dc2626', fontSize: '.9rem' }}>Danger Zone</span>
            </div>
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ margin: '0 0 3px', fontWeight: 600, color: '#0f1f0f', fontSize: '.87rem' }}>Sign out</p>
                  <p style={{ margin: 0, fontSize: '.76rem', color: '#6b7280' }}>End your current session on this device</p>
                </div>
                <button onClick={signOut} className="g-btn-danger"><I.Logout /> Sign Out</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── NOTIFICATIONS — UNCHANGED ── */}
      {tab === 'notifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <motion.div {...fu(.1)} style={{ background: 'white', border: '1px solid #e8ede8', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)', position: 'relative' }}>
            <ComingSoonOverlay />
            <div className="g-section-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}><I.Bell /></div>
                <span style={{ fontWeight: 700, color: '#0f1f0f', fontSize: '.9rem' }}>Email Notifications</span>
              </div>
            </div>
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16, opacity: .5 }}>
              {[
                { key: 'email' as const, label: 'Spec ready',    sub: 'Get emailed when your specification is complete' },
                { key: 'weekly' as const, label: 'Weekly digest', sub: 'Summary of your project activity' },
                { key: 'tips' as const,   label: 'Tips & updates', sub: 'Product updates and research tips' },
              ].map(n => (
                <div key={n.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                  <div>
                    <p style={{ margin: '0 0 2px', fontWeight: 600, color: '#0f1f0f', fontSize: '.87rem' }}>{n.label}</p>
                    <p style={{ margin: 0, fontSize: '.76rem', color: '#6b7280' }}>{n.sub}</p>
                  </div>
                  <Toggle on={notifs[n.key]} onChange={v => setNotifs(p => ({ ...p, [n.key]: v }))} disabled />
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* ── SETTINGS — NEW ── */}
      {tab === 'settings' && <SettingsTab />}
    </div>
  )
}