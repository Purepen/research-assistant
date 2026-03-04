/**
 * API Client
 *
 * Changes (Phase 1 — Mar 2026):
 *   - Added topicsApi with history(), linkProject(), deleteSession()
 *   - downloadProject already present, kept intact
 */

import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach auth token to every request automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// Redirect to sign-in on 401
api.interceptors.response.use(
  (response) => response,
  (error: any) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      window.location.href = '/signin'
    }
    return Promise.reject(error)
  }
)

// ── Auth API ──────────────────────────────────────────────────────────────────
export const authApi = {
  register: async (email: string, password: string, fullName: string) => {
    const response = await api.post('/auth/register', { email, password, full_name: fullName })
    return response.data
  },

  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password })
    return response.data
  },

  signInWithGoogle: async (idToken: string) => {
    const response = await api.post('/auth/google', { id_token: idToken })
    return response.data
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me')
    return response.data
  },

  refreshToken: async () => {
    const response = await api.post('/auth/refresh')
    return response.data
  },

  verifyEmail: async (token: string) => {
    const response = await api.post('/auth/verify-email', { token })
    return response.data
  },

  resendVerification: async (email: string) => {
    const response = await api.post('/auth/resend-verification', { email })
    return response.data
  },

  requestPasswordReset: async (email: string) => {
    const response = await api.post('/auth/request-password-reset', { email })
    return response.data
  },

  resetPassword: async (token: string, newPassword: string) => {
    const response = await api.post('/auth/reset-password', { token, new_password: newPassword })
    return response.data
  },
}

// ── Research API ──────────────────────────────────────────────────────────────
export const researchApi = {
  generateSpecification: async (formData: FormData) => {
    const response = await api.post('/research/generate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  getStatus: async (projectId: number) => {
    const response = await api.get(`/research/status/${projectId}`)
    return response.data
  },

  getResult: async (projectId: number) => {
    const response = await api.get(`/research/result/${projectId}`)
    return response.data
  },

  cancelGeneration: async (projectId: number) => {
    const response = await api.post(`/research/cancel/${projectId}`)
    return response.data
  },
}

// ── Projects API ──────────────────────────────────────────────────────────────
export const projectsApi = {
  listProjects: async (params?: { skip?: number; limit?: number; status?: string }) => {
    const response = await api.get('/projects', { params })
    return response.data
  },

  getProject: async (projectId: number) => {
    const response = await api.get(`/projects/${projectId}`)
    return response.data
  },

  deleteProject: async (projectId: number) => {
    const response = await api.delete(`/projects/${projectId}`)
    return response.data
  },

  getAnalytics: async (projectId: number) => {
    const response = await api.get(`/projects/${projectId}/analytics`)
    return response.data
  },

  downloadProject: async (projectId: number): Promise<Blob> => {
    const response = await api.get(`/projects/${projectId}/download`, {
      responseType: 'blob',
    })
    return response.data
  },
}

// ── Topics API ────────────────────────────────────────────────────────────────
export const topicsApi = {
  /**
   * Fetch the current user's topic history (newest first).
   * Returns { total: number, topics: TopicHistoryItem[] }
   */
  getHistory: async (params?: { skip?: number; limit?: number }) => {
    const response = await api.get('/topics/history', { params })
    return response.data as {
      total: number
      topics: TopicHistoryItem[]
    }
  },

  /**
   * Link a completed TopicSession to a generated Project.
   * Called by the generate page after /research/generate succeeds,
   * when the user navigated from Topic Lab with a topic_session_id.
   */
  linkProject: async (topicSessionId: number, projectId: number) => {
    const response = await api.post('/topics/link-project', {
      topic_session_id: topicSessionId,
      project_id:       projectId,
    })
    return response.data
  },

  /**
   * Remove a single topic session from the user's history.
   */
  deleteSession: async (sessionId: number) => {
    const response = await api.delete(`/topics/history/${sessionId}`)
    return response.data
  },
}

// ── User API ──────────────────────────────────────────────────────────────────
export const userApi = {
  getProfile: async () => {
    const response = await api.get('/user/profile')
    return response.data
  },

  updateProfile: async (data: { full_name?: string }) => {
    const response = await api.patch('/user/profile', data)
    return response.data
  },

  getStats: async () => {
    const response = await api.get('/user/stats')
    return response.data
  },

  deleteAccount: async () => {
    const response = await api.delete('/user/account')
    return response.data
  },
}

// ── Shared Types ──────────────────────────────────────────────────────────────
export interface TopicHistoryItem {
  id:                number
  final_topic:       string
  description:       string | null
  field:             string
  degree_level:      string
  project_type:      string | null
  ambition_level:    string | null
  origin:            'discovered' | 'vetted' | 'provided'
  original_topic:    string | null
  linked_project_id: number | null
  created_at:        string  // ISO-8601
}

export default api
