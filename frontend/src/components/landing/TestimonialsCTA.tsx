'use client'

import { motion } from 'framer-motion'
import { Star, ArrowRight, Quote } from 'lucide-react'
import Link from 'next/link'

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'PhD Student',
    school: 'MIT',
    content: 'Saved me two weeks of work. The AI understood my field perfectly and generated a specification my supervisor approved on the first review.',
    rating: 5,
    initials: 'SJ',
    color: '#0066FF',
  },
  {
    name: 'Michael Chen',
    role: 'MSc Student',
    school: 'Stanford',
    content: 'The literature review section was particularly impressive — it found papers I had missed and positioned my research gaps perfectly.',
    rating: 5,
    initials: 'MC',
    color: '#0099FF',
  },
  {
    name: 'Emma Williams',
    role: 'BSc Student',
    school: 'Oxford',
    content: 'As an undergrad struggling with academic writing, this tool taught me what a great specification looks like. Transformative.',
    rating: 5,
    initials: 'EW',
    color: '#00BFFF',
  },
]

export function Testimonials() {
  return (
    <section className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-blue-400 text-sm font-semibold tracking-[0.2em] uppercase mb-4">Testimonials</p>
          <h2 className="hero-heading text-5xl md:text-6xl font-bold text-white">
            Students trust it.
            <br />
            <span className="text-gradient">Supervisors approve it.</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-7 rounded-2xl relative group"
              style={{
                background: 'var(--navy)',
                border: '1px solid rgba(0,102,255,0.15)',
              }}
            >
              {/* Hover glow */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                   style={{ background: 'linear-gradient(135deg, rgba(0,102,255,0.06) 0%, transparent 100%)' }} />

              <div className="relative z-10">
                {/* Quote icon */}
                <Quote className="w-6 h-6 mb-5 opacity-40" style={{ color: '#4DA3FF' }} />

                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {Array(t.rating).fill(0).map((_, j) => (
                    <Star key={j} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                {/* Content */}
                <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
                  "{t.content}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                       style={{ background: t.color }}>
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{t.name}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {t.role} · {t.school}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function CTA() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative rounded-3xl p-14 text-center overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(0,102,255,0.12) 0%, rgba(4,18,39,0.9) 50%, rgba(0,153,255,0.08) 100%)',
            border: '1px solid rgba(0,102,255,0.25)',
          }}
        >
          {/* Glow backdrop */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                          w-[500px] h-[300px] rounded-full blur-[80px] pointer-events-none"
               style={{ background: 'rgba(0,102,255,0.1)' }} />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
                 style={{ background: 'rgba(0,102,255,0.12)', border: '1px solid rgba(0,102,255,0.25)' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-sm font-medium" style={{ color: '#4DA3FF' }}>
                Free to get started
              </span>
            </div>

            <h2 className="hero-heading text-5xl md:text-6xl font-bold text-white mb-6">
              Your research journey
              <br />
              starts <span className="text-gradient-cyan">right now.</span>
            </h2>

            <p className="text-lg mb-10 max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Join thousands of students who've stopped agonizing over specifications
              and started focusing on what matters — their actual research.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <motion.button
                  whileHover={{ scale: 1.03, boxShadow: '0 0 50px rgba(0,102,255,0.4)' }}
                  whileTap={{ scale: 0.97 }}
                  className="btn-primary px-10 py-4 text-base"
                >
                  Generate Your First Spec
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>

              <Link href="/signin">
                <button className="btn-ghost px-8 py-4 text-base">
                  Already have an account →
                </button>
              </Link>
            </div>

            <p className="text-xs mt-7" style={{ color: 'var(--text-muted)' }}>
              No credit card required · First spec in under 15 minutes
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}