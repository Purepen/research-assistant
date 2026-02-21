'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Brain, CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react'
import { authApi } from '@/lib/api'
import Link from 'next/link'

// ── Inner component that reads search params ──────────────────────────────────
// (must be wrapped in Suspense when using useSearchParams in Next.js app router)
function VerifyEmailInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [status,  setStatus]  = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')

    if (!token) {
      setStatus('error')
      setMessage('No verification token found. Please check the link in your email.')
      return
    }

    verifyEmail(token)
  }, [searchParams])

  const verifyEmail = async (token: string) => {
    try {
      await authApi.verifyEmail(token)
      setStatus('success')
      setMessage('Your email has been verified! You can now sign in.')

      // ✅ FIX: redirect to /signin not /dashboard.
      //         The user has no access_token at this point — sending them to
      //         /dashboard immediately causes the layout guard to bounce them
      //         back to /signin anyway, breaking the UX. Now we go there directly.
      setTimeout(() => router.push('/signin'), 3000)

    } catch (err: any) {
      setStatus('error')
      setMessage(
        err.response?.data?.detail ||
        'This verification link is invalid or has already been used. Please request a new one.'
      )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-xl border border-blue-100 max-w-md w-full text-center"
      >

        {/* Brand icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-lg">
          <Brain className="w-8 h-8 text-white" />
        </div>

        {/* ── Loading ── */}
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying your email…</h2>
            <p className="text-gray-500">Please wait a moment.</p>
          </>
        )}

        {/* ── Success ── */}
        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-9 h-9 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h2>
            <p className="text-gray-600 mb-6">{message}</p>

            <Link
              href="/signin"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
            >
              Sign In Now <ArrowRight className="w-4 h-4" />
            </Link>

            <p className="text-xs text-gray-400 mt-4">
              Redirecting to sign in automatically…
            </p>
          </>
        )}

        {/* ── Error ── */}
        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-9 h-9 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
            <p className="text-gray-600 mb-6">{message}</p>

            <Link
              href="/signin"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all mb-3"
            >
              Go to Sign In
            </Link>

            <p className="text-sm text-gray-500 mt-2">
              Need a new link?{' '}
              <Link href="/signin" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign in to resend it
              </Link>
            </p>
          </>
        )}

      </motion.div>
    </div>
  )
}

// ── Page wrapper with Suspense boundary ──────────────────────────────────────
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    }>
      <VerifyEmailInner />
    </Suspense>
  )
}