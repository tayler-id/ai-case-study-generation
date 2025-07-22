"use client"

import { useEffect } from 'react'
import { useStreamingMarkdown } from '@/hooks/useStreamingMarkdown'

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

interface StreamingMarkdownGeneratorProps {
  projectScope: ProjectScope
  onContentUpdate: (content: string) => void
  onStatusUpdate: (status: string) => void
  onGenerationComplete: () => void
}

export default function StreamingMarkdownGenerator({
  projectScope,
  onContentUpdate,
  onStatusUpdate,
  onGenerationComplete
}: StreamingMarkdownGeneratorProps) {
  const { content, isStreaming, error, generateCaseStudy } = useStreamingMarkdown()

  useEffect(() => {
    if (projectScope) {
      onStatusUpdate('Initializing case study generation...')
      generateCaseStudy(projectScope)
    }
  }, [projectScope, generateCaseStudy, onStatusUpdate])

  useEffect(() => {
    onContentUpdate(content)
  }, [content, onContentUpdate])

  useEffect(() => {
    if (isStreaming) {
      onStatusUpdate('Generating case study content...')
    } else if (error) {
      onStatusUpdate('Error: ' + error)
      onGenerationComplete()
    } else if (content) {
      onStatusUpdate('Case study generation complete')
      onGenerationComplete()
    }
  }, [isStreaming, error, content, onStatusUpdate, onGenerationComplete])

  // This component doesn't render anything visible
  return null
}