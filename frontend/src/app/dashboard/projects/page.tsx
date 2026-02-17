'use client'

import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Download, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useProject, useProjectStatus, useProjectResult, useDeleteProject } from '@/hooks/useProjects'
import { ProgressTracker } from '@/components/results/ProgressTracker'
import { SpecificationView } from '@/components/results/SpecificationView'
import { ReviewView } from '@/components/results/ReviewView'
import { SourcesView } from '@/components/results/SourcesView'
import { getStatusColor, getMarksColor } from '@/lib/utils'
import { useState } from 'react'

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = parseInt(params.id as string)
  
  const [activeTab, setActiveTab] = useState<'specification' | 'review' | 'sources'>('specification')
  
  const { data: project, isLoading: projectLoading } = useProject(projectId)
  const { data: status } = useProjectStatus(projectId, project?.status !== 'complete')
  const { data: result } = useProjectResult(projectId)
  const { mutateAsync: deleteProject, isPending: isDeleting } = useDeleteProject()

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this project?')) {
      await deleteProject(projectId)
      router.push('/dashboard/projects')
    }
  }

  const handleDownload = () => {
    // TODO: Implement download functionality
    alert('Download functionality coming soon!')
  }

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Project not found</p>
      </div>
    )
  }

  const isGenerating = project.status === 'generating' || project.status === 'reviewing'
  const isComplete = project.status === 'complete'

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/projects')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white">
                {project.research_topic || project.field_of_study}
              </h1>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                {project.status}
              </span>
            </div>
            <p className="text-gray-400">
              {project.academic_level} • {project.field_of_study}
              {project.total_marks && (
                <span className={`ml-3 font-bold ${getMarksColor(project.total_marks)}`}>
                  {project.total_marks}/100
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isComplete && (
            <Button onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          )}
          
          <Button
            variant="danger"
            onClick={handleDelete}
            isLoading={isDeleting}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Progress Tracker (if generating) */}
      {isGenerating && status && (
        <ProgressTracker 
          status={status.status}
          progress={status.progress_percentage}
          currentPhase={status.current_phase}
        />
      )}

      {/* Content Tabs (if complete) */}
      {isComplete && result && (
        <>
          {/* Tabs */}
          <div className="flex gap-4 mb-6 border-b border-slate-800">
            {[
              { id: 'specification', label: 'Specification' },
              { id: 'review', label: 'Review' },
              { id: 'sources', label: 'Sources' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 font-medium transition-colors relative ${
                  activeTab === tab.id
                    ? 'text-purple-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="active-tab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500"
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'specification' && (
              <SpecificationView specification={result.specification} />
            )}
            
            {activeTab === 'review' && (
              <ReviewView review={result.review} />
            )}
            
            {activeTab === 'sources' && (
              <SourcesView projectId={projectId} />
            )}
          </motion.div>
        </>
      )}

      {/* Failed State */}
      {project.status === 'failed' && (
        <Card>
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Generation Failed</h3>
            <p className="text-gray-400 mb-6">
              An error occurred during generation. Please try again.
            </p>
            <Button onClick={() => router.push('/dashboard/generate')}>
              Create New Specification
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
