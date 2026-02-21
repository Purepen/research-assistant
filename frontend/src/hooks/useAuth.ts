/**
 * useAuth — FIXED
 *
 * Bugs fixed:
 *   1. signInWithEmail called authApi.signInWithEmail which doesn't exist.
 *      Renamed to call authApi.login (the correct export name).
 *
 *   2. register() was setting isAuthenticated=true and storing the token,
 *      which let users into the dashboard before verifying their email.
 *      Now register() does NOT set isAuthenticated — it just throws on error
 *      so the register page can show the "check your email" screen.
 *
 *   3. signInWithEmail now surfaces the EMAIL_NOT_VERIFIED error code so
 *      the signin page can show a targeted message with a resend link.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '@/types'
import { authApi } from '@/lib/api'

interface AuthState {
  user:            User | null
  accessToken:     string | null
  isAuthenticated: boolean
  isLoading:       boolean
  error:           string | null

  // Actions
  signIn:           (idToken: string) => Promise<void>
  signInWithEmail:  (email: string, password: string) => Promise<void>
  register:         (email: string, password: string, fullName: string) => Promise<{ email: string }>
  signOut:          () => void
  refreshUser:      () => Promise<void>
  clearError:       () => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user:            null,
      accessToken:     null,
      isAuthenticated: false,
      isLoading:       false,
      error:           null,

      // ── Google sign-in ──────────────────────────────────────────────────
      signIn: async (idToken: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authApi.signInWithGoogle(idToken)
          set({
            user:            response.user,
            accessToken:     response.access_token,
            isAuthenticated: true,
            isLoading:       false,
          })
          localStorage.setItem('access_token', response.access_token)
          localStorage.setItem('user', JSON.stringify(response.user))
        } catch (error: any) {
          set({
            error:     error.response?.data?.detail || 'Google sign in failed',
            isLoading: false,
          })
          throw error
        }
      },

      // ── Email / password sign-in ────────────────────────────────────────
      // ✅ FIX: was calling authApi.signInWithEmail which doesn't exist.
      //         The correct export is authApi.login.
      signInWithEmail: async (email: string, password: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authApi.login(email, password)   // ← FIXED
          set({
            user:            response.user,
            accessToken:     response.access_token,
            isAuthenticated: true,
            isLoading:       false,
          })
          localStorage.setItem('access_token', response.access_token)
          localStorage.setItem('user', JSON.stringify(response.user))
        } catch (error: any) {
          set({ isLoading: false })
          throw error   // let the signin page inspect error.response.data.detail
        }
      },

      // ── Registration ────────────────────────────────────────────────────
      // ✅ FIX: backend no longer returns a token after registration.
      //         We do NOT set isAuthenticated here. The register page shows
      //         a "check your email" screen and the user must verify before
      //         they can log in.
      register: async (email: string, password: string, fullName: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authApi.register(email, password, fullName)
          // response = { message, email, requires_verification: true }
          set({ isLoading: false })
          return { email: response.email }
        } catch (error: any) {
          set({
            error:     error.response?.data?.detail || 'Registration failed',
            isLoading: false,
          })
          throw error
        }
      },

      // ── Sign out ────────────────────────────────────────────────────────
      signOut: () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
        set({
          user:            null,
          accessToken:     null,
          isAuthenticated: false,
          error:           null,
        })
      },

      // ── Refresh user profile ────────────────────────────────────────────
      refreshUser: async () => {
        try {
          const user = await authApi.getCurrentUser()
          set({ user })
          localStorage.setItem('user', JSON.stringify(user))
        } catch {
          // token expired — sign out
          localStorage.removeItem('access_token')
          localStorage.removeItem('user')
          set({ user: null, accessToken: null, isAuthenticated: false })
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user:            state.user,
        accessToken:     state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)