'use client'

import { AnimatedBackground } from '@/components/landing/AnimatedBackground'
import { Hero } from '@/components/landing/Hero'
import { Features } from '@/components/landing/Features'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { Testimonials } from '@/components/landing/Testimonials'
import { CTA } from '@/components/landing/CTA'

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <AnimatedBackground />
      
      <div className="relative z-10">
        <Hero />
        <Features />
        <HowItWorks />
        <Testimonials />
        <CTA />
      </div>
    </main>
  )
}
