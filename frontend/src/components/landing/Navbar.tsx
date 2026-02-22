'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Menu, X } from 'lucide-react'
import Link from 'next/link'

export function Navbar() {
  const [scrolled, setScrolled]   = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className="fixed top-0 inset-x-0 z-50">
      <div
        className="transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(255,255,255,0.95)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: scrolled ? '1px solid #e2e8f0' : '1px solid transparent',
          boxShadow: scrolled ? '0 1px 12px rgba(0,0,0,0.06)' : 'none',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="p-2 rounded-xl transition-all"
                 style={{ background: 'rgba(0,85,204,0.08)', border: '1px solid rgba(0,85,204,0.15)' }}>
              <Brain className="w-4 h-4" style={{ color: '#0055cc' }} />
            </div>
            <span className="font-bold text-sm tracking-tight" style={{ color: '#0f172a' }}>
              Research Assistant
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-7">
            {[['Features', '#features'], ['How It Works', '#how-it-works'], ['Pricing', '#pricing']].map(([label, href]) => (
              <a key={label} href={href}
                 className="text-sm font-medium transition-colors hover:text-blue-600"
                 style={{ color: '#475569' }}>
                {label}
              </a>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/signin">
              <button className="text-sm font-medium px-4 py-2 rounded-xl transition-colors hover:text-blue-600"
                      style={{ color: '#475569' }}>
                Sign in
              </button>
            </Link>
            <Link href="/register">
              <button className="btn-primary text-sm px-5 py-2.5">
                Get Started
              </button>
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-xl"
            style={{ color: '#475569' }}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="md:hidden mx-4 mt-1 rounded-2xl p-4 shadow-xl"
            style={{ background: 'white', border: '1px solid #e2e8f0' }}
          >
            {[['Features', '#features'], ['How It Works', '#how-it-works'], ['Pricing', '#pricing']].map(([label, href]) => (
              <a key={label} href={href}
                 onClick={() => setMobileOpen(false)}
                 className="block px-4 py-3 rounded-xl text-sm font-medium transition-colors hover:bg-blue-50 hover:text-blue-600"
                 style={{ color: '#475569' }}>
                {label}
              </a>
            ))}
            <div className="flex gap-3 mt-3 pt-3" style={{ borderTop: '1px solid #e2e8f0' }}>
              <Link href="/signin" className="flex-1">
                <button className="btn-ghost-light w-full text-sm justify-center py-2.5">Sign in</button>
              </Link>
              <Link href="/register" className="flex-1">
                <button className="btn-primary w-full text-sm justify-center py-2.5">Get Started</button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}