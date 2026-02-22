'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export function Hero() {
  return (
    <section
      className="relative pt-32 pb-24 px-6 overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #020917 0%, #061529 40%, #0a2349 70%, #061529 100%)' }}
    >
      {/* Subtle grid */}
      <div className="absolute inset-0 pointer-events-none"
           style={{
             backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
             backgroundSize: '60px 60px',
           }} />

      {/* Blue glow orbs */}
      <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full blur-[120px] pointer-events-none"
           style={{ background: 'rgba(0,85,204,0.15)' }} />
      <div className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full blur-[100px] pointer-events-none"
           style={{ background: 'rgba(26,110,245,0.1)' }} />

      <div className="relative z-10 max-w-5xl mx-auto text-center">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full mb-10"
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-300" />
          <span className="text-sm font-medium text-blue-200">22 AI Agents · Research-Grade Output</span>
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="hero-heading text-6xl md:text-7xl lg:text-8xl font-bold leading-[0.95] mb-7"
        >
          <span className="text-white">Research specs</span>
          <br />
          <span className="text-gradient-white">written by AI,</span>
          <br />
          <span className="text-white">in minutes.</span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed font-light"
          style={{ color: 'rgba(255,255,255,0.6)' }}
        >
          A team of 22 specialized AI agents — each an expert in a different section —
          collaborating to produce submission-ready research specifications for BSc, MSc, and PhD students.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.38 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <Link href="/register">
            <motion.button
              whileHover={{ scale: 1.03, boxShadow: '0 8px 30px rgba(0,85,204,0.5)' }}
              whileTap={{ scale: 0.97 }}
              className="btn-white px-9 py-4 text-base"
            >
              Start for Free <ArrowRight className="w-4 h-4" />
            </motion.button>
          </Link>
          <motion.button
            whileHover={{ scale: 1.02 }}
            className="btn-ghost-dark px-8 py-4 text-base"
          >
            Watch a Demo ↗
          </motion.button>
        </motion.div>

        {/* Trust signals */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-6 text-sm"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          {[
            '2,400+ students',
            'BSc · MSc · PhD',
            'Any research field',
            'Download as Word doc',
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
              <span>{item}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* White wave at bottom — transitions into white section */}
      <div className="absolute bottom-0 inset-x-0 pointer-events-none">
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path d="M0 80 C360 0 1080 0 1440 80 L1440 80 L0 80 Z" fill="white"/>
        </svg>
      </div>
    </section>
  )
}