/**
 * useProjects — FIXED
 *
 * Changes:
 *   1. useProjectResult(id, status) — only enabled when status === 'complete'
 *      so it doesn't spam 404s during generation.
 *   2. useProject() polls every 5s during active generation so the header
 *      status badge updates without manual refresh.
 *   3. useProjectStatus() refetchInterval returns number|false correctly.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsApi, researchApi } from '@/lib/api'
import { Project, ProjectListItem } from '@/types'

const ACTIVE_STATUSES = new Set(['queued', 'generating', 'reviewing'])
const isActive = (s?: string) => !!s && ACTIVE_STATUSES.has(s)

// ── Project list ──────────────────────────────────────────────────────────────
export function useProjects(params?: { skip?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: () => projectsApi.listProjects(params),
  })
}

// ── Single project (polls every 5s while generating) ──────────────────────────
export function useProject(projectId: number) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.getProject(projectId),
    enabled: !!projectId,
    refetchInterval: (query) => {
      const status = (query.state.data as any)?.status
      return isActive(status) ? 5_000 : false
    },
  })
}

// ── Live status poll (every 3s while active) ──────────────────────────────────
export function useProjectStatus(projectId: number, enabled: boolean = true) {
  return useQuery({
    queryKey: ['project-status', projectId],
    queryFn: () => researchApi.getStatus(projectId),
    enabled: enabled && !!projectId,
    refetchInterval: (query) => {
      const status = (query.state.data as any)?.status
      return isActive(status) ? 3_000 : false
    },
  })
}

// ── Result — only fetches once project is complete ────────────────────────────
export function useProjectResult(projectId: number, projectStatus?: string) {
  return useQuery({
    queryKey: ['project-result', projectId],
    queryFn: () => researchApi.getResult(projectId),
    // ✅ Only enabled when the project is actually complete
    enabled: !!projectId && projectStatus === 'complete',
    retry: 2,
    staleTime: 60_000,   // 1 min — result doesn't change once saved
  })
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export function useProjectAnalytics(projectId: number) {
  return useQuery({
    queryKey: ['project-analytics', projectId],
    queryFn: () => projectsApi.getAnalytics(projectId),
    enabled: !!projectId,
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────
export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (projectId: number) => projectsApi.deleteProject(projectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useGenerateSpecification() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (formData: FormData) => researchApi.generateSpecification(formData),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
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