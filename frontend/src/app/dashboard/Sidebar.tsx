'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, FileText, PlusCircle, User, Brain, LogOut, ChevronRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const navigation = [
  { name: 'Dashboard',  href: '/dashboard',           icon: LayoutDashboard, description: 'Overview & stats' },
  { name: 'Projects',   href: '/dashboard/projects',  icon: FileText,        description: 'All specifications' },
  { name: 'Generate',   href: '/dashboard/generate',  icon: PlusCircle,      description: 'New specification' },
  { name: 'Profile',    href: '/dashboard/profile',   icon: User,            description: 'Account settings' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col"
         style={{ zIndex: 40 }}>
      <div className="flex flex-col flex-grow overflow-y-auto"
           style={{
             background: 'linear-gradient(180deg, #041227 0%, #020c1b 100%)',
             borderRight: '1px solid rgba(0,102,255,0.12)',
           }}>

        {/* Logo */}
        <div className="flex items-center flex-shrink-0 px-5 pt-6 pb-8">
          <Link href="/" className="flex items-center gap-3 group w-fit">
            <div className="p-2.5 rounded-xl transition-all group-hover:scale-105"
                 style={{ background: 'rgba(0,102,255,0.15)', border: '1px solid rgba(0,102,255,0.3)' }}>
              <Brain className="w-5 h-5" style={{ color: '#4DA3FF' }} />
            </div>
            <div>
              <div className="text-sm font-bold text-white leading-tight">Research</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Assistant AI</div>
            </div>
          </Link>
        </div>

        {/* Nav label */}
        <div className="px-5 mb-2">
          <span className="section-label">Navigation</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))

            return (
              <Link key={item.name} href={item.href} className="group block relative">
                <motion.div
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150 ${
                    isActive ? '' : 'hover:bg-blue-500/5'
                  }`}
                  style={isActive ? {
                    background: 'rgba(0,102,255,0.12)',
                    border: '1px solid rgba(0,102,255,0.2)',
                  } : { border: '1px solid transparent' }}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                      style={{ background: 'var(--blue-primary)' }}
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                    />
                  )}

                  <item.icon
                    className="w-4 h-4 flex-shrink-0 transition-colors"
                    style={{ color: isActive ? '#4DA3FF' : 'var(--text-muted)' }}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium transition-colors"
                         style={{ color: isActive ? '#4DA3FF' : 'var(--text-secondary)' }}>
                      {item.name}
                    </div>
                    <div className="text-xs truncate"
                         style={{ color: 'var(--text-muted)' }}>
                      {item.description}
                    </div>
                  </div>

                  {isActive && (
                    <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: '#4DA3FF' }} />
                  )}
                </motion.div>
              </Link>
            )
          })}
        </nav>

        {/* Bottom section */}
        <div className="flex-shrink-0 p-3 space-y-2">
          {/* Divider */}
          <div className="h-px mx-2 mb-4" style={{ background: 'rgba(0,102,255,0.1)' }} />

          {/* User card */}
          <div className="p-3.5 rounded-xl"
               style={{ background: 'rgba(7,26,54,0.6)', border: '1px solid rgba(0,102,255,0.12)' }}>
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                   style={{ background: 'linear-gradient(135deg, #0066FF, #00BFFF)' }}>
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user?.full_name || 'User'}</p>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Sign out */}
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'
              ;(e.currentTarget as HTMLElement).style.color = '#F87171'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
            }}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  )
}