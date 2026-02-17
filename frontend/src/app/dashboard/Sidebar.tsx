'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  LayoutDashboard, 
  FileText, 
  PlusCircle, 
  User,
  Brain,
  LogOut
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Projects', href: '/dashboard/projects', icon: FileText },
  { name: 'Generate', href: '/dashboard/generate', icon: PlusCircle },
  { name: 'Profile', href: '/dashboard/profile', icon: User },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
      <div className="flex flex-col flex-grow bg-slate-900 border-r border-slate-800 pt-5 pb-4 overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center flex-shrink-0 px-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">
              Research AI
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-colors relative',
                  isActive
                    ? 'bg-purple-500/10 text-purple-400'
                    : 'text-gray-400 hover:bg-slate-800 hover:text-white'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-purple-500/10 rounded-xl"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                
                <item.icon
                  className={cn(
                    'mr-3 flex-shrink-0 h-5 w-5 relative z-10',
                    isActive ? 'text-purple-400' : 'text-gray-400 group-hover:text-white'
                  )}
                />
                <span className="relative z-10">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* User section */}
        <div className="flex-shrink-0 px-3 pb-4">
          <div className="glass-dark rounded-xl p-4 mb-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.full_name || 'User'}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-3 text-sm font-medium text-gray-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  )
}
