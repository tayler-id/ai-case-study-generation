/**
 * Case Study Generator Component
 * Main interface for generating case studies with real-time streaming
 */

"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Play, 
  Square, 
  Download, 
  RefreshCw, 
  FileText, 
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Settings,
  Eye
} from "lucide-react"
import { EnhancedProjectScopingModal, type ProjectScope } from "./EnhancedProjectScopingModal"
import { CaseStudyStreamingDisplay } from "./CaseStudyStreamingDisplay"
import { CaseStudyConfigModal } from "./CaseStudyConfigModal"
import { caseStudyService, type CaseStudyGenerationRequest, type StreamChunk } from "@/services/caseStudyService"
import { type DataPreview } from "@/services/dataService"

interface GenerationState {
  status: 'idle' | 'starting' | 'streaming' | 'completed' | 'failed' | 'cancelled'
  progress: number
  currentSection?: string
  error?: string
  caseStudyId?: number
}

interface GenerationConfig {
  template_type: 'comprehensive' | 'technical' | 'marketing' | 'product'
  model_name: 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3-sonnet' | 'claude-3-haiku'
  custom_instructions?: string
}

export function CaseStudyGenerator() {
  const [scopingModalOpen, setScopingModalOpen] = useState(false)
  const [configModalOpen, setConfigModalOpen] = useState(false)
  
  const [projectScope, setProjectScope] = useState<ProjectScope | null>(null)
  const [generationConfig, setGenerationConfig] = useState<GenerationConfig>({
    template_type: 'comprehensive',
    model_name: 'gpt-4'
  })
  
  const [generationState, setGenerationState] = useState<GenerationState>({
    status: 'idle',
    progress: 0
  })
  
  const [streamedContent, setStreamedContent] = useState<StreamChunk[]>([])
  const [previewData, setPreviewData] = useState<DataPreview | null>(null)
  
  // Refs for cleanup
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  const handleScopeSubmit = (scope: ProjectScope, preview?: DataPreview) => {
    setProjectScope(scope)
    setPreviewData(preview || null)
    setScopingModalOpen(false)
  }

  const handleConfigSubmit = (config: GenerationConfig) => {
    setGenerationConfig(config)
    setConfigModalOpen(false)
  }

  const startGeneration = async () => {
    if (!projectScope) {
      setScopingModalOpen(true)
      return
    }

    try {
      setGenerationState({
        status: 'starting',
        progress: 0
      })
      setStreamedContent([])

      const request: CaseStudyGenerationRequest = {
        project_name: projectScope.projectName,
        project_industry: projectScope.industry || undefined,
        project_focus: projectScope.focus || undefined,
        date_range_start: new Date(projectScope.dateRange.start).toISOString(),
        date_range_end: new Date(projectScope.dateRange.end).toISOString(),
        participants: projectScope.participants,
        keywords: projectScope.keywords,
        template_type: generationConfig.template_type,
        model_name: generationConfig.model_name,
        custom_instructions: generationConfig.custom_instructions
      }

      // Start streaming generation
      setGenerationState(prev => ({
        ...prev,
        status: 'streaming'
      }))

      await caseStudyService.generateStreaming(
        request,
        (chunk) => {
          setStreamedContent(prev => [...prev, chunk])
          
          // Update progress based on chunk type
          if (chunk.type === 'section_start') {
            setGenerationState(prev => ({
              ...prev,
              currentSection: chunk.section,
              progress: Math.min(prev.progress + 10, 90)
            }))
          } else if (chunk.type === 'section_end') {
            setGenerationState(prev => ({
              ...prev,
              progress: Math.min(prev.progress + 5, 95)
            }))
          }
        },
        (error) => {
          setGenerationState({
            status: 'failed',
            progress: 0,
            error
          })
        },
        () => {
          setGenerationState({
            status: 'completed',
            progress: 100
          })
        }
      )

    } catch (error) {
      setGenerationState({
        status: 'failed',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }

  const cancelGeneration = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    
    setGenerationState({
      status: 'cancelled',
      progress: 0
    })
  }

  const resetGeneration = () => {
    setGenerationState({
      status: 'idle',
      progress: 0
    })
    setStreamedContent([])
  }

  const exportCaseStudy = () => {
    if (streamedContent.length === 0) return
    
    const content = streamedContent
      .filter(chunk => chunk.type === 'content')
      .map(chunk => chunk.content)
      .join('')
    
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${projectScope?.projectName || 'case-study'}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getStatusIcon = () => {
    switch (generationState.status) {
      case 'starting':
      case 'streaming':
        return <RefreshCw className="w-5 h-5 animate-spin" />
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />
      case 'cancelled':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />
      default:
        return <FileText className="w-5 h-5" />
    }
  }

  const getStatusText = () => {
    switch (generationState.status) {
      case 'starting':
        return 'Preparing generation...'
      case 'streaming':
        return generationState.currentSection 
          ? `Generating: ${generationState.currentSection}`
          : 'Generating case study...'
      case 'completed':
        return 'Case study completed!'
      case 'failed':
        return `Failed: ${generationState.error}`
      case 'cancelled':
        return 'Generation cancelled'
      default:
        return 'Ready to generate'
    }
  }

  const canStart = projectScope && generationState.status === 'idle'
  const isGenerating = generationState.status === 'starting' || generationState.status === 'streaming'
  const isCompleted = generationState.status === 'completed'
  const hasFailed = generationState.status === 'failed'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Case Study Generator</h1>
          <p className="text-muted-foreground">
            Transform your project data into comprehensive case studies
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setScopingModalOpen(true)}
            disabled={isGenerating}
          >
            <Eye className="w-4 h-4 mr-2" />
            Define Scope
          </Button>
          <Button
            variant="outline"
            onClick={() => setConfigModalOpen(true)}
            disabled={isGenerating}
          >
            <Settings className="w-4 h-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      {/* Project Summary */}
      {projectScope && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Project: {projectScope.projectName}
            </CardTitle>
            <CardDescription>
              {projectScope.focus && `${projectScope.focus} • `}
              {projectScope.industry && `${projectScope.industry} • `}
              {projectScope.participants.length} participants • {projectScope.keywords.length} keywords
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                {new Date(projectScope.dateRange.start).toLocaleDateString()} - {new Date(projectScope.dateRange.end).toLocaleDateString()}
              </Badge>
              <Badge variant="secondary">
                {generationConfig.template_type}
              </Badge>
              <Badge variant="outline">
                {generationConfig.model_name}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Control Panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Generation Status
          </CardTitle>
          <CardDescription>
            {getStatusText()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          {(isGenerating || isCompleted) && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{generationState.progress}%</span>
              </div>
              <Progress value={generationState.progress} className="w-full" />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {generationState.status === 'idle' && (
              <Button 
                onClick={startGeneration}
                disabled={!canStart}
                className="flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Generate Case Study
              </Button>
            )}

            {isGenerating && (
              <Button 
                onClick={cancelGeneration}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Square className="w-4 h-4" />
                Cancel Generation
              </Button>
            )}

            {(isCompleted || hasFailed) && (
              <Button 
                onClick={resetGeneration}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Start New Generation
              </Button>
            )}

            {isCompleted && streamedContent.length > 0 && (
              <Button 
                onClick={exportCaseStudy}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export Markdown
              </Button>
            )}
          </div>

          {/* Error Display */}
          {hasFailed && generationState.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
              <strong>Error:</strong> {generationState.error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Streaming Display */}
      {streamedContent.length > 0 && (
        <CaseStudyStreamingDisplay 
          chunks={streamedContent}
          isGenerating={isGenerating}
          projectName={projectScope?.projectName || "Untitled Project"}
        />
      )}

      {/* Modals */}
      <EnhancedProjectScopingModal
        open={scopingModalOpen}
        onOpenChange={setScopingModalOpen}
        onSubmit={handleScopeSubmit}
      />

      <CaseStudyConfigModal
        open={configModalOpen}
        onOpenChange={setConfigModalOpen}
        config={generationConfig}
        onSubmit={handleConfigSubmit}
      />
    </div>
  )
}