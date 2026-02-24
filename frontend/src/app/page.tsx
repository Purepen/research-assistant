import { LandingNav }          from '@/components/landing/LandingNav'
import { LandingHero }         from '@/components/landing/LandingHero'
import { LandingLogos }        from '@/components/landing/LandingLogos'
import { LandingStats }        from '@/components/landing/LandingStats'
import { LandingFeatures }     from '@/components/landing/LandingFeatures'
import { LandingHowItWorks }   from '@/components/landing/LandingHowItWorks'
import { LandingTestimonials } from '@/components/landing/LandingTestimonials'
import { LandingPricing }      from '@/components/landing/LandingPricing'
import { LandingCTA }          from '@/components/landing/LandingCTA'
import { LandingFooter }       from '@/components/landing/LandingFooter'
import '@/components/landing/landing.css'

export default function HomePage() {
  return (
    <div className="rai-page">
      <LandingNav />
      <LandingHero />
      <LandingLogos />
      <LandingStats />
      <LandingFeatures />
      <LandingHowItWorks />
      <LandingTestimonials />
      <LandingPricing />
      <LandingCTA />
      <LandingFooter />
    </div>
  )
}
