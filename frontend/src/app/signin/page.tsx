'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, ArrowRight, RefreshCw, Loader2, Brain, AlertCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { authApi } from '@/lib/api'
import Link from 'next/link'

declare global { interface Window { google: any } }

export default function SignInPage() {
  const router = useRouter()
  const { signIn, signInWithEmail, isAuthenticated, clearError } = useAuth()
  const googleBtnRef = useRef<HTMLDivElement>(null)

  const [email,           setEmail]           = useState('')
  const [password,        setPassword]        = useState('')
  const [error,           setError]           = useState('')
  const [isLoading,       setIsLoading]       = useState(false)
  const [emailUnverified, setEmailUnverified] = useState(false)
  const [resending,       setResending]       = useState(false)
  const [resendSuccess,   setResendSuccess]   = useState(false)

  useEffect(() => { if (isAuthenticated) router.push('/dashboard') }, [isAuthenticated, router])

  useEffect(() => {
    const scriptId = 'google-gsi-script'
    if (document.getElementById(scriptId)) { initGoogle(); return }
    const s = document.createElement('script')
    s.id = scriptId; s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.defer = true
    s.onload = initGoogle
    document.head.appendChild(s)
  }, [])

  const initGoogle = () => {
    if (!window.google || !process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) return
    window.google.accounts.id.initialize({ client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID, callback: handleGoogleResponse })
    if (googleBtnRef.current) {
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline', size: 'large', width: googleBtnRef.current.offsetWidth || 400, text: 'continue_with',
      })
    }
  }

  const handleGoogleResponse = async (response: any) => {
    setError('')
    try { await signIn(response.credential); router.push('/dashboard') }
    catch { setError('Google sign in failed. Please try again.') }
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setEmailUnverified(false); clearError()
    if (!email || !password) { setError('Please fill in all fields'); return }
    setIsLoading(true)
    try { await signInWithEmail(email, password); router.push('/dashboard') }
    catch (err: any) {
      const detail = err.response?.data?.detail || ''
      if (detail === 'EMAIL_NOT_VERIFIED') { setEmailUnverified(true); setError('Your email address has not been verified yet.') }
      else setError(detail || 'Sign in failed. Check your credentials.')
    } finally { setIsLoading(false) }
  }

  const handleResend = async () => {
    setResending(true)
    try { await authApi.resendVerification(email); setResendSuccess(true) }
    catch { setError('Could not resend. Please try again.') }
    finally { setResending(false) }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'white' }}>

      {/* Left — deep blue decorative panel */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden flex-col justify-between p-12"
           style={{ background: 'linear-gradient(160deg, #020917 0%, #061529 50%, #0a2349 100%)' }}>

        <div className="absolute inset-0 pointer-events-none"
             style={{
               backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
               backgroundSize: '60px 60px',
             }} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full blur-[100px] pointer-events-none"
             style={{ background: 'rgba(0,85,204,0.18)' }} />

        {/* Logo */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3 w-fit group">
            <div className="p-2.5 rounded-xl"
                 style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-white">Research Assistant</span>
          </Link>
        </div>

        {/* Center copy */}
        <div className="relative z-10 max-w-sm">
          <div className="w-10 h-1 rounded-full mb-8" style={{ background: '#1a6ef5' }} />
          <h2 className="display-serif text-4xl font-bold text-white leading-snug mb-6">
            Research-grade specs,{' '}
            <span className="text-gradient-white">in minutes.</span>
          </h2>
          <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
            22 specialized AI agents collaborating to generate complete,
            scored, and submission-ready research specifications.
          </p>

          <div className="flex gap-10 mt-10">
            {[['2,400+', 'Students'], ['4.9★', 'Rating'], ['15 min', 'Avg time']].map(([val, label]) => (
              <div key={label}>
                <div className="text-xl font-bold text-white">{val}</div>
                <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <div className="relative z-10 p-5 rounded-2xl"
             style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <p className="text-sm leading-relaxed mb-3" style={{ color: 'rgba(255,255,255,0.6)' }}>
            "Saved me two weeks of work. My supervisor approved the spec on the first review."
          </p>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                 style={{ background: 'linear-gradient(135deg,#0055cc,#0ea5e9)' }}>S</div>
            <div>
              <div className="text-xs font-semibold text-white">Sarah J.</div>
              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>PhD Student, MIT</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right — white form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12"
           style={{ background: '#f8fafc' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 justify-center mb-10">
            <div className="p-2.5 rounded-xl"
                 style={{ background: 'rgba(0,85,204,0.08)', border: '1px solid rgba(0,85,204,0.15)' }}>
              <Brain className="w-5 h-5" style={{ color: '#0055cc' }} />
            </div>
            <span className="font-bold" style={{ color: '#0f172a' }}>Research Assistant</span>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl p-8 shadow-sm" style={{ border: '1px solid #e2e8f0' }}>
            <div className="mb-7">
              <h1 className="display-serif text-3xl font-bold mb-1.5" style={{ color: '#0f172a' }}>
                Welcome back
              </h1>
              <p className="text-sm" style={{ color: '#64748b' }}>
                Sign in to your Research Assistant account
              </p>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="mb-5 p-4 rounded-xl flex items-start gap-3"
                  style={{ background: '#fef2f2', border: '1px solid #fecaca' }}
                >
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-red-700">{error}</p>
                    {emailUnverified && (
                      <div className="mt-2">
                        {resendSuccess
                          ? <p className="text-xs text-green-600">✓ Verification email sent!</p>
                          : <button onClick={handleResend} disabled={resending}
                                    className="text-xs font-medium text-blue-600 flex items-center gap-1.5 hover:underline">
                              {resending ? <><Loader2 className="w-3 h-3 animate-spin" />Sending…</> : <><RefreshCw className="w-3 h-3" />Resend verification email</>}
                            </button>
                        }
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Google button */}
            <div className="mb-5">
              <div ref={googleBtnRef} className="w-full rounded-xl overflow-hidden" style={{ minHeight: '44px' }} />
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px" style={{ background: '#e2e8f0' }} />
              <span className="text-xs" style={{ color: '#94a3b8' }}>or continue with email</span>
              <div className="flex-1 h-px" style={{ background: '#e2e8f0' }} />
            </div>

            {/* Form */}
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Email address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#94a3b8' }} />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                         placeholder="you@example.com" autoComplete="email" className="input-light" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium" style={{ color: '#374151' }}>Password</label>
                  <Link href="/forgot-password" className="text-xs font-medium hover:underline" style={{ color: '#0055cc' }}>
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#94a3b8' }} />
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                         placeholder="••••••••" autoComplete="current-password" className="input-light" />
                </div>
              </div>

              <button type="submit" disabled={isLoading}
                      className="btn-primary w-full justify-center py-3.5 mt-1 disabled:opacity-50 disabled:cursor-not-allowed">
                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Signing in…</> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>

            <p className="text-center text-sm mt-6" style={{ color: '#64748b' }}>
              Don't have an account?{' '}
              <Link href="/register" className="font-semibold hover:underline" style={{ color: '#0055cc' }}>
                Create one
              </Link>
            </p>
          </div>

          <div className="text-center mt-5">
            <Link href="/" className="text-xs hover:underline" style={{ color: '#94a3b8' }}>
              ← Back to home
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}