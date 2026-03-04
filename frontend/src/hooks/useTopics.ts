/**
 * useTopics Hook
 * ==============
 * TanStack Query hook for fetching and managing topic history.
 * Follows the exact same pattern as useProjects.ts in this codebase.
 *
 * Usage:
 *   const { data, isLoading } = useTopicHistory()
 *   const { mutateAsync: deleteSession } = useDeleteTopicSession()
 *   const { mutateAsync: linkProject }   = useLinkTopicToProject()
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { topicsApi, TopicHistoryItem } from '@/lib/api'

// ── Query Keys ────────────────────────────────────────────────────────────────
export const TOPIC_KEYS = {
  all:     ['topics'] as const,
  history: (params?: { skip?: number; limit?: number }) =>
    [...TOPIC_KEYS.all, 'history', params] as const,
}

// ══════════════════════════════════════════════════════════════════════════════
// useTopicHistory
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetches the current user's topic history (newest first).
 *
 * @param params  - Optional pagination { skip, limit }
 * @param enabled - Set false to defer fetching (e.g. until auth is confirmed)
 */
export function useTopicHistory(
  params?: { skip?: number; limit?: number },
  enabled = true
) {
  return useQuery({
    queryKey: TOPIC_KEYS.history(params),
    queryFn:  () => topicsApi.getHistory(params),
    enabled,
    staleTime: 30_000,   // 30 s — matches the rest of the app
    retry: 1,
  })
}

// ══════════════════════════════════════════════════════════════════════════════
// useTopicStats  (derived — no extra network call)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Returns quick stats derived from the user's topic history.
 * Useful for the dashboard stats row.
 */
export function useTopicStats() {
  const { data, isLoading, isError } = useTopicHistory()

  if (isLoading || isError || !data) {
    return { isLoading, total: 0, withSpec: 0, withoutSpec: 0, latest: null }
  }

  const total      = data.total
  const withSpec   = data.topics.filter(t => t.linked_project_id !== null).length
  const withoutSpec= total - withSpec
  const latest: TopicHistoryItem | null = data.topics[0] ?? null

  return { isLoading: false, total, withSpec, withoutSpec, latest }
}

// ══════════════════════════════════════════════════════════════════════════════
// useDeleteTopicSession
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Deletes a single topic session and immediately invalidates the history cache
 * so the UI refreshes without a page reload.
 */
export function useDeleteTopicSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sessionId: number) => topicsApi.deleteSession(sessionId),
    onSuccess: () => {
      // Invalidate ALL topic history queries regardless of pagination params
      queryClient.invalidateQueries({ queryKey: TOPIC_KEYS.all })
    },
  })
}

// ══════════════════════════════════════════════════════════════════════════════
// useLinkTopicToProject
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Links a TopicSession to a Project.
 * Called by the generate page after spec generation begins, when the user
 * arrived from Topic Lab carrying a topic_session_id in the URL.
 *
 * On success, the history cache is refreshed so the linked_project_id
 * shows up immediately in the topic history UI.
 */
export function useLinkTopicToProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      topicSessionId,
      projectId,
    }: {
      topicSessionId: number
      projectId:      number
    }) => topicsApi.linkProject(topicSessionId, projectId),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TOPIC_KEYS.all })
    },
  })
}

// ══════════════════════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════════════════════

/** Human-readable relative time label (e.g. "2 days ago") */
export function topicRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)

  if (mins  < 1)  return 'just now'
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days  < 30) return `${days}d ago`
  return new Date(isoDate).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
}

/** Badge label for origin type */
export function topicOriginLabel(origin: TopicHistoryItem['origin']): string {
  const map = {
    discovered: 'AI Generated',
    vetted:     'AI Refined',
    provided:   'Self-Chosen',
  }
  return map[origin] ?? origin
}

/** Badge colour for origin type — matches the green/purple theme */
export function topicOriginColor(origin: TopicHistoryItem['origin']): string {
  const map = {
    discovered: '#7c3aed',
    vetted:     '#0891b2',
    provided:   '#16a34a',
  }
  return map[origin] ?? '#9ca3af'
}
