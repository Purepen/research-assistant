'use client'

import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Download, Trash2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  useProject,
  useProjectStatus,
  useProjectResult,
  useDeleteProject,
} from '@/hooks/useProjects'
import { ProgressTracker } from '@/components/results/ProgressTracker'
import { SpecificationView } from '@/components/results/SpecificationView'
import { ReviewView } from '@/components/results/ReviewView'
import { SourcesView } from '@/components/results/SourcesView'
import { getStatusColor, getMarksColor } from '@/lib/utils'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const projectId = parseInt(params.id as string)

  const [activeTab, setActiveTab] = useState<'specification' | 'review' | 'sources'>(
    'specification'
  )

  const isActiveStatus = (s?: string) =>
    s === 'queued' || s === 'generating' || s === 'reviewing'

  // ── Project base data (also refetches while generating so status badge updates) ──
  const { data: project, isLoading: projectLoading } = useProject(projectId)

  // ── Live status: polls every 3 s while active ──────────────────────────────
  const { data: status } = useProjectStatus(projectId, isActiveStatus(project?.status))

  // Derive the best progress source: prefer live status poll, fall back to project
  const liveProgress = status?.progress_percentage ?? project?.progress_percentage ?? 0
  const livePhase =
    status?.current_phase ??
    (project?.status === 'complete'
      ? 'Specification complete'
      : project?.status ?? 'Unknown')

  // ── Result (only needed when complete) ────────────────────────────────────
  const { data: result } = useProjectResult(projectId)

  const { mutateAsync: deleteProject, isPending: isDeleting } = useDeleteProject()

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this project?')) {
      await deleteProject(projectId)
      router.push('/dashboard/projects')
    }
  }

  const handleDownload = () => {
    alert('Download functionality coming soon!')
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    queryClient.invalidateQueries({ queryKey: ['project-status', projectId] })
    queryClient.invalidateQueries({ queryKey: ['project-result', projectId] })
  }

  // ── Loading ───────────────────────────────────────────────────────────────
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

  const isGenerating = isActiveStatus(project.status)
  const isComplete = project.status === 'complete'
  const isFailed = project.status === 'failed'

  return (
    <div className="max-w-7xl mx-auto">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
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
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                  project.status
                )}`}
              >
                {project.status}
              </span>
            </div>
            <p className="text-gray-400">
              {project.academic_level} • {project.field_of_study}
              {project.total_marks && (
                <span
                  className={`ml-3 font-bold ${getMarksColor(project.total_marks)}`}
                >
                  {project.total_marks}/100
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Manual refresh button (useful if polling lags) */}
          {isGenerating && (
            <Button variant="ghost" size="sm" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}

          {isComplete && (
            <Button onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          )}

          <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ── Progress Tracker (while generating / reviewing / queued) ─────────── */}
      {isGenerating && (
        <ProgressTracker
          status={project.status}
          progress={liveProgress}
          currentPhase={livePhase}
        />
      )}

      {/* ── Result tabs (when complete) ───────────────────────────────────────── */}
      {isComplete && result && (
        <>
          <div className="flex gap-4 mb-6 border-b border-slate-800">
            {(
              [
                { id: 'specification', label: 'Specification' },
                { id: 'review', label: 'Review' },
                { id: 'sources', label: 'Sources' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'specification' && (
              <SpecificationView specification={result.specification} />
            )}
            {activeTab === 'review' && <ReviewView review={result.review} />}
            {activeTab === 'sources' && <SourcesView projectId={projectId} />}
          </motion.div>
        </>
      )}

      {/* ── Complete but no result yet ────────────────────────────────────────── */}
      {isComplete && !result && (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">Results are being saved…</p>
            <Button onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Check again
            </Button>
          </div>
        </Card>
      )}

      {/* ── Failed state ──────────────────────────────────────────────────────── */}
      {isFailed && (
        <Card>
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Generation Failed</h3>
            <p className="text-gray-400 mb-2">
              {livePhase.startsWith('Error:') ? livePhase : 'An error occurred during generation.'}
            </p>
            <p className="text-gray-500 text-sm mb-6">Please try again with a new project.</p>
            <Button onClick={() => router.push('/dashboard/generate')}>
              Create New Specification
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}