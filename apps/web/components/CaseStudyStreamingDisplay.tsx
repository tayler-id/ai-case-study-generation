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
  Loader2,
  Mail,
  User,
  Calendar,
  Paperclip,
  Tag
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
  const [emailCount, setEmailCount] = useState<number | null>(null)
  const [totalEmailsFound, setTotalEmailsFound] = useState<number | null>(null)
  const [emailList, setEmailList] = useState<any[]>([])
  const [showEmailList, setShowEmailList] = useState(false)
  const [caseStudyId, setCaseStudyId] = useState<number | null>(null)
  const [savedToDashboard, setSavedToDashboard] = useState(false)
  
  const contentRef = useRef<HTMLDivElement>(null)
  const shouldAutoScroll = useRef(true)

  // Process chunks into sections and extract metadata
  useEffect(() => {
    const sectionMap = new Map<string, SectionData>()
    let currentSection: SectionData | null = null
    
    chunks.forEach(chunk => {
      // Handle metadata chunks for email count information
      if (chunk.type === 'metadata' && chunk.metadata) {
        console.log('🔍 Processing metadata chunk:', chunk.metadata)
        if (chunk.metadata.emails_retrieved !== undefined) {
          console.log('📧 Setting email count:', chunk.metadata.emails_retrieved)
          setEmailCount(chunk.metadata.emails_retrieved)
        }
        if (chunk.metadata.total_emails_found !== undefined) {
          console.log('📧 Setting total emails found:', chunk.metadata.total_emails_found)
          setTotalEmailsFound(chunk.metadata.total_emails_found)
        }
        if (chunk.metadata.email_list) {
          console.log('📧 Setting email list:', chunk.metadata.email_list.length, 'emails')
          setEmailList(chunk.metadata.email_list)
        }
        if (chunk.metadata.case_study_id) {
          setCaseStudyId(chunk.metadata.case_study_id)
        }
        if (chunk.metadata.saved_to_dashboard) {
          setSavedToDashboard(true)
        }
      }
      
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
              {isGenerating && <Loader2 className="w-4 h-4 animate-spin-slow" />}
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
          <CardDescription className="flex items-center gap-4 text-sm flex-wrap">
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
            {emailCount !== null && (
              <div className="flex items-center gap-1">
                <span className="text-blue-600">📧</span>
                {emailCount} emails processed
                {totalEmailsFound !== null && totalEmailsFound !== emailCount && (
                  <span className="text-gray-500">({totalEmailsFound} found)</span>
                )}
              </div>
            )}
            {isGenerating && (
              <Badge variant="secondary" className="animate-pulse-slow">
                Generating...
              </Badge>
            )}
            {savedToDashboard && (
              <Badge variant="default" className="bg-green-100 text-green-800">
                ✅ Saved to Dashboard
              </Badge>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Email List Display */}
      {emailList.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mail className="w-5 h-5" />
                Retrieved Emails ({emailList.length})
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEmailList(!showEmailList)}
              >
                {showEmailList ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />}
                {showEmailList ? 'Hide Emails' : 'Show Emails'}
              </Button>
            </div>
            <CardDescription>
              Emails retrieved from Gmail for case study analysis
              {totalEmailsFound && totalEmailsFound > emailList.length && (
                <span className="text-muted-foreground ml-2">
                  (Showing first {emailList.length} of {totalEmailsFound} total)
                </span>
              )}
            </CardDescription>
          </CardHeader>
          
          {showEmailList && (
            <CardContent className="pt-0">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {emailList.map((email, index) => (
                  <div key={email.id || index} className="border rounded-lg p-3 bg-muted/30">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-muted-foreground">#{email.id}</span>
                          <h4 className="text-sm font-medium truncate">{email.subject}</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground mb-2">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span className="truncate">{email.sender}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{email.date ? new Date(email.date).toLocaleDateString() : 'Unknown date'}</span>
                          </div>
                        </div>
                        
                        {email.snippet && (
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                            {email.snippet}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 flex-wrap">
                          {email.attachments > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <Paperclip className="w-3 h-3 mr-1" />
                              {email.attachments} attachment{email.attachments > 1 ? 's' : ''}
                            </Badge>
                          )}
                          {email.labels && email.labels.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Tag className="w-3 h-3" />
                              <div className="flex gap-1">
                                {email.labels.slice(0, 3).map((label: string, idx: number) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {label}
                                  </Badge>
                                ))}
                                {email.labels.length > 3 && (
                                  <span className="text-xs text-muted-foreground">
                                    +{email.labels.length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Save Confirmation */}
      {savedToDashboard && caseStudyId && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-green-900">Case Study Saved Successfully!</h3>
                  <p className="text-sm text-green-700">
                    Your case study has been saved to your dashboard and can be accessed anytime.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/case-study/${caseStudyId}`, '_blank')}
                  className="border-green-300 text-green-700 hover:bg-green-100"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View Case Study
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = '/dashboard'}
                  className="border-green-300 text-green-700 hover:bg-green-100"
                >
                  <FileText className="w-4 h-4 mr-1" />
                  View Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                                <Loader2 className="w-4 h-4 animate-spin-slow" />
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
                        <Loader2 className="w-4 h-4 animate-spin-slow" />
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