/**
 * useUser Hook
 *
 * User profile and stats data fetching.
 *
 * Changes (Apr 2026 — Model Tier + BYOK):
 *   - Added useModelSettings()
 *   - Added useUpdateModelSettings()
 *   - Added useApiKeyStatus()
 *   - Added useSaveApiKey()
 *
 * All existing hooks (useUserProfile, useUserStats, useUpdateProfile,
 * useDeleteAccount) are preserved verbatim.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userApi } from '@/lib/api'
import type { ModelSettingsResponse } from '@/lib/api'

// ── Existing hooks — UNCHANGED ────────────────────────────────────────────────

export function useUserProfile() {
  return useQuery({
    queryKey: ['user-profile'],
    queryFn: () => userApi.getProfile(),
  })
}

export function useUserStats() {
  return useQuery({
    queryKey: ['user-stats'],
    queryFn: () => userApi.getStats(),
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { full_name?: string }) => userApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] })
    },
  })
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: () => userApi.deleteAccount(),
  })
}

// ── Model tier settings hooks (Apr 2026) ──────────────────────────────────────

/**
 * Fetch the user's current model tier + per-agent model map.
 * Powers the Settings tab in the profile page.
 */
export function useModelSettings() {
  return useQuery<ModelSettingsResponse>({
    queryKey: ['model-settings'],
    queryFn:  () => userApi.getModelSettings(),
  })
}

/**
 * Save the user's tier (testing / production / custom) and optional
 * custom per-agent config. Invalidates model-settings on success so the
 * UI refreshes automatically.
 */
export function useUpdateModelSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      tier,
      customConfig,
    }: {
      tier: 'testing' | 'production' | 'custom'
      customConfig?: Record<string, string>
    }) => userApi.updateModelSettings(tier, customConfig),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['model-settings'] })
    },
  })
}

// ── BYOK API key hooks (Apr 2026) ─────────────────────────────────────────────

/**
 * Fetch whether the user has a personal OpenAI API key stored.
 * Returns { has_key, masked_key, key_source }.
 * Never returns the raw key.
 */
export function useApiKeyStatus() {
  return useQuery({
    queryKey: ['api-key-status'],
    queryFn:  () => userApi.getApiKeyStatus(),
  })
}

/**
 * Save or clear the user's personal OpenAI API key.
 * Invalidates api-key-status on success.
 */
export function useSaveApiKey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (apiKey: string | null) => userApi.saveApiKey(apiKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-key-status'] })
    },
  })
}