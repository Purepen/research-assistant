/**
 * useAuth Hook - UPDATED with Email/Password
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '@/types'
import { authApi } from '@/lib/api'

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  
  // Actions
  signIn: (idToken: string) => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName: string) => Promise<void>
  signOut: () => void
  refreshUser: () => Promise<void>
  clearError: () => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      signIn: async (idToken: string) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await authApi.signInWithGoogle(idToken)
          
          set({
            user: response.user,
            accessToken: response.access_token,
            isAuthenticated: true,
            isLoading: false,
          })
          
          localStorage.setItem('access_token', response.access_token)
          localStorage.setItem('user', JSON.stringify(response.user))
          
        } catch (error: any) {
          set({
            error: error.response?.data?.detail || 'Sign in failed',
            isLoading: false,
          })
          throw error
        }
      },

      signInWithEmail: async (email: string, password: string) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await authApi.signInWithEmail(email, password)
          
          set({
            user: response.user,
            accessToken: response.access_token,
            isAuthenticated: true,
            isLoading: false,
          })
          
          localStorage.setItem('access_token', response.access_token)
          localStorage.setItem('user', JSON.stringify(response.user))
          
        } catch (error: any) {
          set({
            error: error.response?.data?.detail || 'Sign in failed',
            isLoading: false,
          })
          throw error
        }
      },

      register: async (email: string, password: string, fullName: string) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await authApi.register(email, password, fullName)
          
          set({
            user: response.user,
            accessToken: response.access_token,
            isAuthenticated: true,
            isLoading: false,
          })
          
          localStorage.setItem('access_token', response.access_token)
          localStorage.setItem('user', JSON.stringify(response.user))
          
        } catch (error: any) {
          set({
            error: error.response?.data?.detail || 'Registration failed',
            isLoading: false,
          })
          throw error
        }
      },

      signOut: () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
        
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          error: null,
        })
      },

      refreshUser: async () => {
        try {
          const user = await authApi.getCurrentUser()
          set({ user })
          localStorage.setItem('user', JSON.stringify(user))
        } catch (error) {
          console.error('Failed to refresh user:', error)
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
