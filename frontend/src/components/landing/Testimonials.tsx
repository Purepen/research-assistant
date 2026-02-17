'use client'

import { motion } from 'framer-motion'
import { Star } from 'lucide-react'

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'PhD Student, MIT',
    content: 'Saved me 2 weeks of work. The AI understood my field perfectly and generated a spec that my supervisor approved on first review.',
    rating: 5
  },
  {
    name: 'Michael Chen',
    role: 'MSc Student, Stanford',
    content: 'The literature review section was particularly impressive. Found papers I had missed and positioned my research perfectly.',
    rating: 5
  },
  {
    name: 'Emma Williams',
    role: 'BSc Student, Oxford',
    content: 'As an undergrad, I was struggling with academic writing. This tool taught me what good specifications look like.',
    rating: 5
  }
]

export function Testimonials() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="text-5xl font-bold text-center mb-16 text-white"
        >
          Trusted by Students Worldwide
        </motion.h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-dark p-8 rounded-2xl"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              
              <p className="text-gray-300 mb-6 italic">"{testimonial.content}"</p>
              
              <div>
                <div className="font-bold text-white">{testimonial.name}</div>
                <div className="text-sm text-gray-400">{testimonial.role}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
