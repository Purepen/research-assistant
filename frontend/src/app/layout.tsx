import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ResearchAI — Generate Your Perfect Research Specification', 
  description: 'AI-powered academic research specification generator. Built for MSc & PhD students.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
