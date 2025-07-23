/**
 * Case Study Streaming Display Component
 * Real-time display of streaming case study generation
 */

"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  FileText, 
  Clock, 
  Zap, 
  Eye, 
  EyeOff,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2
} from "lucide-react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { type StreamChunk } from "@/services/caseStudyService"

interface CaseStudyStreamingDisplayProps {
  chunks: StreamChunk[]
  isGenerating: boolean
  projectName: string
}

interface SectionData {
  name: string
  content: string
  startTime: string
  endTime?: string
  isActive: boolean
}

export function CaseStudyStreamingDisplay({ 
  chunks, 
  isGenerating, 
  projectName 
}: CaseStudyStreamingDisplayProps) {
  const [showPreview, setShowPreview] = useState(true)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [copiedSection, setCopiedSection] = useState<string | null>(null)
  const [sections, setSections] = useState<SectionData[]>([])
  
  const contentRef = useRef<HTMLDivElement>(null)
  const shouldAutoScroll = useRef(true)

  // Process chunks into sections
  useEffect(() => {
    const sectionMap = new Map<string, SectionData>()
    let currentSection: SectionData | null = null
    
    chunks.forEach(chunk => {
      if (chunk.type === 'section_start' && chunk.section) {
        currentSection = {
          name: chunk.section,
          content: '',
          startTime: chunk.timestamp,
          isActive: true
        }
        sectionMap.set(chunk.section, currentSection)
      } else if (chunk.type === 'content' && currentSection) {
        currentSection.content += chunk.content
        sectionMap.set(currentSection.name, { ...currentSection })
      } else if (chunk.type === 'section_end' && chunk.section) {
        const section = sectionMap.get(chunk.section)
        if (section) {
          section.isActive = false
          section.endTime = chunk.timestamp
          sectionMap.set(chunk.section, section)
        }
        currentSection = null
      }
    })
    
    setSections(Array.from(sectionMap.values()))
  }, [chunks])

  // Auto-scroll during generation
  useEffect(() => {
    if (isGenerating && shouldAutoScroll.current && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [chunks, isGenerating])

  // Handle manual scroll to disable auto-scroll
  const handleScroll = () => {
    if (!contentRef.current) return
    
    const { scrollTop, scrollHeight, clientHeight } = contentRef.current
    const isAtBottom = scrollHeight - scrollTop <= clientHeight + 100
    shouldAutoScroll.current = isAtBottom
  }

  const toggleSectionExpanded = (sectionName: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionName)) {
      newExpanded.delete(sectionName)
    } else {
      newExpanded.add(sectionName)
    }
    setExpandedSections(newExpanded)
  }

  const copySection = async (content: string, sectionName: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedSection(sectionName)
      setTimeout(() => setCopiedSection(null), 2000)
    } catch (error) {
      console.error('Failed to copy content:', error)
    }
  }

  const copyAllContent = async () => {
    const allContent = chunks
      .filter(chunk => chunk.type === 'content')
      .map(chunk => chunk.content)
      .join('')
    
    try {
      await navigator.clipboard.writeText(allContent)
      setCopiedSection('all')
      setTimeout(() => setCopiedSection(null), 2000)
    } catch (error) {
      console.error('Failed to copy all content:', error)
    }
  }

  const getGenerationStats = () => {
    const contentChunks = chunks.filter(chunk => chunk.type === 'content')
    const totalChars = contentChunks.reduce((sum, chunk) => sum + chunk.content.length, 0)
    const estimatedWords = Math.round(totalChars / 5)
    const estimatedTokens = Math.round(totalChars / 4)
    
    return { totalChars, estimatedWords, estimatedTokens }
  }

  const stats = getGenerationStats()

  return (
    <div className="space-y-4">
      {/* Header with Controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {projectName} - Case Study
              {isGenerating && <Loader2 className="w-4 h-4 animate-spin" />}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={copyAllContent}
                disabled={chunks.length === 0}
              >
                {copiedSection === 'all' ? (
                  <Check className="w-4 h-4 mr-1" />
                ) : (
                  <Copy className="w-4 h-4 mr-1" />
                )}
                Copy All
              </Button>
            </div>
          </div>
          <CardDescription className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {sections.length} sections
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-4 h-4" />
              {stats.estimatedWords} words
            </div>
            <div className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              ~{stats.estimatedTokens} tokens
            </div>
            {isGenerating && (
              <Badge variant="secondary" className="animate-pulse-slow">
                Generating...
              </Badge>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Content Display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Section Navigation */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Sections</h3>
          <div className="space-y-1">
            {sections.map((section, index) => (
              <Card key={section.name} className="cursor-pointer" onClick={() => toggleSectionExpanded(section.name)}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {expandedSections.has(section.name) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <span className="text-sm font-medium">{section.name}</span>
                      {section.isActive && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse-slow" />
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        copySection(section.content, section.name)
                      }}
                      className="h-6 w-6 p-0"
                    >
                      {copiedSection === section.name ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {Math.round(section.content.length / 5)} words
                    {section.endTime && (
                      <span className="ml-2">
                        • {new Date(section.endTime).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          <Card className="h-[600px]">
            <CardContent className="p-0 h-full">
              <div
                ref={contentRef}
                onScroll={handleScroll}
                className="h-full overflow-y-auto p-6"
              >
                {showPreview ? (
                  // Rendered Markdown Preview
                  <div className="prose prose-sm max-w-none">
                    {sections.map((section) => (
                      <div key={section.name} className="mb-6">
                        {expandedSections.has(section.name) && (
                          <>
                            <h2 className="flex items-center gap-2">
                              {section.name}
                              {section.isActive && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse-slow" />
                              )}
                            </h2>
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              className="prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground"
                            >
                              {section.content}
                            </ReactMarkdown>
                            {section.isActive && isGenerating && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Generating...
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                    
                    {/* Show all content when no specific sections are expanded */}
                    {expandedSections.size === 0 && (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        className="prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground"
                      >
                        {chunks
                          .filter(chunk => chunk.type === 'content')
                          .map(chunk => chunk.content)
                          .join('')}
                      </ReactMarkdown>
                    )}
                    
                    {isGenerating && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating case study...
                      </div>
                    )}
                  </div>
                ) : (
                  // Raw Markdown Text
                  <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-50 p-4 rounded">
                    {chunks
                      .filter(chunk => chunk.type === 'content')
                      .map(chunk => chunk.content)
                      .join('')}
                    {isGenerating && (
                      <div className="text-blue-600 mt-2">
                        ▋ Generating...
                      </div>
                    )}
                  </pre>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}