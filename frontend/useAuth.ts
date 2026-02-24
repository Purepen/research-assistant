/**
 * useAuth — FIXED v2
 *
 * Bugs fixed in this version:
 *
 *   1. signOut() now clears 'auth-storage' — the Zustand persist key.
 *      The old version only removed 'access_token' and 'user' from localStorage
 *      but left 'auth-storage' intact. When the user signed out and navigated
 *      to /signin, Zustand rehydrated isAuthenticated=true from 'auth-storage'
 *      and immediately redirected to /dashboard, making sign-out appear broken.
 *
 *   2. refreshUser() now re-throws errors after clearing state.
 *      The old version swallowed all errors silently, so any try/catch around
 *      refreshUser() could never detect a failed token verification.
 *      The signin page relies on refreshUser() throwing to decide whether
 *      to show the form or redirect.
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

  signIn:           (idToken: string) => Promise<void>
  signInWithEmail:  (email: string, password: string) => Promise<void>
  register:         (email: string, password: string, fullName: string) => Promise<{ email: string }>
  signOut:          () => void
  refreshUser:      () => Promise<void>
  clearError:       () => void
}

// The key Zustand persist uses to store auth state in localStorage.
// Must match the `name` option in the persist config below.
const PERSIST_KEY = 'auth-storage'

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user:            null,
      accessToken:     null,
      isAuthenticated: false,
      isLoading:       false,
      error:           null,

      // ── Google OAuth sign-in ────────────────────────────────────────────
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
          set({ error: error.response?.data?.detail || 'Google sign in failed', isLoading: false })
          throw error
        }
      },

      // ── Email / password sign-in ────────────────────────────────────────
      signInWithEmail: async (email: string, password: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authApi.login(email, password)
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
          throw error
        }
      },

      // ── Registration ────────────────────────────────────────────────────
      register: async (email: string, password: string, fullName: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authApi.register(email, password, fullName)
          set({ isLoading: false })
          return { email: response.email }
        } catch (error: any) {
          set({ error: error.response?.data?.detail || 'Registration failed', isLoading: false })
          throw error
        }
      },

      // ── Sign out ────────────────────────────────────────────────────────
      // ✅ FIX: also remove the Zustand persist key so that on the next page
      // load the store rehydrates as unauthenticated instead of restoring the
      // old isAuthenticated=true state.
      signOut: () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
        localStorage.removeItem(PERSIST_KEY)   // ← KEY FIX: clear persist store
        set({
          user:            null,
          accessToken:     null,
          isAuthenticated: false,
          error:           null,
        })
      },

      // ── Verify / refresh session ────────────────────────────────────────
      // ✅ FIX: now re-throws errors so callers can detect an invalid token.
      // Previously this swallowed all errors silently, making it impossible
      // for the signin page to know whether to show the form or redirect.
      refreshUser: async () => {
        try {
          const user = await authApi.getCurrentUser()
          set({ user })
          localStorage.setItem('user', JSON.stringify(user))
        } catch (error) {
          // Token expired or invalid — clear everything
          localStorage.removeItem('access_token')
          localStorage.removeItem('user')
          localStorage.removeItem(PERSIST_KEY)
          set({ user: null, accessToken: null, isAuthenticated: false })
          throw error   // ← KEY FIX: re-throw so the caller knows auth failed
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: PERSIST_KEY,
      partialize: (state) => ({
        user:            state.user,
        accessToken:     state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
