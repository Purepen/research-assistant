'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

export function CTA() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          className="glass-dark p-12 rounded-3xl"
        >
          <h2 className="text-5xl font-bold mb-6 text-white">
            Ready to Generate Your
            <br />
            Research Specification?
          </h2>
          
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of students who've accelerated their research journey
          </p>
          
          <Link href="/signin">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-12 py-5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-white text-lg font-semibold flex items-center gap-3 mx-auto hover:shadow-2xl hover:shadow-purple-500/50 transition-shadow"
            >
              Get Started Free
              <ArrowRight className="w-6 h-6" />
            </motion.button>
          </Link>
          
          <p className="text-sm text-gray-400 mt-6">
            No credit card required • Generate your first spec in 10 minutes
          </p>
        </motion.div>
      </div>
    </section>
  )
}
