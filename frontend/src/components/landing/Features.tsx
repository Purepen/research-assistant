'use client'

import { motion } from 'framer-motion'
import { Cpu, Zap, Globe, BookOpen, CheckCircle, Shield } from 'lucide-react'

const features = [
  {
    icon: Cpu,
    title: '22 Specialized Agents',
    description: 'Each section of your specification has a dedicated AI expert. Not one model doing everything — a coordinated team.',
    color: '#0055cc',
    bg: 'rgba(0,85,204,0.06)',
    border: 'rgba(0,85,204,0.15)',
  },
  {
    icon: Zap,
    title: 'Under 15 Minutes',
    description: 'What takes days of agonizing drafting is done while you have your morning coffee. Start to submission-ready.',
    color: '#0ea5e9',
    bg: 'rgba(14,165,233,0.06)',
    border: 'rgba(14,165,233,0.15)',
  },
  {
    icon: Globe,
    title: 'Any Research Field',
    description: 'Computer Science, Biomedical, Social Sciences, Engineering — the system adapts its knowledge to your exact domain.',
    color: '#0055cc',
    bg: 'rgba(0,85,204,0.06)',
    border: 'rgba(0,85,204,0.15)',
  },
  {
    icon: BookOpen,
    title: 'Real Literature Review',
    description: 'Discovers and synthesizes actual academic papers. Finds genuine research gaps and positions your contribution.',
    color: '#0ea5e9',
    bg: 'rgba(14,165,233,0.06)',
    border: 'rgba(14,165,233,0.15)',
  },
  {
    icon: CheckCircle,
    title: 'Professor-Level Review',
    description: 'A built-in AI examiner scores and critiques before you even submit. Iterative improvements until it passes.',
    color: '#0055cc',
    bg: 'rgba(0,85,204,0.06)',
    border: 'rgba(0,85,204,0.15)',
  },
  {
    icon: Shield,
    title: 'Academic Integrity',
    description: 'Generates a specification template and framework — helping you understand structure, not replacing your thinking.',
    color: '#0ea5e9',
    bg: 'rgba(14,165,233,0.06)',
    border: 'rgba(14,165,233,0.15)',
  },
]

export function Features() {
  return (
    <section className="py-28 px-6" style={{ background: 'white' }} id="features">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-sm font-bold tracking-[0.2em] uppercase mb-4"
             style={{ color: '#0055cc' }}>
            Capabilities
          </p>
          <h2 className="hero-heading text-5xl md:text-6xl font-bold mb-5"
              style={{ color: '#0f172a' }}>
            Built different.{' '}
            <span className="text-gradient-blue">Performs different.</span>
          </h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: '#64748b' }}>
            Not a template filler. Not a chatbot wrapper.
            A purpose-built academic research intelligence system.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="card-white p-7 group"
            >
              <div className="inline-flex p-3 rounded-xl mb-5"
                   style={{ background: f.bg, border: `1px solid ${f.border}` }}>
                <f.icon className="w-5 h-5" style={{ color: f.color }} />
              </div>
              <h3 className="text-lg font-bold mb-2.5" style={{ color: '#0f172a' }}>
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>
                {f.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}