/**
 * Authentication Store using Zustand
 * Global state management for user authentication
 */

import { create } from 'zustand'
import { User, UserConnections } from '@case-study/shared'
import { AuthService } from '@/services/authService'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  
  // Connection management state
  connections: UserConnections | null
  connectionsLoading: boolean
  connectionsError: string | null
  
  // Actions
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  handleAuthCallback: () => boolean
  clearError: () => void
  
  // Connection management actions
  loadConnections: () => Promise<void>
  grantServicePermission: (service: 'gmail' | 'drive') => Promise<void>
  disconnectService: (service: 'gmail' | 'drive') => Promise<void>
  handleConnectionCallback: () => boolean
  clearConnectionError: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false, // Start as false, set to true only when actively checking
  error: null,
  
  // Connection management state
  connections: null,
  connectionsLoading: false,
  connectionsError: null,

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
      
      // First check if we have user data locally (faster)
      const localUser = authService.getUser()
      if (localUser) {
        // Set user immediately from local data
        set({ 
          user: localUser, 
          isAuthenticated: true, 
          isLoading: false,
          error: null
        })
        
        // Then validate with server in background (don't set loading state)
        try {
          const validatedUser = await authService.fetchCurrentUser()
          if (validatedUser) {
            set({ user: validatedUser, isAuthenticated: true, error: null })
          } else {
            // Server validation failed, clear auth
            set({ user: null, isAuthenticated: false, error: null })
          }
        } catch (e) {
          // Background validation failed, but keep local user for now
          console.warn('Background auth validation failed:', e)
        }
        return
      }
      
      // No local user, try server validation
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
      console.error('Auth check failed:', error)
      set({ 
        user: null,
        isAuthenticated: false,
        error: null, // Don't show error on initial load
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
  },

  // ==== CONNECTION MANAGEMENT ACTIONS ====

  loadConnections: async () => {
    try {
      set({ connectionsLoading: true, connectionsError: null })
      const authService = AuthService.getInstance()
      const connections = await authService.getConnectionStatus()
      set({ 
        connections, 
        connectionsLoading: false,
        connectionsError: null 
      })
    } catch (error) {
      set({ 
        connectionsError: error instanceof Error ? error.message : 'Failed to load connections',
        connectionsLoading: false 
      })
    }
  },

  grantServicePermission: async (service: 'gmail' | 'drive') => {
    try {
      set({ connectionsError: null })
      const authService = AuthService.getInstance()
      const response = await authService.grantServicePermission(service)
      
      // Check if authentication is required or if service is already connected
      if (response.error === 'authentication_required') {
        // User needs to re-authenticate to get permissions
        window.location.href = response.authUrl
      } else if (response.status === 'connected') {
        // Service was successfully activated, refresh connections
        await get().loadConnections()
      }
    } catch (error) {
      set({ 
        connectionsError: error instanceof Error ? error.message : `Failed to grant ${service} permission`
      })
    }
  },

  disconnectService: async (service: 'gmail' | 'drive') => {
    try {
      set({ connectionsError: null })
      const authService = AuthService.getInstance()
      await authService.disconnectService(service)
      
      // Refresh connections after disconnect
      await get().loadConnections()
    } catch (error) {
      set({ 
        connectionsError: error instanceof Error ? error.message : `Failed to disconnect ${service}`
      })
    }
  },

  handleConnectionCallback: () => {
    try {
      const authService = AuthService.getInstance()
      const result = authService.handleConnectionCallback()
      
      if (result.success) {
        // Connection successful, refresh connections
        get().loadConnections()
        return true
      } else {
        set({ 
          connectionsError: result.error || 'Connection failed'
        })
        return false
      }
    } catch (error) {
      set({ 
        connectionsError: error instanceof Error ? error.message : 'Connection callback failed'
      })
      return false
    }
  },

  clearConnectionError: () => {
    set({ connectionsError: null })
  }
}))

// Initialize auth check on store creation with timeout protection
if (typeof window !== 'undefined') {
  const initAuth = async () => {
    try {
      // Set a timeout for the initial auth check
      const authPromise = useAuthStore.getState().checkAuth()
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth check timeout')), 10000)
      )
      
      await Promise.race([authPromise, timeoutPromise])
    } catch (error) {
      console.warn('Initial auth check failed or timed out:', error)
      // Ensure loading state is cleared even on timeout/error
      useAuthStore.setState({ 
        isLoading: false, 
        user: null, 
        isAuthenticated: false, 
        error: null 
      })
    }
  }
  
  initAuth()
}