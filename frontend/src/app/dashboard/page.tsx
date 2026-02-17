'use client'

import { motion } from 'framer-motion'
import { FileText, Clock, CheckCircle, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'
import { useProjects } from '@/hooks/useProjects'
import { useUserStats } from '@/hooks/useUser'
import { getStatusColor, getMarksColor } from '@/lib/utils'
import Link from 'next/link'

export default function DashboardPage() {
  const router = useRouter()
  const { data: projects, isLoading: projectsLoading } = useProjects({ limit: 5 })
  const { data: stats, isLoading: statsLoading } = useUserStats()

  const statCards = [
    {
      title: 'Total Projects',
      value: stats?.total_projects || 0,
      icon: FileText,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
    },
    {
      title: 'Completed',
      value: stats?.completed_projects || 0,
      icon: CheckCircle,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
    },
    {
      title: 'Average Score',
      value: stats?.average_marks ? `${stats.average_marks}/100` : 'N/A',
      icon: TrendingUp,
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
    },
    {
      title: 'Total Time',
      value: stats?.total_generation_time_hours ? `${stats.total_generation_time_hours}h` : '0h',
      icon: Clock,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
    },
  ]

  return (
    <div className="max-w-7xl mx-auto">
      {/* Welcome section */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">
          Dashboard
        </h1>
        <p className="text-gray-400">
          Manage your research specifications
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card hover>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick actions */}
      <Card className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">
              Ready to create a new specification?
            </h2>
            <p className="text-gray-400">
              Upload your guidelines and let AI do the work
            </p>
          </div>
          <Link href="/dashboard/generate">
            <Button size="lg">
              New Specification
            </Button>
          </Link>
        </div>
      </Card>

      {/* Recent projects */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Recent Projects</h2>
          <Link href="/dashboard/projects">
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </Link>
        </div>

        {projectsLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="space-y-4">
            {projects.map((project: any, index: number) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card hover className="cursor-pointer" onClick={() => router.push(`/dashboard/projects/${project.id}`)}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {project.research_topic || project.field_of_study}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                          {project.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>{project.academic_level}</span>
                        <span>•</span>
                        <span>{project.field_of_study}</span>
                        {project.total_marks && (
                          <>
                            <span>•</span>
                            <span className={getMarksColor(project.total_marks)}>
                              {project.total_marks}/100
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {project.progress_percentage !== undefined && project.status !== 'complete' && (
                      <div className="ml-4">
                        <div className="text-sm text-gray-400 mb-1 text-right">
                          {project.progress_percentage}%
                        </div>
                        <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
                            style={{ width: `${project.progress_percentage}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card>
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">No projects yet</p>
              <Link href="/dashboard/generate">
                <Button>Create Your First Specification</Button>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
