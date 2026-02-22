'use client'

import { motion } from 'framer-motion'
import { Upload, Cpu, Download, ArrowRight } from 'lucide-react'

const steps = [
  {
    number: '01',
    icon: Upload,
    title: 'Upload Your Guidelines',
    description: "Upload your institution's research brief and any past projects. The system reads and understands every requirement.",
    color: '#0055cc',
    bg: 'rgba(0,85,204,0.08)',
  },
  {
    number: '02',
    icon: Cpu,
    title: '22 Agents Go to Work',
    description: 'Specialized agents conduct web research, synthesize literature, draft each section, and run iterative professor-level review.',
    color: '#0ea5e9',
    bg: 'rgba(14,165,233,0.08)',
  },
  {
    number: '03',
    icon: Download,
    title: 'Download Your Specification',
    description: 'Receive a complete, scored, submission-ready research specification as a professional Word document.',
    color: '#0055cc',
    bg: 'rgba(0,85,204,0.08)',
  },
]

export function HowItWorks() {
  return (
    <section className="py-28 px-6" style={{ background: '#f8fafc' }} id="how-it-works">
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
            Process
          </p>
          <h2 className="hero-heading text-5xl md:text-6xl font-bold mb-5"
              style={{ color: '#0f172a' }}>
            Three steps.{' '}
            <span className="text-gradient-blue">One specification.</span>
          </h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: '#64748b' }}>
            No complex setup, no prompt engineering. Just upload and wait.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid lg:grid-cols-3 gap-6 relative">
          {/* Connector line (desktop) */}
          <div className="hidden lg:block absolute top-14 left-1/3 right-1/3 h-px"
               style={{ background: 'linear-gradient(90deg, #0055cc, #0ea5e9, #0055cc)' }} />

          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="bg-white rounded-2xl p-8 relative shadow-sm"
              style={{ border: '1px solid #e2e8f0' }}
            >
              {/* Step number */}
              <div className="text-5xl font-black mb-5 font-mono leading-none"
                   style={{ color: 'rgba(0,85,204,0.08)' }}>
                {step.number}
              </div>

              {/* Icon */}
              <div className="inline-flex p-3 rounded-xl mb-5"
                   style={{ background: step.bg }}>
                <step.icon className="w-5 h-5" style={{ color: step.color }} />
              </div>

              <h3 className="text-xl font-bold mb-3" style={{ color: '#0f172a' }}>
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>
                {step.description}
              </p>

              {/* Arrow between steps (desktop) */}
              {i < steps.length - 1 && (
                <div className="hidden lg:flex absolute -right-3 top-14 z-10
                                w-6 h-6 rounded-full items-center justify-center"
                     style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                  <ArrowRight className="w-3 h-3" style={{ color: '#0055cc' }} />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}