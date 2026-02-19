/**
 * useProjects hooks
 *
 * Key fixes:
 *   1. useProjectResult(id, status) — only enabled when status === 'complete'
 *      This stops 404-spam during generation from poisoning the React Query cache.
 *   2. useProject polls every 5s while status is active (queued/generating/reviewing)
 *   3. useProjectStatus polls every 3s while active
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsApi, researchApi } from '@/lib/api'

const ACTIVE = new Set(['queued', 'generating', 'reviewing'])
const isActive = (s?: string) => !!s && ACTIVE.has(s)

// ── Project list ──────────────────────────────────────────────────────────────
export function useProjects(params?: { skip?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: ['projects', params],
    queryFn:  () => projectsApi.listProjects(params),
  })
}

// ── Single project (polls while generating) ───────────────────────────────────
export function useProject(projectId: number) {
  return useQuery({
    queryKey:        ['project', projectId],
    queryFn:         () => projectsApi.getProject(projectId),
    enabled:         !!projectId,
    refetchInterval: (query) =>
      isActive((query.state.data as any)?.status) ? 5_000 : false,
  })
}

// ── Live status poll ──────────────────────────────────────────────────────────
export function useProjectStatus(projectId: number, enabled: boolean = true) {
  return useQuery({
    queryKey:        ['project-status', projectId],
    queryFn:         () => researchApi.getStatus(projectId),
    enabled:         enabled && !!projectId,
    refetchInterval: (query) =>
      isActive((query.state.data as any)?.status) ? 3_000 : false,
  })
}

// ── Result — ONLY enabled when project is complete ────────────────────────────
export function useProjectResult(projectId: number, projectStatus?: string) {
  return useQuery({
    queryKey:  ['project-result', projectId],
    queryFn:   () => researchApi.getResult(projectId),
    enabled:   !!projectId && projectStatus === 'complete',
    retry:     2,
    staleTime: 60_000,
  })
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export function useProjectAnalytics(projectId: number) {
  return useQuery({
    queryKey: ['project-analytics', projectId],
    queryFn:  () => projectsApi.getAnalytics(projectId),
    enabled:  !!projectId,
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────
export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (projectId: number) => projectsApi.deleteProject(projectId),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useGenerateSpecification() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (formData: FormData) => researchApi.generateSpecification(formData),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useCancelGeneration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (projectId: number) => researchApi.cancelGeneration(projectId),
    onSuccess:  (_, projectId) => {
      queryClient.invalidateQueries({ queryKey: ['project-status', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project',        projectId] })
    },
  })
}