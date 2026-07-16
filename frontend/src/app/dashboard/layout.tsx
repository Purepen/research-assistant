'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { Sidebar } from '@/app/dashboard/Sidebar'
import { Header } from '@/app/dashboard/Header'
import { TabBar } from '@/app/dashboard/TabBar'
import '@/app/dashboard/dashboard.css'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } })

function LoadingScreen() {
  return (
    <div style={{ minHeight:'100vh', background:'#f4f7f4', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16 }}>
      <style>{`@keyframes sp{to{transform:rotate(360deg)}} @keyframes fi{from{opacity:0} to{opacity:1}}`}</style>
      <div style={{ width:40, height:40, border:'3px solid #bbf7d0', borderTopColor:'#16a34a', borderRadius:'50%', animation:'sp .9s linear infinite' }}/>
      <p style={{ fontSize:'.82rem', color:'#9ca3af', animation:'fi .5s ease .3s both', margin:0 }}>Loading workspace…</p>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  // Mobile-only slide-out drawer state; on desktop the sidebar is always visible.
  const [sidebarOpen, setSidebarOpen] = useState(false)
  useEffect(() => { if (!isLoading && !isAuthenticated) router.push('/signin') }, [isAuthenticated, isLoading, router])
  if (isLoading || !isAuthenticated) return <LoadingScreen />

  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ minHeight:'100vh', background:'var(--g-bg)' }}>
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className={`g-sidebar-backdrop ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)} />
        <div className="g-main-wrap" style={{ paddingLeft:'var(--g-sidebar-w)' }}>
          <Header onMenu={() => setSidebarOpen(true)} />
          <main className="g-main" style={{ padding:'28px 32px 60px', maxWidth:1240, boxSizing:'border-box' }}>{children}</main>
        </div>
        <TabBar />
      </div>
    </QueryClientProvider>
  )
}
