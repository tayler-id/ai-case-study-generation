import { useState, useCallback } from 'react'

interface StreamingState {
  content: string
  isStreaming: boolean
  error: string | null
}

interface ProjectScope {
  dateRange: {
    start: string
    end: string
  }
  participants: string[]
  keywords: string[]
  folders: string[]
  industry: string
  focus: string
}

export function useStreamingMarkdown() {
  const [state, setState] = useState<StreamingState>({
    content: '',
    isStreaming: false,
    error: null
  })

  const generateCaseStudy = useCallback(async (projectScope: ProjectScope) => {
    setState(prev => ({ ...prev, isStreaming: true, error: null, content: '' }))

    try {
      const response = await fetch('/api/generate-case-study', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectScope }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate case study')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.content) {
                setState(prev => ({ 
                  ...prev, 
                  content: prev.content + data.content 
                }))
              }
              if (data.done) {
                setState(prev => ({ ...prev, isStreaming: false }))
                return
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e)
            }
          }
        }
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isStreaming: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }))
    }
  }, [])

  const reset = useCallback(() => {
    setState({
      content: '',
      isStreaming: false,
      error: null
    })
  }, [])

  return {
    ...state,
    generateCaseStudy,
    reset
  }
}