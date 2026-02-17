'use client'

import { motion } from 'framer-motion'
import { Brain, Zap, Target, CheckCircle } from 'lucide-react'

const features = [
  {
    icon: Brain,
    title: '22 AI Agents',
    description: 'Specialized agents for each section - from literature review to methodology'
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Generate complete specifications in 5-15 minutes, not days'
  },
  {
    icon: Target,
    title: 'Field-Agnostic',
    description: 'Works for any research field - CS, Biology, Engineering, Social Sciences'
  },
  {
    icon: CheckCircle,
    title: 'Professor Review',
    description: 'Built-in AI professor reviews with iterative improvements'
  }
]

export function Features() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="text-5xl font-bold text-center mb-16 text-white"
        >
          Why Research Assistant?
        </motion.h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -10 }}
              className="glass-dark p-6 rounded-2xl"
            >
              <feature.icon className="w-12 h-12 text-purple-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
