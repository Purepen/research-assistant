'use client'

import { motion } from 'framer-motion'
import { Plus, FileText, Clock, CheckCircle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'
import { useProjects } from '@/hooks/useProjects'
import { getStatusColor, getMarksColor } from '@/lib/utils'
import Link from 'next/link'

export default function ProjectsPage() {
  const router = useRouter()
  const { data: projects, isLoading } = useProjects({ limit: 50 })

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">My Projects</h1>
          <p className="text-gray-400">All your research specifications</p>
        </div>
        <Link href="/dashboard/generate">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Specification
          </Button>
        </Link>
      </div>

      {/* Projects list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="space-y-4">
          {projects.map((project: any, index: number) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                hover
                className="cursor-pointer"
                onClick={() => router.push(`/dashboard/projects/${project.id}`)}
              >
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
                      {project.total_marks != null && (
                        <>
                          <span>•</span>
                          <span className={`font-bold ${getMarksColor(project.total_marks)}`}>
                            {project.total_marks}/100
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span>{new Date(project.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Progress bar for in-progress projects */}
                  {project.status !== 'complete' && project.status !== 'failed' && (
                    <div className="ml-6 text-right">
                      <p className="text-xs text-gray-400 mb-1">{project.progress_percentage ?? 0}%</p>
                      <div className="w-28 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all"
                          style={{ width: `${project.progress_percentage ?? 0}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Marks badge for completed */}
                  {project.status === 'complete' && project.total_marks != null && (
                    <div className="ml-6 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className={`text-lg font-bold ${getMarksColor(project.total_marks)}`}>
                        {project.total_marks}/100
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card>
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No projects yet</h3>
            <p className="text-gray-400 mb-6">Create your first research specification to get started</p>
            <Link href="/dashboard/generate">
              <Button>Create Your First Specification</Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  )
}