import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Research Assistant - AI-Powered Specification Generator',
  description: 'Generate professional research specifications with AI',
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
