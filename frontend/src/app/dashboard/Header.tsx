'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Bell, Search, Menu, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { LayoutDashboard, FileText, PlusCircle, User, Brain, LogOut } from 'lucide-react'

const breadcrumbs: Record<string, string> = {
  '/dashboard':           'Dashboard',
  '/dashboard/projects':  'Projects',
  '/dashboard/generate':  'Generate',
  '/dashboard/profile':   'Profile',
}

const mobileNav = [
  { name: 'Dashboard', href: '/dashboard',          icon: LayoutDashboard },
  { name: 'Projects',  href: '/dashboard/projects', icon: FileText },
  { name: 'Generate',  href: '/dashboard/generate', icon: PlusCircle },
  { name: 'Profile',   href: '/dashboard/profile',  icon: User },
]

export function Header() {
  const pathname        = usePathname()
  const { user, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const currentPage = breadcrumbs[pathname] ||
    (pathname.includes('/projects/') ? 'Project Detail' : 'Dashboard')

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3.5"
              style={{
                background: 'rgba(2,12,27,0.85)',
                backdropFilter: 'blur(12px)',
                borderBottom: '1px solid rgba(0,102,255,0.1)',
              }}>

        {/* Left: mobile menu + breadcrumb */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-xl transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-base font-semibold text-white">{currentPage}</h1>
            <p className="text-xs hidden sm:block" style={{ color: 'var(--text-muted)' }}>
              Research Assistant · AI Platform
            </p>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-3">
          {/* Search (desktop) */}
          <button className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all"
                  style={{
                    background: 'rgba(7,26,54,0.5)',
                    border: '1px solid rgba(0,102,255,0.12)',
                    color: 'var(--text-muted)',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,102,255,0.25)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,102,255,0.12)'}
          >
            <Search className="w-3.5 h-3.5" />
            <span className="text-xs">Search…</span>
            <kbd className="text-xs px-1.5 py-0.5 rounded"
                 style={{ background: 'rgba(0,102,255,0.1)', color: 'var(--text-muted)' }}>⌘K</kbd>
          </button>

          {/* Notification bell */}
          <button className="relative p-2 rounded-xl transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'white'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}>
            <Bell className="w-4 h-4" />
          </button>

          {/* Avatar */}
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white cursor-pointer"
               style={{ background: 'linear-gradient(135deg, #0066FF, #00BFFF)' }}
               title={user?.email}>
            {initials}
          </div>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"
               onClick={() => setMobileOpen(false)} />

          {/* Drawer */}
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 28 }}
            className="relative z-10 w-64 flex flex-col"
            style={{
              background: '#041227',
              borderRight: '1px solid rgba(0,102,255,0.15)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5"
                 style={{ borderBottom: '1px solid rgba(0,102,255,0.1)' }}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl"
                     style={{ background: 'rgba(0,102,255,0.15)', border: '1px solid rgba(0,102,255,0.3)' }}>
                  <Brain className="w-4 h-4" style={{ color: '#4DA3FF' }} />
                </div>
                <span className="text-sm font-bold text-white">Research AI</span>
              </div>
              <button onClick={() => setMobileOpen(false)}
                      className="p-1.5 rounded-lg"
                      style={{ color: 'var(--text-muted)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 p-3 space-y-1">
              {mobileNav.map(item => {
                const isActive = pathname === item.href
                return (
                  <Link key={item.name} href={item.href} onClick={() => setMobileOpen(false)}>
                    <div className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all ${isActive ? '' : 'hover:bg-blue-500/5'}`}
                         style={isActive ? {
                           background: 'rgba(0,102,255,0.12)',
                           border: '1px solid rgba(0,102,255,0.2)',
                           color: '#4DA3FF',
                         } : { border: '1px solid transparent', color: 'var(--text-secondary)' }}>
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="font-medium">{item.name}</span>
                    </div>
                  </Link>
                )
              })}
            </nav>

            {/* User */}
            <div className="p-3" style={{ borderTop: '1px solid rgba(0,102,255,0.1)' }}>
              <div className="p-3 rounded-xl mb-2"
                   style={{ background: 'rgba(7,26,54,0.6)', border: '1px solid rgba(0,102,255,0.12)' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                       style={{ background: 'linear-gradient(135deg, #0066FF, #00BFFF)' }}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{user?.full_name}</div>
                    <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user?.email}</div>
                  </div>
                </div>
              </div>
              <button
                onClick={signOut}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'; (e.currentTarget as HTMLElement).style.color = '#F87171'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}