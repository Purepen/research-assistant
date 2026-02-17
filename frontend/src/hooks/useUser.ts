/**
 * useUser Hook
 * 
 * User profile and stats data fetching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userApi } from '@/lib/api'

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
      // Invalidate user profile
      queryClient.invalidateQueries({ queryKey: ['user-profile'] })
    },
  })
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: () => userApi.deleteAccount(),
  })
}
