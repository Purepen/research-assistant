'use client'

import { Bell, Menu } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60 border-b border-slate-800">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Mobile menu button */}
        <button className="lg:hidden p-2 text-gray-400 hover:text-white">
          <Menu className="w-6 h-6" />
        </button>

        {/* Right side */}
        <div className="flex items-center gap-4 ml-auto">
          {/* Notifications */}
          <button className="relative p-2 text-gray-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full" />
          </button>
        </div>
      </div>
    </header>
  )
}
