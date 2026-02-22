'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, User, ArrowRight, Loader2, Brain, AlertCircle, CheckCircle, Sparkles } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'

export default function RegisterPage() {
  const router    = useRouter()
  const { register, isLoading } = useAuth()

  const [formData, setFormData] = useState({ fullName: '', email: '', password: '', confirmPassword: '' })
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)
  const [sentTo,   setSentTo]   = useState('')

  const update = (field: string, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.fullName || !formData.email || !formData.password) {
      setError('Please fill in all fields')
      return
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    try {
      const result = await register(formData.email, formData.password, formData.fullName)
      setSentTo(result.email)
      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.')
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6"
           style={{ background: 'var(--deep-navy)' }}>
        <div className="absolute inset-0 grid-pattern opacity-40" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 w-full max-w-md text-center p-10 rounded-3xl"
          style={{ background: 'var(--navy)', border: '1px solid rgba(0,102,255,0.2)' }}
        >
          {/* Animated check */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', bounce: 0.4, delay: 0.1 }}
            className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-7"
            style={{ background: 'rgba(0,102,255,0.12)', border: '1px solid rgba(0,102,255,0.25)' }}
          >
            <CheckCircle className="w-10 h-10" style={{ color: '#4DA3FF' }} />
          </motion.div>

          <h2 className="display-serif text-3xl font-bold text-white mb-3">Check your inbox</h2>
          <p className="text-sm leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>
            We've sent a verification link to
          </p>
          <p className="font-semibold mb-6" style={{ color: '#4DA3FF' }}>{sentTo}</p>
          <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--text-muted)' }}>
            Click the link to activate your account, then come back to sign in.
            Don't forget to check your spam folder.
          </p>

          <Link href="/signin">
            <button className="btn-primary w-full justify-center mb-4">
              Go to Sign In <ArrowRight className="w-4 h-4" />
            </button>
          </Link>

          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Didn't receive it?{' '}
            <Link href="/signin" className="transition-colors hover:text-white" style={{ color: '#4DA3FF' }}>
              Sign in to resend
            </Link>
          </p>
        </motion.div>
      </div>
    )
  }

  // ── Registration form ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex" style={{ background: 'var(--deep-navy)' }}>

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12"
           style={{ background: 'linear-gradient(135deg, #020c1b 0%, #041a38 50%, #020c1b 100%)' }}>
        <div className="absolute inset-0 grid-pattern opacity-60" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-[600px] h-[600px] rounded-full blur-[100px]"
             style={{ background: 'radial-gradient(circle, rgba(0,102,255,0.10) 0%, transparent 70%)' }} />

        {/* Logo */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3 group w-fit">
            <div className="p-2.5 rounded-xl" style={{ background: 'rgba(0,102,255,0.15)', border: '1px solid rgba(0,102,255,0.3)' }}>
              <Brain className="w-6 h-6" style={{ color: '#4DA3FF' }} />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">Research Assistant</span>
          </Link>
        </div>

        {/* Center content */}
        <div className="relative z-10 max-w-sm">
          <div className="w-12 h-1 rounded-full mb-8" style={{ background: 'var(--blue-primary)' }} />
          <h2 className="display-serif text-4xl font-bold text-white leading-snug mb-6">
            One account.
            <br />
            <span className="text-gradient">Unlimited research.</span>
          </h2>

          {/* Feature list */}
          <div className="space-y-4">
            {[
              '22 specialized AI agents at your command',
              'Web research + literature synthesis',
              'Professor-level iterative review',
              'Download as professional Word doc',
            ].map((feat, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                     style={{ background: 'rgba(0,102,255,0.15)', border: '1px solid rgba(0,102,255,0.3)' }}>
                  <Sparkles className="w-2.5 h-2.5" style={{ color: '#4DA3FF' }} />
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{feat}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Join 2,400+ students already using Research Assistant
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
        <div className="absolute inset-0 dot-pattern opacity-30" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 justify-center mb-10">
            <div className="p-2.5 rounded-xl" style={{ background: 'rgba(0,102,255,0.15)', border: '1px solid rgba(0,102,255,0.3)' }}>
              <Brain className="w-6 h-6" style={{ color: '#4DA3FF' }} />
            </div>
            <span className="text-white font-bold text-lg">Research Assistant</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="display-serif text-4xl font-bold text-white mb-2">Create account</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Start generating research specs in minutes
            </p>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-5 p-4 rounded-xl flex items-start gap-3"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm" style={{ color: '#F87171' }}>{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                      style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={e => update('fullName', e.target.value)}
                  placeholder="John Smith"
                  autoComplete="name"
                  className="input-navy"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                      style={{ color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => update('email', e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="input-navy"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                      style={{ color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  value={formData.password}
                  onChange={e => update('password', e.target.value)}
                  placeholder="Minimum 8 characters"
                  autoComplete="new-password"
                  className="input-navy"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                      style={{ color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={e => update('confirmPassword', e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="input-navy"
                />
              </div>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white mt-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: isLoading ? 'var(--navy-3)' : 'var(--blue-primary)' }}
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Creating account…</>
              ) : (
                <>Create Account <ArrowRight className="w-4 h-4" /></>
              )}
            </motion.button>
          </form>

          <p className="text-xs text-center mt-5" style={{ color: 'var(--text-muted)' }}>
            By creating an account you agree to our{' '}
            <a href="#" className="hover:text-white transition-colors" style={{ color: '#4DA3FF' }}>Terms</a> and{' '}
            <a href="#" className="hover:text-white transition-colors" style={{ color: '#4DA3FF' }}>Privacy Policy</a>
          </p>

          <p className="text-center text-sm mt-5" style={{ color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link href="/signin" className="font-semibold hover:text-white transition-colors" style={{ color: '#4DA3FF' }}>
              Sign in
            </Link>
          </p>

          <div className="text-center mt-4">
            <Link href="/" className="text-xs hover:text-white transition-colors" style={{ color: 'var(--text-muted)' }}>
              ← Back to home
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}