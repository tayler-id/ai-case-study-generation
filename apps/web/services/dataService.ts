/**
 * Data Service
 * Handles fetching project data from Gmail and Google Drive APIs
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001'

export interface ProjectScopeRequest {
  project_name: string
  keywords: string[]
  participant_emails: string[]
  start_date: string // ISO datetime string
  end_date: string   // ISO datetime string  
  max_results?: number
}

export interface DataFetchResponse {
  success: boolean
  data: {
    gmail?: {
      emails: any[]
      threads: any[]
      metadata: any
    }
    drive?: {
      documents: any[]
      metadata: any
    }
  }
  metadata: any
  errors?: string[]
}

export interface ConnectionHealth {
  user_id: string
  overall_health: 'healthy' | 'degraded' | 'no_connections' | 'error'
  services: {
    gmail: {
      connected: boolean
      healthy: boolean
      token_status?: any
    }
    drive: {
      connected: boolean
      healthy: boolean
      token_status?: any
    }
  }
  issues?: string[]
  last_checked: string
}

export interface DataPreview {
  project_name: string
  date_range: {
    start: string
    end: string
  }
  keywords: string[]
  participants: string[]
  available_sources: string[]
  estimated_results: {
    gmail?: {
      sample_count: number
      sample_subjects: string[]
      estimated_total: string
    }
    drive?: {
      sample_count: number
      sample_files: string[]
      file_types: string[]
      estimated_total: string
    }
  }
  preview_timestamp: string
}

export class DataService {
  private static instance: DataService
  
  private constructor() {}
  
  static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService()
    }
    return DataService.instance
  }
  
  /**
   * Fetch Gmail data for a project scope
   */
  async fetchGmailData(scope: ProjectScopeRequest): Promise<DataFetchResponse> {
    const response = await fetch(`${API_BASE_URL}/data/fetch/gmail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(scope)
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Gmail data: ${response.statusText}`)
    }
    
    return await response.json()
  }
  
  /**
   * Fetch Google Drive data for a project scope
   */
  async fetchDriveData(scope: ProjectScopeRequest): Promise<DataFetchResponse> {
    const response = await fetch(`${API_BASE_URL}/data/fetch/drive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(scope)
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Drive data: ${response.statusText}`)
    }
    
    return await response.json()
  }
  
  /**
   * Fetch all available data (Gmail + Drive) for a project scope
   */
  async fetchAllProjectData(scope: ProjectScopeRequest): Promise<DataFetchResponse> {
    const response = await fetch(`${API_BASE_URL}/data/fetch/all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(scope)
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch project data: ${response.statusText}`)
    }
    
    return await response.json()
  }
  
  /**
   * Get a preview of available project data
   */
  async previewProjectData(scope: ProjectScopeRequest): Promise<DataPreview> {
    const response = await fetch(`${API_BASE_URL}/data/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(scope)
    })
    
    if (!response.ok) {
      throw new Error(`Failed to preview project data: ${response.statusText}`)
    }
    
    return await response.json()
  }
  
  /**
   * Check health status of data connections
   */
  async checkConnectionsHealth(): Promise<ConnectionHealth> {
    const response = await fetch(`${API_BASE_URL}/data/connections/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    })
    
    if (!response.ok) {
      throw new Error(`Failed to check connection health: ${response.statusText}`)
    }
    
    return await response.json()
  }
}

// Create and export singleton instance
export const dataService = DataService.getInstance()