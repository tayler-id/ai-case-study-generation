"use client"

import { useState } from "react"
import { Authentication } from "@/components/Authentication"
import { Sidebar } from "@/components/Sidebar"
import { MainContent } from "@/components/MainContent"
import { Dashboard } from "@/components/Dashboard"
import { EvaluationsViewer } from "@/components/EvaluationsViewer"
import { ProjectScope } from "@/components/ProjectScopingModal"
import { useAuthStore } from "@/stores/useAuthStore"
import { User } from "@case-study/shared"
import { type StreamChunk, caseStudyService } from "@/services/caseStudyService"

interface CaseStudy {
  id: string
  title: string
  dateCreated: string
  dateRange: {
    start: string
    end: string
  }
  participants: string[]
  keywords: string[]
  rating: number
  status: 'completed' | 'in-progress' | 'draft'
  summary: string
  content?: string
}

export default function HomePage() {
  const { user, isAuthenticated, isLoading, logout } = useAuthStore()
  const [currentView, setCurrentView] = useState<'dashboard' | 'study' | 'evaluations'>('study')
  const [currentStudy, setCurrentStudy] = useState<CaseStudy | null>(null)
  const [projectScope, setProjectScope] = useState<ProjectScope | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [agentStatus, setAgentStatus] = useState("Ready")
  const [streamedContent, setStreamedContent] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)

  const handleAuthenticated = (authenticatedUser: User) => {
    // This is now handled by the auth store
    console.log('User authenticated:', authenticatedUser)
  }

  const handleCreateNewStudy = (scope: ProjectScope) => {
    setProjectScope(scope)
    setCurrentStudy(null) // Don't create a mock study
    setIsGenerating(false)
    setAgentStatus("Ready")
  }

  const handleSelectStudy = async (study: { id: number }) => {
    try {
      // Fetch the full case study content from the API
      const fullStudy = await caseStudyService.getCaseStudy(study.id)
      
      // Convert backend response to frontend format
      const convertedStudy: CaseStudy = {
        id: fullStudy.id.toString(),
        title: fullStudy.project_name,
        dateCreated: new Date(fullStudy.created_at).toISOString().split('T')[0],
        dateRange: {
          start: "2024-01-01", // Default values - these aren't stored in backend currently
          end: "2024-01-31"
        },
        participants: [], // Default - not stored in backend currently
        keywords: [], // Default - not stored in backend currently
        rating: 0,
        status: fullStudy.status === 'completed' ? 'completed' as const : 
               fullStudy.status === 'generating' ? 'in-progress' as const : 'draft' as const,
        summary: fullStudy.executive_summary || `Analysis of ${fullStudy.project_name}`,
        content: fullStudy.full_content || ""
      }
      
      setCurrentStudy(convertedStudy)
      setCurrentView('study')
      setIsGenerating(false)
      setAgentStatus("Ready")
    } catch (error) {
      console.error('Failed to load case study:', error)
      // Handle error - maybe show a toast notification
    }
  }

  const handleSendMessage = (message: string) => {
    console.log("User message:", message)
    // In a real app, this would send the message to the backend
    // For now, we can simulate some basic responses
    if (message.toLowerCase().includes('regenerate') || message.toLowerCase().includes('update')) {
      setIsGenerating(true)
      setAgentStatus("Updating analysis")
      setTimeout(() => {
        setIsGenerating(false)
        setAgentStatus("Ready")
      }, 3000)
    }
  }

  const handleStartGeneration = () => {
    setIsGenerating(true)
    setIsStreaming(false)
    setAgentStatus("Starting generation")
    setStreamedContent("")
    
    // Create a new case study when generation starts
    if (projectScope) {
      setCurrentStudy({
        id: Date.now().toString(),
        title: projectScope.focus || "New Case Study",
        dateCreated: new Date().toISOString().split('T')[0],
        dateRange: projectScope.dateRange,
        participants: projectScope.participants,
        keywords: projectScope.keywords,
        rating: 0,
        status: 'in-progress',
        summary: `Analysis of ${projectScope.focus || 'project'} from ${projectScope.dateRange.start} to ${projectScope.dateRange.end}`,
        content: ""
      })
    }
  }

  const handleStreamChunk = (chunk: StreamChunk) => {
    if (chunk.type === 'content') {
      setStreamedContent(prev => prev + chunk.content)
      setIsStreaming(true)
      setAgentStatus("Writing case study")
    } else if (chunk.type === 'section_start' && chunk.section) {
      setAgentStatus(`Writing: ${chunk.section}`)
    } else if (chunk.type === 'section_end') {
      setAgentStatus("Generating insights")
    } else if (chunk.type === 'metadata') {
      // Handle metadata chunks that might indicate data processing
      if (chunk.content.includes('Processing') || chunk.content.includes('emails')) {
        setAgentStatus("Analyzing project data")
      }
    }
  }

  const handleGenerationComplete = () => {
    setIsGenerating(false)
    setIsStreaming(false)
    setAgentStatus("Ready")
    
    // Mark current study as completed and set final content
    setCurrentStudy(prev => prev ? {
      ...prev, 
      content: streamedContent,
      status: 'completed' as const
    } : null)
  }

  const handleContentChange = (content: string) => {
    if (currentStudy) {
      setCurrentStudy(prev => prev ? { ...prev, content } : null)
    }
  }

  const handleSaveStudy = (content: string) => {
    console.log("Saving study:", content)
    // In a real app, this would save to the backend
    if (currentStudy) {
      const updatedStudy = { ...currentStudy, content }
      setCurrentStudy(updatedStudy)
      
      // Save to localStorage for persistence
      const savedStudies = JSON.parse(localStorage.getItem('case-studies') || '[]')
      const existingIndex = savedStudies.findIndex((s: CaseStudy) => s.id === updatedStudy.id)
      
      if (existingIndex >= 0) {
        savedStudies[existingIndex] = updatedStudy
      } else {
        savedStudies.push(updatedStudy)
      }
      
      localStorage.setItem('case-studies', JSON.stringify(savedStudies))
    }
  }

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Show authentication screen if user is not logged in
  if (!isAuthenticated || !user) {
    return <Authentication onAuthenticated={handleAuthenticated} />
  }

  return (
    <div className="flex min-h-screen h-screen bg-slate-100 dark:bg-slate-900">
      <Sidebar 
        onCreateNewStudy={handleCreateNewStudy}
        currentView={currentView}
        onViewChange={setCurrentView}
        user={user}
        onSignOut={() => {
          logout()
        }}
      />
      
      {currentView === 'dashboard' ? (
        <Dashboard onSelectStudy={handleSelectStudy} />
      ) : currentView === 'evaluations' ? (
        <div className="flex-1 overflow-y-auto p-6">
          <EvaluationsViewer />
        </div>
      ) : (
        <MainContent 
          projectScope={projectScope}
          currentStudy={currentStudy}
          isGenerating={isGenerating}
          agentStatus={agentStatus}
          onSendMessage={handleSendMessage}
          onProjectScopeUpdate={setProjectScope}
          onStartGeneration={handleStartGeneration}
          onStreamChunk={handleStreamChunk}
          onGenerationComplete={handleGenerationComplete}
          onContentChange={handleContentChange}
          onSaveStudy={handleSaveStudy}
          streamingContent={streamedContent}
          isStreaming={isStreaming}
        />
      )}
    </div>
  )
}

