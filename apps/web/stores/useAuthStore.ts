/**
 * Authentication Store using Zustand
 * Global state management for user authentication
 */

import { create } from 'zustand'
import { User } from '@case-study/shared'
import { AuthService } from '@/services/authService'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  
  // Actions
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  handleAuthCallback: () => boolean
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  loginWithGoogle: async () => {
    try {
      set({ isLoading: true, error: null })
      const authService = AuthService.getInstance()
      await authService.loginWithGoogle()
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Login failed',
        isLoading: false 
      })
    }
  },

  logout: async () => {
    try {
      set({ isLoading: true, error: null })
      const authService = AuthService.getInstance()
      await authService.logout()
      set({ 
        user: null, 
        isAuthenticated: false, 
        isLoading: false 
      })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Logout failed',
        isLoading: false 
      })
    }
  },

  checkAuth: async () => {
    try {
      set({ isLoading: true, error: null })
      const authService = AuthService.getInstance()
      
      // Always try to fetch current user from API to validate HTTP-only cookie
      const user = await authService.fetchCurrentUser()
      
      if (user) {
        set({ 
          user, 
          isAuthenticated: true, 
          isLoading: false,
          error: null
        })
      } else {
        // No valid authentication found
        set({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false,
          error: null
        })
      }
    } catch (error) {
      set({ 
        user: null,
        isAuthenticated: false,
        error: error instanceof Error ? error.message : 'Authentication check failed',
        isLoading: false 
      })
    }
  },

  handleAuthCallback: () => {
    try {
      const authService = AuthService.getInstance()
      const result = authService.handleAuthCallback()
      
      if (result.success) {
        const user = authService.getUser()
        set({ 
          user, 
          isAuthenticated: true, 
          isLoading: false,
          error: null 
        })
        return true
      } else {
        set({ 
          error: result.error || 'Authentication failed',
          isLoading: false 
        })
        return false
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Authentication callback failed',
        isLoading: false 
      })
      return false
    }
  },

  clearError: () => {
    set({ error: null })
  }
}))

// Initialize auth check on store creation
if (typeof window !== 'undefined') {
  useAuthStore.getState().checkAuth()
}