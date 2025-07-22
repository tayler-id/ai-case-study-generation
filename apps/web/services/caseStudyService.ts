/**
 * Case Study Service
 * Handles API interactions for case study generation and management
 */

const API_BASE_URL = 'http://localhost:8001';

export interface CaseStudyGenerationRequest {
  project_name: string;
  project_industry?: string;
  project_focus?: string;
  date_range_start: string; // ISO string
  date_range_end: string; // ISO string
  participants: string[];
  keywords: string[];
  template_type: 'comprehensive' | 'technical' | 'marketing' | 'product';
  model_name: 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3-sonnet' | 'claude-3-haiku';
  custom_instructions?: string;
}

export interface CaseStudyResponse {
  id: number;
  project_name: string;
  status: 'pending' | 'generating' | 'completed' | 'failed' | 'cancelled';
  progress_percentage: number;
  current_section?: string;
  template_type: string;
  model_used: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  executive_summary?: string;
  key_insights: string[];
  recommendations: string[];
  full_content?: string;
  generation_metadata: Record<string, any>;
}

export interface StreamChunk {
  type: 'section_start' | 'content' | 'section_end' | 'metadata' | 'error';
  content: string;
  section?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface StreamProgressEvent {
  case_study_id: number;
  status: string;
  progress: number;
  current_section?: string;
  updated_at: string;
  executive_summary?: string;
  key_insights?: string[];
  recommendations?: string[];
  generation_metadata?: Record<string, any>;
}

class CaseStudyService {
  private baseUrl = API_BASE_URL;

  /**
   * Start case study generation (background task)
   */
  async startGeneration(request: CaseStudyGenerationRequest): Promise<{
    case_study_id: number;
    status: string;
    stream_url: string;
  }> {
    const response = await fetch(`${this.baseUrl}/case-study/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to start generation');
    }

    return response.json();
  }

  /**
   * Generate case study with streaming (direct streaming)
   */
  async generateStreaming(
    request: CaseStudyGenerationRequest,
    onChunk: (chunk: StreamChunk) => void,
    onError: (error: string) => void,
    onComplete: () => void
  ): Promise<void> {
    const url = new URL(`${this.baseUrl}/case-study/generate/stream`);
    
    // Convert request to query params for GET request
    Object.entries(request).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(item => url.searchParams.append(key, item));
      } else if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    const eventSource = new EventSource(url.toString());

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'error') {
          onError(data.content || 'Unknown error');
          eventSource.close();
          return;
        }

        onChunk({
          type: data.type,
          content: data.content,
          section: data.section,
          metadata: data.metadata,
          timestamp: data.timestamp
        });

        if (data.type === 'metadata' && data.metadata?.generation_complete) {
          onComplete();
          eventSource.close();
        }
      } catch (error) {
        onError('Failed to parse streaming data');
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      onError('Connection to streaming service failed');
      eventSource.close();
    };
  }

  /**
   * Stream progress updates for background generation
   */
  streamProgress(
    caseStudyId: number,
    onProgress: (event: StreamProgressEvent) => void,
    onError: (error: string) => void,
    onComplete: (finalData: StreamProgressEvent) => void
  ): EventSource {
    const eventSource = new EventSource(
      `${this.baseUrl}/case-study/${caseStudyId}/stream`,
      { withCredentials: true }
    );

    eventSource.addEventListener('progress', (event) => {
      try {
        const data = JSON.parse(event.data);
        onProgress(data);
      } catch (error) {
        onError('Failed to parse progress data');
      }
    });

    eventSource.addEventListener('complete', (event) => {
      try {
        const data = JSON.parse(event.data);
        onComplete(data);
        eventSource.close();
      } catch (error) {
        onError('Failed to parse completion data');
      }
    });

    eventSource.addEventListener('error', (event) => {
      try {
        const data = JSON.parse((event as any).data || '{}');
        onError(data.error || 'Unknown streaming error');
      } catch (error) {
        onError('Streaming connection failed');
      }
      eventSource.close();
    });

    eventSource.onerror = () => {
      onError('Connection to progress stream failed');
    };

    return eventSource;
  }

  /**
   * Get case study by ID
   */
  async getCaseStudy(id: number): Promise<CaseStudyResponse> {
    const response = await fetch(`${this.baseUrl}/case-study/${id}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to fetch case study');
    }

    return response.json();
  }

  /**
   * List user's case studies
   */
  async listCaseStudies(limit = 20, offset = 0): Promise<CaseStudyResponse[]> {
    const url = new URL(`${this.baseUrl}/case-study/`);
    url.searchParams.append('limit', String(limit));
    url.searchParams.append('offset', String(offset));

    const response = await fetch(url.toString(), {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to fetch case studies');
    }

    return response.json();
  }

  /**
   * Delete a case study
   */
  async deleteCaseStudy(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/case-study/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to delete case study');
    }
  }

  /**
   * Get available LLM models
   */
  async getAvailableModels(): Promise<string[]> {
    // For now, return static list - could be made dynamic later
    return ['gpt-4', 'gpt-3.5-turbo', 'claude-3-sonnet', 'claude-3-haiku'];
  }

  /**
   * Get available templates
   */
  async getAvailableTemplates(): Promise<Array<{ value: string; label: string; description: string }>> {
    return [
      {
        value: 'comprehensive',
        label: 'Comprehensive',
        description: 'Full analysis covering all aspects of the project'
      },
      {
        value: 'technical',
        label: 'Technical Focus',
        description: 'Emphasizes technical decisions and architecture'
      },
      {
        value: 'marketing',
        label: 'Marketing Focus',
        description: 'Focuses on marketing strategies and campaigns'
      },
      {
        value: 'product',
        label: 'Product Focus',
        description: 'Emphasizes product development and user feedback'
      }
    ];
  }
}

export const caseStudyService = new CaseStudyService();
export default caseStudyService;