'use client'

import { motion } from 'framer-motion'
import { FileText, Clock, CheckCircle, TrendingUp, ArrowRight, Plus, Sparkles, Activity } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useProjects } from '@/hooks/useProjects'
import { useUserStats } from '@/hooks/useUser'
import { useAuth } from '@/hooks/useAuth'
import { getStatusColor } from '@/lib/utils'
import Link from 'next/link'

const statusStyles: Record<string, { badge: string; dot: string; label: string }> = {
  complete:   { badge: 'badge badge-green',  dot: 'bg-green-400',  label: 'Complete'   },
  generating: { badge: 'badge badge-blue',   dot: 'bg-blue-400 animate-pulse',   label: 'Generating' },
  queued:     { badge: 'badge badge-yellow', dot: 'bg-yellow-400', label: 'Queued'     },
  failed:     { badge: 'badge badge-red',    dot: 'bg-red-400',    label: 'Failed'     },
  draft:      { badge: 'badge badge-cyan',   dot: 'bg-cyan-400',   label: 'Draft'      },
}

function StatusBadge({ status }: { status: string }) {
  const s = statusStyles[status] || statusStyles.draft
  return (
    <span className={s.badge}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

export default function DashboardPage() {
  const router                                            = useRouter()
  const { user }                                         = useAuth()
  const { data: projects, isLoading: projectsLoading }   = useProjects({ limit: 5 })
  const { data: stats,    isLoading: statsLoading }      = useUserStats()

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const statCards = [
    {
      label: 'Total Projects',
      value: stats?.total_projects ?? '—',
      icon:  FileText,
      iconColor: '#4DA3FF',
      iconBg:    'rgba(0,102,255,0.12)',
      change: '+2 this month',
    },
    {
      label: 'Completed',
      value: stats?.completed_projects ?? '—',
      icon:  CheckCircle,
      iconColor: '#34D399',
      iconBg:    'rgba(16,185,129,0.1)',
      change: `${stats?.total_projects ? Math.round((stats.completed_projects / stats.total_projects) * 100) : 0}% rate`,
    },
    {
      label: 'Avg. Score',
      value: stats?.average_marks ? `${Math.round(stats.average_marks)}` : '—',
      suffix: '/100',
      icon:  TrendingUp,
      iconColor: '#00D4FF',
      iconBg:    'rgba(0,212,255,0.1)',
      change: 'AI reviewer score',
    },
    {
      label: 'Time Saved',
      value: stats?.total_generation_time_hours ? `${stats.total_generation_time_hours}h` : '—',
      icon:  Clock,
      iconColor: '#A78BFA',
      iconBg:    'rgba(139,92,246,0.1)',
      change: 'vs. manual drafting',
    },
  ]

  return (
    <div className="max-w-7xl mx-auto page-enter">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-10 gap-4">
        <div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm mb-1.5"
            style={{ color: 'var(--text-muted)' }}
          >
            {greeting()},
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="display-serif text-4xl font-bold text-white"
          >
            {user?.full_name?.split(' ')[0] || 'Researcher'} 👋
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-sm mt-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            Here's an overview of your research work.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
        >
          <Link href="/dashboard/generate">
            <button className="btn-primary">
              <Plus className="w-4 h-4" />
              New Specification
            </button>
          </Link>
        </motion.div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="stat-card"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 rounded-xl" style={{ background: stat.iconBg }}>
                <stat.icon className="w-4 h-4" style={{ color: stat.iconColor }} />
              </div>
              <Activity className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
            </div>

            <div className="text-3xl font-bold text-white mb-1">
              {statsLoading ? (
                <div className="skeleton w-12 h-8" />
              ) : (
                <>
                  {stat.value}
                  {stat.suffix && <span className="text-lg" style={{ color: 'var(--text-muted)' }}>{stat.suffix}</span>}
                </>
              )}
            </div>

            <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              {stat.label}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{stat.change}</div>
          </motion.div>
        ))}
      </div>

      {/* Two-column layout: recent projects + quick generate */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Recent Projects — takes 2/3 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="lg:col-span-2"
        >
          <div className="rounded-2xl overflow-hidden"
               style={{ background: 'var(--navy)', border: '1px solid var(--border)' }}>

            {/* Card header */}
            <div className="flex items-center justify-between px-6 py-4"
                 style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="font-semibold text-white">Recent Projects</h2>
              <Link href="/dashboard/projects">
                <span className="text-xs flex items-center gap-1 transition-colors hover:text-white"
                      style={{ color: '#4DA3FF' }}>
                  View all <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </div>

            {/* Projects list */}
            {projectsLoading ? (
              <div className="p-6 space-y-4">
                {[1,2,3].map(i => (
                  <div key={i} className="skeleton h-14 w-full" />
                ))}
              </div>
            ) : projects && projects.length > 0 ? (
              <div className="divide-y" style={{ borderColor: 'rgba(0,102,255,0.08)' }}>
                {projects.map((project: any, i: number) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.06 }}
                  >
                    <Link href={`/dashboard/projects/${project.id}`}>
                      <div className="flex items-center gap-4 px-6 py-4 transition-colors group"
                           style={{ cursor: 'pointer' }}
                           onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(0,102,255,0.04)'}
                           onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                      >
                        {/* Icon */}
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                             style={{ background: 'rgba(0,102,255,0.1)', border: '1px solid rgba(0,102,255,0.15)' }}>
                          <FileText className="w-4 h-4" style={{ color: '#4DA3FF' }} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">{project.field_of_study}</div>
                          <div className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {project.academic_level} · {new Date(project.created_at).toLocaleDateString()}
                          </div>
                        </div>

                        {/* Right */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <StatusBadge status={project.status} />
                          {project.total_marks && (
                            <span className="text-xs font-bold" style={{ color: '#4DA3FF' }}>
                              {project.total_marks}/100
                            </span>
                          )}
                          {project.status !== 'complete' && (
                            <div className="w-16 progress-bar">
                              <div className="progress-fill" style={{ width: `${project.progress_percentage || 0}%` }} />
                            </div>
                          )}
                          <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity"
                                      style={{ color: 'var(--text-muted)' }} />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                     style={{ background: 'rgba(0,102,255,0.08)', border: '1px solid rgba(0,102,255,0.15)' }}>
                  <FileText className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
                </div>
                <p className="font-medium text-white mb-2">No projects yet</p>
                <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                  Generate your first research specification
                </p>
                <Link href="/dashboard/generate">
                  <button className="btn-primary text-sm">
                    <Plus className="w-4 h-4" /> Get Started
                  </button>
                </Link>
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick generate CTA — takes 1/3 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="space-y-4"
        >
          {/* Generate card */}
          <div className="rounded-2xl p-6 relative overflow-hidden"
               style={{
                 background: 'linear-gradient(135deg, rgba(0,102,255,0.15) 0%, rgba(0,30,80,0.8) 100%)',
                 border: '1px solid rgba(0,102,255,0.25)',
               }}>
            {/* Glow */}
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full blur-2xl"
                 style={{ background: 'rgba(0,102,255,0.15)' }} />

            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                   style={{ background: 'rgba(0,102,255,0.2)', border: '1px solid rgba(0,102,255,0.3)' }}>
                <Sparkles className="w-5 h-5" style={{ color: '#4DA3FF' }} />
              </div>

              <h3 className="font-bold text-white mb-2">Ready to generate?</h3>
              <p className="text-xs leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>
                Upload your guidelines and let 22 AI agents build your specification in minutes.
              </p>

              <Link href="/dashboard/generate" className="block">
                <button className="btn-primary w-full text-sm justify-center">
                  Start Generating <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>

          {/* Tips card */}
          <div className="rounded-2xl p-5"
               style={{ background: 'var(--navy)', border: '1px solid var(--border)' }}>
            <h3 className="text-sm font-semibold text-white mb-4">Quick Tips</h3>
            <div className="space-y-3">
              {[
                'Upload your institution\'s official brief for best results',
                'Past project examples improve specification quality',
                'PhD specs take ~15 min, BSc under 10',
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold"
                       style={{ background: 'rgba(0,102,255,0.12)', color: '#4DA3FF' }}>
                    {i + 1}
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}