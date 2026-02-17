'use client'

import { motion } from 'framer-motion'
import { Upload, Brain, FileText, Download } from 'lucide-react'

const steps = [
  {
    icon: Upload,
    number: '01',
    title: 'Upload Guidelines',
    description: 'Upload your university guidelines document'
  },
  {
    icon: Brain,
    number: '02',
    title: 'AI Processing',
    description: '22 agents analyze and generate specification'
  },
  {
    icon: FileText,
    number: '03',
    title: 'Review & Iterate',
    description: 'Professor AI reviews and improves iteratively'
  },
  {
    icon: Download,
    number: '04',
    title: 'Download & Submit',
    description: 'Get submission-ready specification'
  }
]

export function HowItWorks() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="text-5xl font-bold text-center mb-16 text-white"
        >
          How It Works
        </motion.h2>
        
        <div className="grid md:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.15 }}
              className="relative"
            >
              <div className="glass-dark p-8 rounded-2xl text-center">
                <div className="text-6xl font-bold text-purple-500/20 mb-4">
                  {step.number}
                </div>
                <step.icon className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                <p className="text-gray-400 text-sm">{step.description}</p>
              </div>
              
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-purple-500 to-transparent" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
