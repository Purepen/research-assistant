'use client'

import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Download, Trash2, RefreshCw, Loader2 } from 'lucide-react'
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

const ACTIVE_STATUSES = new Set(['queued', 'generating', 'reviewing'])

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const projectId = parseInt(params.id as string)

  const [activeTab, setActiveTab] = useState<'specification' | 'review' | 'sources'>('specification')
  const [downloading, setDownloading] = useState(false)

  const isActive = (s?: string) => !!s && ACTIVE_STATUSES.has(s)

  const { data: project, isLoading: projectLoading } = useProject(projectId)
  const { data: statusData } = useProjectStatus(projectId, isActive(project?.status))

  // ✅ Pass project.status so the hook only enables when complete (stops 404 spam)
  const { data: result, isLoading: resultLoading } = useProjectResult(projectId, project?.status)

  const { mutateAsync: deleteProject, isPending: isDeleting } = useDeleteProject()

  const liveProgress = statusData?.progress_percentage ?? project?.progress_percentage ?? 0
  const livePhase    = statusData?.current_phase       ?? project?.current_phase       ?? project?.status ?? 'Unknown'

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    queryClient.invalidateQueries({ queryKey: ['project-status', projectId] })
    queryClient.invalidateQueries({ queryKey: ['project-result', projectId] })
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this project?')) {
      await deleteProject(projectId)
      router.push('/dashboard/projects')
    }
  }

  // ✅ Real download — fetch with auth header, trigger browser save dialog
  const handleDownload = async () => {
    setDownloading(true)
    try {
      const token = localStorage.getItem('access_token')
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const res = await fetch(`${apiBase}/projects/${projectId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Download failed' }))
        alert(err.detail || 'Download failed')
        return
      }

      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `${(project?.research_topic || 'specification').slice(0, 60)}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      alert('Download failed. Check your connection and try again.')
    } finally {
      setDownloading(false)
    }
  }

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
      </div>
    )
  }

  if (!project) {
    return <div className="text-center py-12"><p className="text-gray-400">Project not found</p></div>
  }

  const isGenerating = isActive(project.status)
  const isComplete   = project.status === 'complete'
  const isFailed     = project.status === 'failed'

  return (
    <div className="max-w-7xl mx-auto">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/projects')}>
            <ArrowLeft className="w-4 h-4 mr-2" />Back
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-white">
                {project.research_topic || project.field_of_study}
              </h1>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                {project.status}
              </span>
            </div>
            {/* ✅ Fixed separator — was "computer science54/100", now "computer science • 54/100" */}
            <p className="text-gray-400">
              {project.academic_level} • {project.field_of_study}
              {project.total_marks != null && (
                <span className={`ml-2 font-bold ${getMarksColor(project.total_marks)}`}>
                  {' '}• {project.total_marks}/100
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isGenerating && (
            <Button variant="ghost" size="sm" onClick={handleRefresh} title="Refresh status">
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
          {isComplete && (
            <Button onClick={handleDownload} disabled={downloading}>
              {downloading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</>
                : <><Download className="w-4 h-4 mr-2" />Download DOCX</>}
            </Button>
          )}
          <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ── Progress tracker ─────────────────────────────────────────────────── */}
      {isGenerating && (
        <ProgressTracker
          status={project.status}
          progress={liveProgress}
          currentPhase={livePhase}
        />
      )}

      {/* ── Complete → tabs ───────────────────────────────────────────────────── */}
      {isComplete && (
        <>
          <div className="flex gap-4 mb-6 border-b border-slate-800">
            {(['specification', 'review', 'sources'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 font-medium transition-colors relative capitalize ${
                  activeTab === tab ? 'text-purple-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab === 'specification' ? 'Specification'
                 : tab === 'review'     ? 'Review'
                 :                        'Sources'}
                {activeTab === tab && (
                  <motion.div
                    layoutId="active-tab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500"
                  />
                )}
              </button>
            ))}
          </div>

          {resultLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
            </div>
          ) : result ? (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'specification' && (
                result.specification
                  ? <SpecificationView specification={result.specification} />
                  : <Card><p className="text-gray-400 text-center py-8">Specification data unavailable.</p></Card>
              )}
              {activeTab === 'review' && (
                result.review
                  ? <ReviewView review={result.review} />
                  : <Card><p className="text-gray-400 text-center py-8">Review data unavailable.</p></Card>
              )}
              {activeTab === 'sources' && <SourcesView projectId={projectId} />}
            </motion.div>
          ) : (
            <Card>
              <div className="text-center py-12">
                <p className="text-gray-400 mb-4">Results are still being saved…</p>
                <Button onClick={handleRefresh}>
                  <RefreshCw className="w-4 h-4 mr-2" />Check again
                </Button>
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── Failed ────────────────────────────────────────────────────────────── */}
      {isFailed && (
        <Card>
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Generation Failed</h3>
            <p className="text-gray-400 mb-2 max-w-md mx-auto text-sm">
              {livePhase?.startsWith('Error:') ? livePhase.slice(6).trim() : 'An error occurred during generation.'}
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