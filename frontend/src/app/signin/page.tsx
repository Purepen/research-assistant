'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Brain, Mail, Lock, ArrowRight, AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { authApi } from '@/lib/api'
import Link from 'next/link'

// ── Tell TypeScript about the Google GSI global ───────────────────────────────
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize:   (config: any) => void
          renderButton: (element: HTMLElement, config: any) => void
          prompt:       () => void
        }
      }
    }
  }
}

export default function SignInPage() {
  const router                          = useRouter()
  const { signIn, signInWithEmail, isAuthenticated, isLoading, clearError } = useAuth()

  const [email,          setEmail]          = useState('')
  const [password,       setPassword]       = useState('')
  const [error,          setError]          = useState('')
  const [emailUnverified, setEmailUnverified] = useState(false)
  const [resending,      setResending]      = useState(false)
  const [resendSuccess,  setResendSuccess]  = useState(false)
  const [googleLoading,  setGoogleLoading]  = useState(false)
  const googleBtnRef                        = useRef<HTMLDivElement>(null)

  // ── Redirect if already logged in ────────────────────────────────────────
  useEffect(() => {
    if (isAuthenticated) router.push('/dashboard')
  }, [isAuthenticated, router])

  // ── Load Google Identity Services script on mount ─────────────────────────
  // ✅ FIX: the previous version never loaded this script.
  //         Google sign-in silently failed because window.google was undefined.
  useEffect(() => {
    const scriptId = 'google-gsi-script'
    if (document.getElementById(scriptId)) {
      // already loaded from a previous navigation
      initGoogle()
      return
    }

    const script    = document.createElement('script')
    script.id       = scriptId
    script.src      = 'https://accounts.google.com/gsi/client'
    script.async    = true
    script.defer    = true
    script.onload   = initGoogle
    script.onerror  = () => console.warn('Google GSI script failed to load')
    document.head.appendChild(script)
  }, [])

  const initGoogle = () => {
    if (!window.google || !process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) return

    window.google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      callback:  handleGoogleResponse,
    })

    // Render the official Google button inside our custom div
    if (googleBtnRef.current) {
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size:  'large',
        width: googleBtnRef.current.offsetWidth || 400,
        text:  'continue_with',
      })
    }
  }

  const handleGoogleResponse = async (response: any) => {
    setGoogleLoading(true)
    setError('')
    try {
      await signIn(response.credential)
      router.push('/dashboard')
    } catch {
      setError('Google sign in failed. Please try again.')
    } finally {
      setGoogleLoading(false)
    }
  }

  // ── Email / password sign in ──────────────────────────────────────────────
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setEmailUnverified(false)
    clearError()

    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    try {
      await signInWithEmail(email, password)
      router.push('/dashboard')
    } catch (err: any) {
      const detail = err.response?.data?.detail || ''

      // ✅ Backend returns "EMAIL_NOT_VERIFIED" as the detail string
      //    so we can show a targeted message with a resend link.
      if (detail === 'EMAIL_NOT_VERIFIED') {
        setEmailUnverified(true)
        setError('Your email address has not been verified yet.')
      } else {
        setError(detail || 'Sign in failed. Check your credentials.')
      }
    }
  }

  // ── Resend verification email ─────────────────────────────────────────────
  const handleResend = async () => {
    setResending(true)
    try {
      await authApi.resendVerification(email)
      setResendSuccess(true)
    } catch {
      setError('Could not resend verification email. Try again later.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4">

      {/* Background blobs */}
      <motion.div
        className="fixed top-20 left-20 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 pointer-events-none"
        animate={{ scale: [1, 1.2, 1], x: [0, 50, 0] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="fixed bottom-20 right-20 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 pointer-events-none"
        animate={{ scale: [1, 1.1, 1], x: [0, -30, 0] }}
        transition={{ duration: 10, repeat: Infinity }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-blue-100">

          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Welcome back</h1>
            <p className="text-gray-500">Sign in to your Research Assistant</p>
          </div>

          {/* Error banner */}
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-700">{error}</p>

                  {/* Unverified email — show resend option */}
                  {emailUnverified && !resendSuccess && (
                    <button
                      onClick={handleResend}
                      disabled={resending}
                      className="mt-2 flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-800 transition-colors"
                    >
                      {resending
                        ? <><Loader2 className="w-3 h-3 animate-spin" />Sending…</>
                        : <><RefreshCw className="w-3 h-3" />Resend verification email</>
                      }
                    </button>
                  )}
                  {resendSuccess && (
                    <p className="mt-1 text-sm text-green-600 font-medium">
                      ✓ Verification email sent! Check your inbox.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Email form */}
          <form onSubmit={handleEmailSignIn} className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-blue-600 hover:text-blue-700">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading
                ? <><Loader2 className="w-5 h-5 animate-spin" />Signing in…</>
                : <>Sign In <ArrowRight className="w-4 h-4" /></>
              }
            </button>
          </form>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          {/* Google button — rendered by the official GSI SDK into this div */}
          {/* The SDK injects its own iframe/button here, sized to full width.  */}
          <div className="w-full overflow-hidden rounded-xl mb-6">
            <div
              ref={googleBtnRef}
              className="w-full"
              style={{ minHeight: 44 }}
            />
            {/* Fallback while SDK loads or if NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing */}
            {!window?.google && (
              <div className="w-full py-3 border-2 border-gray-200 rounded-xl text-gray-500 text-sm text-center">
                Loading Google sign in…
              </div>
            )}
          </div>

          {/* Sign up link */}
          <p className="text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link href="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
              Create one
            </Link>
          </p>
        </div>

        <div className="text-center mt-5">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            ← Back to home
          </Link>
        </div>
      </motion.div>
    </div>
  )
}