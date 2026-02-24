'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import '@/components/landing/auth.css'

const IconLayers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
    <polyline points="2 17 12 22 22 17"/>
    <polyline points="2 12 12 17 22 12"/>
  </svg>
)
const IconUser = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/>
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
const IconCheck = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
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

const LEFT_FEATURES = [
  { icon: '📋', text: <><strong>Guideline-aware</strong> — upload your university's exact requirements</> },
  { icon: '🔄', text: <><strong>5 refinement iterations</strong> — the AI keeps improving until it's perfect</> },
  { icon: '⬇️', text: <><strong>Download as Word doc</strong> — submission-ready, every time</> },
]

function getStrength(pwd: string): { score: number; label: string } {
  if (!pwd) return { score: 0, label: '' }
  let score = 0
  if (pwd.length >= 8)  score++
  if (pwd.length >= 12) score++
  if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  return { score, label: ['', 'Weak', 'Fair', 'Good', 'Strong'][score] || 'Strong' }
}

export default function RegisterPage() {
  const router = useRouter()
  const { register, signIn, isLoading } = useAuth()

  const [fullName,        setFullName]        = useState('')
  const [email,           setEmail]           = useState('')
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error,           setError]           = useState('')
  const [success,         setSuccess]         = useState(false)
  const [sentTo,          setSentTo]          = useState('')
  const [googleLoading,   setGoogleLoading]   = useState(false)

  const strength = getStrength(password)
  const strengthClass = ['', 'weak', 'fair', 'good', 'good'][strength.score]

  // ── FIX: use useEffect (not useState) to load Google GSI ────────────────
  useEffect(() => {
    const scriptId = 'google-gsi-script'
    const existing = document.getElementById(scriptId)
    if (existing && (window as any).google) {
      initGoogle()
      return
    }
    if (!existing) {
      const s = document.createElement('script')
      s.id = scriptId
      s.src = 'https://accounts.google.com/gsi/client'
      s.async = true
      s.defer = true
      s.onload = initGoogle
      document.head.appendChild(s)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const initGoogle = () => {
    const w = window as any
    if (!w.google || !process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) return
    w.google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      callback: handleGoogleResponse,
    })
  }

  const handleGoogleResponse = async (response: any) => {
    setGoogleLoading(true)
    try {
      await signIn(response.credential)
      router.push('/dashboard')
    } catch {
      setError('Google sign in failed. Please try again.')
      setGoogleLoading(false)
    }
  }

  const handleGoogleClick = () => {
    const w = window as any
    if (!w.google) return
    setGoogleLoading(true)
    w.google.accounts.id.prompt((notification: any) => {
      // prompt() can be suppressed if user dismissed it recently
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        setGoogleLoading(false)
      }
    })
    setTimeout(() => setGoogleLoading(false), 5000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!fullName.trim())        { setError('Please enter your full name'); return }
    if (!email)                  { setError('Please enter your email address'); return }
    if (password.length < 8)     { setError('Password must be at least 8 characters'); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }

    try {
      const result = await register(email, password, fullName.trim())
      setSentTo(result.email)
      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.')
    }
  }

  // ── Success screen ───────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-left">
          <div className="auth-left-glow" /><div className="auth-left-glow-2" />
          <Link href="/" className="auth-left-logo">
            <div className="auth-left-logo-icon"><IconLayers /></div>
            <span className="auth-left-logo-text">Research<span>AI</span></span>
          </Link>
          <div className="auth-left-content">
            <div className="auth-left-accent" />
            <h2 className="auth-left-heading">Almost there.<br />Check your <em>inbox.</em></h2>
            <p className="auth-left-sub">We've sent a verification link to confirm your email. Once verified, you'll have full access to ResearchAI.</p>
          </div>
          <div className="auth-left-footer">© 2026 ResearchAI</div>
        </div>
        <div className="auth-right">
          <div className="auth-form-box">
            <div className="auth-success">
              <div className="auth-success-icon"><IconCheck /></div>
              <h2 className="auth-success-heading">Account created!</h2>
              <p className="auth-success-sub">We've sent a verification link to</p>
              <p className="auth-success-email">{sentTo}</p>
              <p className="auth-success-sub" style={{ marginTop: 8 }}>
                Click the link in that email to activate your account, then sign in. Don't forget to check your spam folder.
              </p>
              <Link href="/signin" style={{ display: 'inline-block', marginTop: 24 }}>
                <button className="auth-submit" style={{ width: 'auto', padding: '12px 32px' }}>
                  Go to Sign In <IconArrow />
                </button>
              </Link>
              <p style={{ fontSize: '0.80rem', color: '#9ca3af', marginTop: 16 }}>
                Didn't receive it?{' '}
                <Link href="/signin" style={{ color: '#16a34a', fontWeight: 600 }}>Sign in to resend</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Registration form ────────────────────────────────────────────────────
  return (
    <div className="auth-page">

      {/* ══ LEFT PANEL ══ */}
      <div className="auth-left">
        <div className="auth-left-glow" /><div className="auth-left-glow-2" />
        <Link href="/" className="auth-left-logo">
          <div className="auth-left-logo-icon"><IconLayers /></div>
          <span className="auth-left-logo-text">Research<span>AI</span></span>
        </Link>
        <div className="auth-left-content">
          <div className="auth-left-accent" />
          <h2 className="auth-left-heading">
            Your first spec<br />is <em>completely</em><br />free.
          </h2>
          <p className="auth-left-sub">
            No credit card. No commitment. Just the best research specification you've ever produced — in minutes.
          </p>
          <div className="auth-proof-cards">
            {LEFT_FEATURES.map((f, i) => (
              <div key={i} className="auth-proof-card">
                <div className="auth-proof-icon">{f.icon}</div>
                <div className="auth-proof-text">{f.text}</div>
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

          <h1 className="auth-form-heading">Create your account</h1>
          <p className="auth-form-sub">
            Already have one? <Link href="/signin" style={{ color: '#16a34a', fontWeight: 600 }}>Sign in</Link>
          </p>

          {error && (
            <div className="auth-error">
              <span className="auth-error-icon"><IconAlert /></span>
              {error}
            </div>
          )}

          {/* Google button */}
          <button className="auth-google-btn" type="button" onClick={handleGoogleClick} disabled={googleLoading}>
            {googleLoading ? <span className="auth-spinner auth-spinner-green" /> : <GoogleIcon />}
            Continue with Google
          </button>

          <div className="auth-divider">
            <div className="auth-divider-line" />
            <span className="auth-divider-text">or sign up with email</span>
            <div className="auth-divider-line" />
          </div>

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label className="auth-label">Full name</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon"><IconUser /></span>
                <input type="text" className="auth-input" placeholder="Jane Smith" value={fullName} onChange={e => setFullName(e.target.value)} autoComplete="name" />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Email address</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon"><IconMail /></span>
                <input type="email" className="auth-input" placeholder="you@university.ac.uk" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Password</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon"><IconLock /></span>
                <input type="password" className="auth-input" placeholder="Minimum 8 characters" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
              </div>
              {password && (
                <>
                  <div className="auth-strength">
                    {[1,2,3,4].map(n => (
                      <div key={n} className={`auth-strength-bar ${n <= strength.score ? strengthClass : ''}`} />
                    ))}
                  </div>
                  <div className="auth-strength-label">{strength.label}</div>
                </>
              )}
            </div>

            <div className="auth-field">
              <label className="auth-label">Confirm password</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon"><IconLock /></span>
                <input type="password" className="auth-input" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" />
              </div>
            </div>

            <button type="submit" className="auth-submit" disabled={isLoading}>
              {isLoading ? <><span className="auth-spinner" />Creating account…</> : <>Create account <IconArrow /></>}
            </button>
          </form>

          <p className="auth-terms">
            By creating an account you agree to our{' '}
            <Link href="#">Terms of Service</Link> and <Link href="#">Privacy Policy</Link>.
          </p>
          <div className="auth-switch">Already have an account? <Link href="/signin">Sign in</Link></div>
          <div className="auth-back"><Link href="/">← Back to home</Link></div>
        </div>
      </div>
    </div>
  )
}
