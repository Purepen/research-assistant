'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { authApi } from '@/lib/api'
import Link from 'next/link'
import '@/components/landing/auth.css'

declare global { interface Window { google: any } }

const IconLayers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
    <polyline points="2 17 12 22 22 17"/>
    <polyline points="2 12 12 17 22 12"/>
  </svg>
)
const IconMail = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
)
const IconLock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)
const IconArrow = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
)
const IconAlert = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
)
const IconRefresh = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>
  </svg>
)
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

const PROOF_POINTS = [
  { icon: '⚡', text: <><strong>3 minutes</strong> average generation time — not 3 weeks</> },
  { icon: '🎓', text: <><strong>4,500+ students</strong> at top UK universities</> },
  { icon: '📊', text: <><strong>94% completeness score</strong> on every spec</> },
]

export default function SignInPage() {
  const router = useRouter()
  const { signIn, signInWithEmail, isAuthenticated, refreshUser, signOut, clearError } = useAuth()
  const googleBtnRef = useRef<HTMLDivElement>(null)

  const [email,           setEmail]           = useState('')
  const [password,        setPassword]        = useState('')
  const [error,           setError]           = useState('')
  const [isLoading,       setIsLoading]       = useState(false)
  const [emailUnverified, setEmailUnverified] = useState(false)
  const [resending,       setResending]       = useState(false)
  const [resendSuccess,   setResendSuccess]   = useState(false)
  const [googleLoading,   setGoogleLoading]   = useState(false)

  // ── FIX: verify the stored token is still valid before auto-redirecting ──
  // Zustand persist restores isAuthenticated=true from localStorage even if
  // the token has expired. We must call /auth/me to confirm it's live first.
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    const verifySession = async () => {
      if (isAuthenticated) {
        try {
          await refreshUser()       // hits /auth/me — if token is valid, redirect
          router.push('/dashboard')
        } catch {
          signOut()                 // token expired — clear state and show the form
          setAuthChecked(true)
        }
      } else {
        setAuthChecked(true)        // definitely not logged in — show form
      }
    }
    verifySession()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // Intentionally empty deps — run once on mount only, not reactive

  // ── Load Google GSI ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!authChecked) return
    const scriptId = 'google-gsi-script'
    if (document.getElementById(scriptId)) { initGoogle(); return }
    const s = document.createElement('script')
    s.id = scriptId; s.src = 'https://accounts.google.com/gsi/client'
    s.async = true; s.defer = true; s.onload = initGoogle
    document.head.appendChild(s)
  }, [authChecked])

  const initGoogle = () => {
    if (!window.google || !process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) return
    window.google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      callback: handleGoogleResponse,
    })
    if (googleBtnRef.current) {
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline', size: 'large',
        width: googleBtnRef.current.offsetWidth || 400,
        text: 'continue_with',
      })
    }
  }

  // Click the real hidden Google-rendered button — most reliable OAuth trigger
  const handleGoogleClick = () => {
    const realBtn = googleBtnRef.current?.querySelector('div[role="button"]') as HTMLElement
    if (realBtn) {
      realBtn.click()
    } else {
      window.google?.accounts.id.prompt()
    }
    setGoogleLoading(true)
    setTimeout(() => setGoogleLoading(false), 5000)
  }

  const handleGoogleResponse = async (response: any) => {
    setError(''); setGoogleLoading(true)
    try { await signIn(response.credential); router.push('/dashboard') }
    catch { setError('Google sign in failed. Please try again.'); setGoogleLoading(false) }
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setEmailUnverified(false); clearError()
    if (!email || !password) { setError('Please fill in all fields'); return }
    setIsLoading(true)
    try { await signInWithEmail(email, password); router.push('/dashboard') }
    catch (err: any) {
      const detail = err.response?.data?.detail || ''
      if (detail === 'EMAIL_NOT_VERIFIED') {
        setEmailUnverified(true)
        setError('Please verify your email address before signing in.')
      } else {
        setError(detail || 'Incorrect email or password.')
      }
    } finally { setIsLoading(false) }
  }

  const handleResend = async () => {
    setResending(true)
    try { await authApi.resendVerification(email); setResendSuccess(true) }
    catch { setError('Failed to resend. Please try again.') }
    finally { setResending(false) }
  }

  // Show a minimal spinner while we verify the session — no flash, no redirect race
  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
        <span className="auth-spinner auth-spinner-green" style={{ width: 28, height: 28, borderWidth: 3 }} />
      </div>
    )
  }

  return (
    <div className="auth-page">

      {/* ══ LEFT PANEL ══ */}
      <div className="auth-left">
        <div className="auth-left-glow" />
        <div className="auth-left-glow-2" />
        <Link href="/" className="auth-left-logo">
          <div className="auth-left-logo-icon"><IconLayers /></div>
          <span className="auth-left-logo-text">Research<span>AI</span></span>
        </Link>
        <div className="auth-left-content">
          <div className="auth-left-accent" />
          <h2 className="auth-left-heading">
            Welcome back.<br />
            Your next spec<br />is <em>8 minutes</em> away.
          </h2>
          <p className="auth-left-sub">
            Pick up where you left off. Your projects, your specifications, your research — all waiting for you.
          </p>
          <div className="auth-proof-cards">
            {PROOF_POINTS.map((p, i) => (
              <div key={i} className="auth-proof-card">
                <div className="auth-proof-icon">{p.icon}</div>
                <div className="auth-proof-text">{p.text}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="auth-left-footer">
          © 2026 ResearchAI · <a href="#" style={{ color: 'inherit' }}>Privacy</a> · <a href="#" style={{ color: 'inherit' }}>Terms</a>
        </div>
      </div>

      {/* ══ RIGHT PANEL ══ */}
      <div className="auth-right">
        <div className="auth-form-box">

          <Link href="/" className="auth-form-logo">
            <div className="auth-form-logo-icon"><IconLayers /></div>
            <span className="auth-form-logo-text">Research<span>AI</span></span>
          </Link>

          <h1 className="auth-form-heading">Sign in</h1>
          <p className="auth-form-sub">
            Don't have an account?{' '}
            <Link href="/register" style={{ color: '#16a34a', fontWeight: 600 }}>Create one free</Link>
          </p>

          {error && (
            <div className="auth-error">
              <span className="auth-error-icon"><IconAlert /></span>
              <div>
                {error}
                {emailUnverified && (
                  <div className="auth-resend-row">
                    {resendSuccess
                      ? <span style={{ color: '#16a34a', fontSize: '0.80rem', fontWeight: 600 }}>✓ Verification email sent!</span>
                      : <button className="auth-resend-btn" onClick={handleResend} disabled={resending}>
                          {resending ? <><span className="auth-spinner auth-spinner-green" />Sending…</> : <><IconRefresh />Resend verification email</>}
                        </button>
                    }
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Custom Google button overlay — real hidden button underneath */}
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <button className="auth-google-btn" type="button" onClick={handleGoogleClick} disabled={googleLoading} style={{ marginBottom: 0 }}>
              {googleLoading ? <span className="auth-spinner auth-spinner-green" /> : <GoogleIcon />}
              Continue with Google
            </button>
            <div ref={googleBtnRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, pointerEvents: 'none', overflow: 'hidden' }} />
          </div>

          <div className="auth-divider">
            <div className="auth-divider-line" />
            <span className="auth-divider-text">or continue with email</span>
            <div className="auth-divider-line" />
          </div>

          <form onSubmit={handleEmailSignIn}>
            <div className="auth-field">
              <label className="auth-label">Email address</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon"><IconMail /></span>
                <input type="email" className="auth-input" placeholder="you@university.ac.uk" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
              </div>
            </div>
            <div className="auth-field">
              <div className="auth-label-row">
                <label className="auth-label" style={{ marginBottom: 0 }}>Password</label>
                <Link href="/forgot-password" className="auth-forgot">Forgot password?</Link>
              </div>
              <div className="auth-input-wrap">
                <span className="auth-input-icon"><IconLock /></span>
                <input type="password" className="auth-input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
              </div>
            </div>
            <button type="submit" className="auth-submit" disabled={isLoading}>
              {isLoading ? <><span className="auth-spinner" />Signing in…</> : <>Sign in <IconArrow /></>}
            </button>
          </form>

          <div className="auth-switch">New to ResearchAI? <Link href="/register">Create a free account</Link></div>
          <div className="auth-back"><Link href="/">← Back to home</Link></div>
        </div>
      </div>
    </div>
  )
}
