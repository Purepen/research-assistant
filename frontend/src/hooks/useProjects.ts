/**
 * useProjects Hook
 * 
 * Project data fetching with React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsApi, researchApi } from '@/lib/api'
import { Project, ProjectListItem } from '@/types'

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

export function useProject(projectId: number) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.getProject(projectId),
    enabled: !!projectId,
  })
}

export function useProjectStatus(projectId: number, enabled: boolean = true) {
  return useQuery({
    queryKey: ['project-status', projectId],
    queryFn: () => researchApi.getStatus(projectId),
    enabled: enabled && !!projectId,
    refetchInterval: (data) => {
      // Poll every 3 seconds if generating or reviewing
      const status = data?.status
      if (status === 'generating' || status === 'reviewing') {
        return 3000
      }
      return false
    },
  })
}

export function useProjectResult(projectId: number) {
  return useQuery({
    queryKey: ['project-result', projectId],
    queryFn: () => researchApi.getResult(projectId),
    enabled: !!projectId,
  })
}

export function useProjectAnalytics(projectId: number) {
  return useQuery({
    queryKey: ['project-analytics', projectId],
    queryFn: () => projectsApi.getAnalytics(projectId),
    enabled: !!projectId,
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (projectId: number) => projectsApi.deleteProject(projectId),
    onSuccess: () => {
      // Invalidate projects list
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useGenerateSpecification() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (formData: FormData) => researchApi.generateSpecification(formData),
    onSuccess: () => {
      // Invalidate projects list
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useCancelGeneration() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (projectId: number) => researchApi.cancelGeneration(projectId),
    onSuccess: (_, projectId) => {
      // Invalidate project status
      queryClient.invalidateQueries({ queryKey: ['project-status', projectId] })
    },
  })
}
