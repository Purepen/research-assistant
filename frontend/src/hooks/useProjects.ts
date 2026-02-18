/**
 * useProjects Hook — FIXED
 *
 * Changes:
 *  1. useProject() now polls every 5 s while the project is actively generating,
 *     so the status badge on the detail page updates automatically without a
 *     manual refresh.
 *  2. useProjectStatus() refetchInterval must return a number (ms) or false —
 *     the previous version returned `false` for the "done" case which is
 *     correct, but the active case now also waits for the status query to be
 *     enabled before starting (avoids 401 on mount).
 *  3. useProjectResult() only fires when the project is complete so we don't
 *     spam 404s during generation.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsApi, researchApi } from '@/lib/api'
import { Project, ProjectListItem } from '@/types'

const ACTIVE_STATUSES = new Set(['queued', 'generating', 'reviewing'])

const isActive = (status?: string) => !!status && ACTIVE_STATUSES.has(status)

// ── Project list ────────────────────────────────────────────────────────────

export function useProjects(params?: {
  skip?: number
  limit?: number
  status?: string
}) {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: () => projectsApi.listProjects(params),
  })
}

// ── Single project (polls while active) ─────────────────────────────────────

export function useProject(projectId: number) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.getProject(projectId),
    enabled: !!projectId,
    // Re-fetch every 5 s while generating so header status badge stays current
    refetchInterval: (query) => {
      const status = (query.state.data as any)?.status
      return isActive(status) ? 5_000 : false
    },
  })
}

// ── Live status (polls every 3 s while active) ──────────────────────────────

export function useProjectStatus(projectId: number, enabled: boolean = true) {
  return useQuery({
    queryKey: ['project-status', projectId],
    queryFn: () => researchApi.getStatus(projectId),
    enabled: enabled && !!projectId,
    refetchInterval: (query) => {
      const status = (query.state.data as any)?.status
      if (isActive(status)) return 3_000   // poll every 3 s
      return false                         // stop once done / failed
    },
  })
}

// ── Result (only when complete) ─────────────────────────────────────────────

export function useProjectResult(projectId: number, projectStatus?: string) {
  return useQuery({
    queryKey: ['project-result', projectId],
    queryFn: () => researchApi.getResult(projectId),
    // Don't even try until the project is complete — stops 404 spam in logs
    enabled: !!projectId && projectStatus === 'complete',
    retry: 1,
  })
}

// ── Analytics ───────────────────────────────────────────────────────────────

export function useProjectAnalytics(projectId: number) {
  return useQuery({
    queryKey: ['project-analytics', projectId],
    queryFn: () => projectsApi.getAnalytics(projectId),
    enabled: !!projectId,
  })
}

// ── Mutations ───────────────────────────────────────────────────────────────

export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (projectId: number) => projectsApi.deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useGenerateSpecification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (formData: FormData) => researchApi.generateSpecification(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useCancelGeneration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (projectId: number) => researchApi.cancelGeneration(projectId),
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({ queryKey: ['project-status', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    },
  })
}