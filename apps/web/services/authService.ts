/**
 * Authentication Service
 * Handles frontend authentication flow and API communication
 */

import { User, UserConnections, PermissionGrantResponse } from '@case-study/shared'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001'

export interface AuthTokens {
  accessToken: string
  user: User
}

export class AuthService {
  private static instance: AuthService
  private accessToken: string | null = null
  private user: User | null = null

  private constructor() {
    // Initialize from localStorage if available, but primarily rely on HTTP-only cookies
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user_data')
      if (userData) {
        try {
          this.user = JSON.parse(userData)
        } catch (e) {
          // Invalid JSON, clear storage
          this.clearAuth()
        }
      }
      
      // Also try to get user data from cookies if not in localStorage
      if (!this.user) {
        const userDataCookie = this.getCookie('user_data')
        if (userDataCookie) {
          try {
            this.user = JSON.parse(decodeURIComponent(userDataCookie))
            if (this.user) {
              localStorage.setItem('user_data', JSON.stringify(this.user))
            }
          } catch (e) {
            console.error('Error parsing user data from cookie:', e)
          }
        }
      }
    }
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  /**
   * Get cookie value by name
   */
  private getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null
    
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) {
      const cookieValue = parts.pop()?.split(';').shift()
      return cookieValue || null
    }
    return null
  }

  /**
   * Initiate Google OAuth login
   */
  async loginWithGoogle(): Promise<void> {
    // Redirect to backend OAuth endpoint
    window.location.href = `${API_BASE_URL}/auth/google`
  }

  /**
   * Handle OAuth callback (now uses cookies instead of URL parameters)
   */
  handleAuthCallback(): { success: boolean; error?: string } {
    if (typeof window === 'undefined') return { success: false }

    const urlParams = new URLSearchParams(window.location.search)
    const error = urlParams.get('error')

    if (error) {
      return { 
        success: false, 
        error: urlParams.get('message') || 'Authentication failed' 
      }
    }

    // Check for user data in cookies (set by backend)
    const userDataCookie = this.getCookie('user_data')
    if (userDataCookie) {
      try {
        const userData = JSON.parse(decodeURIComponent(userDataCookie))
        // Set user data
        this.user = userData
        
        if (typeof window !== 'undefined') {
          localStorage.setItem('user_data', JSON.stringify(userData))
        }
        
        // Clean up URL if there were any parameters
        const url = new URL(window.location.href)
        if (url.search) {
          window.history.replaceState({}, document.title, url.pathname)
        }
        
        return { success: true }
      } catch (e) {
        console.error('Error parsing user data cookie:', e)
        return { success: false, error: 'Invalid authentication data' }
      }
    }

    // If no error and we just got redirected back, try to fetch current user
    // This handles the case where cookies are set but we need to validate them
    const currentPath = window.location.pathname
    if (currentPath === '/' && !this.user) {
      // Attempt to fetch current user to validate authentication
      this.fetchCurrentUser().then(user => {
        if (user) {
          this.user = user
          if (typeof window !== 'undefined') {
            localStorage.setItem('user_data', JSON.stringify(user))
            // Trigger a page refresh to update the auth state
            window.location.reload()
          }
        }
      }).catch(err => {
        console.error('Failed to fetch user after OAuth:', err)
      })
    }

    return { success: false }
  }

  /**
   * Set authentication data
   */
  private setAuthData(token: string, user: User): void {
    this.accessToken = token
    this.user = user

    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token)
      localStorage.setItem('user_data', JSON.stringify(user))
    }
  }

  /**
   * Get current user
   */
  getUser(): User | null {
    return this.user
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    return this.accessToken
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    // Check for HTTP-only cookie (via API call) or user data
    const hasUserData = !!(this.user || localStorage.getItem('user_data'))
    return hasUserData
  }

  /**
   * Fetch current user from API
   */
  async fetchCurrentUser(): Promise<User | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include HTTP-only cookies
      })

      if (!response.ok) {
        if (response.status === 401) {
          // Token is invalid, clear auth
          this.clearAuth()
        }
        throw new Error(`HTTP ${response.status}`)
      }

      const userData = await response.json()
      this.user = userData

      if (typeof window !== 'undefined') {
        localStorage.setItem('user_data', JSON.stringify(userData))
      }

      return userData
    } catch (error) {
      console.error('Failed to fetch current user:', error)
      return null
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      // Call backend logout endpoint to clear cookies
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include', // Include HTTP-only cookies
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      this.clearAuth()
    }
  }

  /**
   * Clear authentication data
   */
  private clearAuth(): void {
    this.accessToken = null
    this.user = null

    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user_data')
    }
  }

  // ==== CONNECTION MANAGEMENT METHODS ====

  /**
   * Get connection status for all services
   */
  async getConnectionStatus(): Promise<UserConnections> {
    const response = await fetch(`${API_BASE_URL}/auth/connections/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include HTTP-only cookies
    })

    if (!response.ok) {
      if (response.status === 401) {
        this.clearAuth()
        throw new Error('Authentication required')
      }
      throw new Error(`Failed to get connection status: ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Grant permission for a specific service (Gmail or Drive)
   */
  async grantServicePermission(service: 'gmail' | 'drive'): Promise<PermissionGrantResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/connections/${service}/grant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include HTTP-only cookies
    })

    if (!response.ok) {
      if (response.status === 401) {
        this.clearAuth()
        throw new Error('Authentication required')
      }
      throw new Error(`Failed to grant ${service} permission: ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Disconnect a service by clearing stored tokens
   */
  async disconnectService(service: 'gmail' | 'drive'): Promise<{ message: string; service: string; status: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/connections/${service}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include HTTP-only cookies
    })

    if (!response.ok) {
      if (response.status === 401) {
        this.clearAuth()
        throw new Error('Authentication required')
      }
      throw new Error(`Failed to disconnect ${service}: ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Handle connection callback from OAuth flow
   */
  handleConnectionCallback(): { success: boolean; service?: string; status?: string; error?: string } {
    if (typeof window === 'undefined') return { success: false }

    const urlParams = new URLSearchParams(window.location.search)
    const service = urlParams.get('connection')
    const status = urlParams.get('status')
    const error = urlParams.get('error')

    if (error) {
      return { 
        success: false, 
        error: `Connection failed: ${error}` 
      }
    }

    if (service && status) {
      // Clean up URL parameters
      const url = new URL(window.location.href)
      url.searchParams.delete('connection')
      url.searchParams.delete('status')
      window.history.replaceState({}, document.title, url.toString())

      return { 
        success: true, 
        service, 
        status 
      }
    }

    return { success: false }
  }
}

// Create and export singleton instance
export const authService = AuthService.getInstance()