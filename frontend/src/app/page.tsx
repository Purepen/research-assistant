'use client'

import { AnimatedBackground } from '@/components/landing/AnimatedBackground'
import { Navbar } from '@/components/landing/Navbar'
import { Hero } from '@/components/landing/Hero'
import { Features } from '@/components/landing/Features'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { Testimonials, CTA } from '@/components/landing/TestimonialsCTA'

export default function Home() {
  return (
    <main style={{ background: 'white' }}>
      <AnimatedBackground />
      <Navbar />
      <Hero />
      <div id="features"><Features /></div>
      <div id="how-it-works"><HowItWorks /></div>
      <Testimonials />
      <CTA />

      {/* Footer */}
      <footer className="py-10 px-6 text-center"
              style={{ background: '#020917', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
          © 2026 Research Assistant · Built with 22 AI agents · All rights reserved
        </p>
      </footer>
    </main>
  )
}