"use client"

import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { ChatPanel } from "@/components/ChatPanel"
import { Canvas } from "@/components/Canvas"
import { ProjectScope } from "@/components/ProjectScopingModal"
import { type StreamChunk } from "@/services/caseStudyService"

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

interface MainContentProps {
  projectScope?: ProjectScope | null
  currentStudy?: CaseStudy | null
  isGenerating?: boolean
  agentStatus?: string
  onSendMessage?: (message: string) => void
  onProjectScopeUpdate?: (scope: ProjectScope) => void
  onStartGeneration?: () => void
  onStreamChunk?: (chunk: StreamChunk) => void
  onGenerationComplete?: () => void
  onContentChange?: (content: string) => void
  onSaveStudy?: (content: string) => void
}

export function MainContent({ 
  projectScope,
  currentStudy,
  isGenerating = false,
  agentStatus = "Ready",
  onSendMessage,
  onProjectScopeUpdate,
  onStartGeneration,
  onStreamChunk,
  onGenerationComplete,
  onContentChange,
  onSaveStudy
}: MainContentProps) {
  return (
    <div className="flex-1 flex flex-col">
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={40} minSize={30}>
          <ChatPanel
            projectScope={projectScope || undefined}
            onSendMessage={onSendMessage}
            onProjectScopeUpdate={onProjectScopeUpdate}
            onStartGeneration={onStartGeneration}
            onStreamChunk={onStreamChunk}
            onGenerationComplete={onGenerationComplete}
            isGenerating={isGenerating}
            agentStatus={agentStatus}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={60} minSize={40}>
          <Canvas 
            content={currentStudy?.content || ""}
            isGenerating={isGenerating}
            onContentChange={onContentChange}
            onSave={onSaveStudy}
            title={currentStudy?.title || "Case Study Analysis"}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}