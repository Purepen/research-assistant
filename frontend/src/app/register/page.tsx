'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Brain, Mail, Lock, User, ArrowRight, AlertCircle, Loader2, CheckCircle, Inbox } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { authApi } from '@/lib/api'
import Link from 'next/link'

export default function RegisterPage() {
  const { register, isLoading } = useAuth()

  const [formData, setFormData] = useState({
    fullName:        '',
    email:           '',
    password:        '',
    confirmPassword: '',
  })
  const [error,         setError]         = useState('')
  // ✅ FIX: registeredEmail is set after success — we show a "check your email"
  //         screen. We do NOT redirect to /dashboard because the user is not
  //         verified or logged in yet.
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)
  const [resending,     setResending]     = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields')
      return
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    try {
      const { email } = await register(formData.email, formData.password, formData.fullName)
      // ✅ Show the "check your email" screen — do NOT push to /dashboard
      setRegisteredEmail(email)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.')
    }
  }

  const handleResend = async () => {
    if (!registeredEmail) return
    setResending(true)
    try {
      await authApi.resendVerification(registeredEmail)
      setResendSuccess(true)
    } catch {
      setResendSuccess(false)
    } finally {
      setResending(false)
    }
  }

  // ── SUCCESS SCREEN ────────────────────────────────────────────────────────
  if (registeredEmail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-xl border border-blue-100 max-w-md w-full text-center"
        >
          {/* Icon */}
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Inbox className="w-10 h-10 text-blue-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-3">Check your inbox</h2>

          <p className="text-gray-600 mb-2">
            We've sent a verification link to:
          </p>
          <p className="text-blue-700 font-semibold text-lg mb-6 break-all">
            {registeredEmail}
          </p>

          <p className="text-sm text-gray-500 mb-8">
            Click the link in the email to activate your account. After verifying,
            come back here and sign in.
          </p>

          {/* Resend button */}
          {!resendSuccess ? (
            <button
              onClick={handleResend}
              disabled={resending}
              className="w-full py-3 border-2 border-blue-200 text-blue-700 font-medium rounded-xl hover:bg-blue-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mb-4"
            >
              {resending
                ? <><Loader2 className="w-4 h-4 animate-spin" />Sending…</>
                : 'Resend verification email'
              }
            </button>
          ) : (
            <div className="mb-4 flex items-center justify-center gap-2 text-green-600 font-medium">
              <CheckCircle className="w-5 h-5" />
              Email resent! Check your inbox again.
            </div>
          )}

          <Link
            href="/signin"
            className="block w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all text-center"
          >
            Go to Sign In
          </Link>

          <p className="text-xs text-gray-400 mt-5">
            Can't find the email? Check your spam or junk folder.
          </p>
        </motion.div>
      </div>
    )
  }

  // ── REGISTRATION FORM ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4 py-12">

      {/* Background blobs */}
      <motion.div
        className="fixed top-20 left-20 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 pointer-events-none"
        animate={{ scale: [1, 1.2, 1], x: [0, 50, 0] }}
        transition={{ duration: 8, repeat: Infinity }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-blue-100">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
            <p className="text-gray-500">Start generating research specs in minutes</p>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Full name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="John Smith"
                  autoComplete="name"
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimum 8 characters"
                  autoComplete="new-password"
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {isLoading
                ? <><Loader2 className="w-5 h-5 animate-spin" />Creating account…</>
                : <>Create Account <ArrowRight className="w-4 h-4" /></>
              }
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-4">
            By creating an account you agree to our{' '}
            <a href="#" className="text-blue-600 hover:text-blue-700">Terms</a> and{' '}
            <a href="#" className="text-blue-600 hover:text-blue-700">Privacy Policy</a>
          </p>

          <p className="text-center text-sm text-gray-600 mt-5">
            Already have an account?{' '}
            <Link href="/signin" className="text-blue-600 hover:text-blue-700 font-semibold">
              Sign in
            </Link>
          </p>
        </div>

        <div className="text-center mt-5">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to home
          </Link>
        </div>
      </motion.div>
    </div>
  )
}