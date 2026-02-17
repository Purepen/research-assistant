'use client'

import { motion } from 'framer-motion'
import { FileText } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useProjects } from '@/hooks/useProjects'
import { getStatusColor, getMarksColor } from '@/lib/utils'

export default function ProjectsPage() {
  const router = useRouter()
  const { data: projects, isLoading } = useProjects({ limit: 100 })

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Projects</h1>
          <p className="text-gray-400">All your research specifications</p>
        </div>
        <Link href="/dashboard/generate">
          <Button>New Specification</Button>
        </Link>
      </div>

      {isLoading ? (
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
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          project.status
                        )}`}
                      >
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
  )
}
