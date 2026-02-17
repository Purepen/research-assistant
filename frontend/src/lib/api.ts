/**
 * API Client - UPDATED with Email/Password endpoints
 */

import axios, { AxiosError, AxiosInstance } from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 120000,

})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      window.location.href = '/signin'
    }
    return Promise.reject(error)
  }
)

// Auth API - UPDATED
export const authApi = {
  // Email/Password
  register: async (email: string, password: string, fullName: string) => {
    const response = await api.post('/auth/register', {
      email,
      password,
      full_name: fullName
    })
    return response.data
  },

  signInWithEmail: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password })
    return response.data
  },

  // Google OAuth
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

  // Email Verification
  verifyEmail: async (token: string) => {
    const response = await api.post('/auth/verify-email', { token })
    return response.data
  },

  resendVerification: async (email: string) => {
    const response = await api.post('/auth/resend-verification', { email })
    return response.data
  },

  // Password Reset
  requestPasswordReset: async (email: string) => {
    const response = await api.post('/auth/request-password-reset', { email })
    return response.data
  },

  resetPassword: async (token: string, newPassword: string) => {
    const response = await api.post('/auth/reset-password', {
      token,
      new_password: newPassword
    })
    return response.data
  },
}

// Research API (unchanged)
export const researchApi = {
  generateSpecification: async (formData: FormData) => {
    // const response = await api.post('/research/generate', formData)
    const response = await api.post('/research/generate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
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

// Projects API (unchanged)
export const projectsApi = {
  listProjects: async (params?: {
    skip?: number
    limit?: number
    status?: string
  }) => {
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
}

// User API (unchanged)
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

export default api
