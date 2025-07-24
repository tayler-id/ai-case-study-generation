"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Send, Bot, User, Calendar, Users, Hash, FolderOpen, Settings, Eye, Play, Database, PenTool, Brain, Zap } from "lucide-react"
import { ProjectScope } from "@/components/ProjectScopingModal"
import { EnhancedProjectScopingModal } from "@/components/EnhancedProjectScopingModal"
import { caseStudyService, type CaseStudyGenerationRequest, type StreamChunk } from "@/services/caseStudyService"

interface Message {
  id: string
  type: 'user' | 'agent'
  content: string
  timestamp: Date
}

interface ChatPanelProps {
  projectScope?: ProjectScope
  onSendMessage?: (message: string) => void
  onProjectScopeUpdate?: (scope: ProjectScope) => void
  onStartGeneration?: () => void
  onStreamChunk?: (chunk: StreamChunk) => void
  onGenerationComplete?: () => void
  isGenerating?: boolean
  agentStatus?: string
}

export function ChatPanel({ 
  projectScope, 
  onSendMessage, 
  onProjectScopeUpdate,
  onStartGeneration,
  onStreamChunk,
  onGenerationComplete,
  isGenerating = false,
  agentStatus = "Ready"
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'agent',
      content: 'Hello! I\'m ready to help you generate insightful case studies from your project data. Please define your project scope to get started.',
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState("")
  const [scopingModalOpen, setScopingModalOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = () => {
    if (!inputValue.trim() || isGenerating) return

    const newMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, newMessage])
    onSendMessage?.(inputValue.trim())
    setInputValue("")

    // Simulate agent response (in real app, this would come from the backend)
    setTimeout(() => {
      const agentResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'agent',
        content: 'I understand your request. Let me analyze the data and generate insights for your case study.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, agentResponse])
    }, 1000)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleScopeSubmit = (scope: ProjectScope) => {
    onProjectScopeUpdate?.(scope)
    setScopingModalOpen(false)
    
    // Add a message to the chat about the scope update
    const scopeMessage: Message = {
      id: Date.now().toString(),
      type: 'agent',
      content: `Great! I've updated the project scope for "${scope.projectName}". I'm now ready to generate your case study with the defined parameters.`,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, scopeMessage])
  }

  const handleStartGeneration = async () => {
    if (!projectScope) return
    
    onStartGeneration?.()
    
    // Add user message indicating generation start
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: 'Generate case study',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])

    // Add agent response
    const agentMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'agent',
      content: `Starting case study generation for "${projectScope.projectName}"... I'll analyze your data and generate comprehensive insights.`,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, agentMessage])

    try {
      const request: CaseStudyGenerationRequest = {
        project_name: projectScope.projectName,
        project_industry: projectScope.industry || undefined,
        project_focus: projectScope.focus || undefined,
        date_range_start: new Date(projectScope.dateRange.start).toISOString(),
        date_range_end: new Date(projectScope.dateRange.end).toISOString(),
        participants: projectScope.participants,
        keywords: projectScope.keywords,
        template_type: 'comprehensive',
        model_name: 'gpt-4',
      }

      await caseStudyService.generateStreaming(
        request,
        (chunk) => {
          onStreamChunk?.(chunk)
        },
        (error) => {
          const errorMessage: Message = {
            id: Date.now().toString(),
            type: 'agent',
            content: `I encountered an error during generation: ${error}`,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, errorMessage])
        },
        () => {
          const completionMessage: Message = {
            id: Date.now().toString(),
            type: 'agent',
            content: 'Case study generation completed! You can review and edit the content in the canvas.',
            timestamp: new Date()
          }
          setMessages(prev => [...prev, completionMessage])
          onGenerationComplete?.()
        }
      )
    } catch (error) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'agent',
        content: `Failed to start generation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }

  const getAgentStatusIcon = () => {
    const status = agentStatus.toLowerCase()
    
    // Handle various analyzing/data processing states
    if (status.includes('analyzing') || status.includes('fetching') || status.includes('processing') || status.includes('connecting')) {
      return (
        <div className="relative">
          <Database className="w-4 h-4 text-blue-500 animate-data-analyze" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-data-pulse" />
        </div>
      )
    }
    
    // Handle writing states
    if (status.includes('writing') || status.includes('generating')) {
      return (
        <div className="flex items-center gap-1">
          <PenTool className="w-4 h-4 text-blue-500 animate-writing-flow" />
          <div className="flex gap-0.5">
            <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )
    }
    
    // Handle thinking/planning states
    if (status.includes('thinking') || status.includes('planning') || status.includes('insights')) {
      return <Brain className="w-4 h-4 text-blue-500 animate-thinking-glow" />
    }
    
    // Handle starting/initiating states
    if (status.includes('starting') || status.includes('initiating')) {
      return <Zap className="w-4 h-4 text-yellow-500 animate-pulse" />
    }
    
    // Ready state (default)
    if (status.includes('ready')) {
      return <div className="w-4 h-4 bg-green-500 rounded-full" />
    }
    
    // Fallback for other states
    return <div className="w-4 h-4 bg-gray-400 rounded-full animate-pulse" />
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  return (
    <div className="h-full bg-background border-r border-border flex flex-col">
      {/* Project Scope Header */}
      {projectScope ? (
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">Project Scope</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScopingModalOpen(true)}
              disabled={isGenerating}
            >
              <Settings className="w-4 h-4 mr-1" />
              Edit
            </Button>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {formatDate(projectScope.dateRange.start)} - {formatDate(projectScope.dateRange.end)}
              </span>
            </div>
            
            {projectScope.industry && (
              <div className="text-sm">
                <span className="text-muted-foreground">Industry: </span>
                <span className="text-foreground">{projectScope.industry}</span>
              </div>
            )}
            
            {projectScope.focus && (
              <div className="text-sm">
                <span className="text-muted-foreground">Focus: </span>
                <span className="text-foreground">{projectScope.focus}</span>
              </div>
            )}

            {projectScope.participants && Array.isArray(projectScope.participants) && projectScope.participants.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>Participants ({projectScope.participants.length})</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {projectScope.participants.slice(0, 3).map((participant) => (
                    <Badge key={participant} variant="outline" className="text-xs">
                      {participant}
                    </Badge>
                  ))}
                  {projectScope.participants.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{projectScope.participants.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {projectScope.keywords && Array.isArray(projectScope.keywords) && projectScope.keywords.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Hash className="w-4 h-4" />
                  <span>Keywords</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {projectScope.keywords.map((keyword) => (
                    <Badge key={keyword} variant="secondary" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {projectScope.folders && Array.isArray(projectScope.folders) && projectScope.folders.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FolderOpen className="w-4 h-4" />
                  <span>Folders</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {projectScope.folders.map((folder) => (
                    <Badge key={folder} variant="outline" className="text-xs">
                      {folder}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Generate Case Study Button */}
          <div className="mt-4 pt-4 border-t border-border">
            <Button
              onClick={handleStartGeneration}
              disabled={isGenerating}
              className="w-full"
            >
              <Play className="w-4 h-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Generate Case Study'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-6 border-b border-border">
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">No Project Scope Defined</h3>
              <p className="text-sm text-muted-foreground">
                Define your project scope to start generating case studies from your data.
              </p>
            </div>
            <Button
              onClick={() => setScopingModalOpen(true)}
              disabled={isGenerating}
              className="w-full"
            >
              <Eye className="w-4 h-4 mr-2" />
              Define Project Scope
            </Button>
          </div>
        </div>
      )}

      {/* Chat History */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <Card className={`max-w-[80%] p-4 ${
              message.type === 'user' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted'
            }`}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {message.type === 'user' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <span className={`text-xs mt-2 block ${
                    message.type === 'user' 
                      ? 'text-primary-foreground/75' 
                      : 'text-muted-foreground'
                  }`}>
                    {message.type === 'user' ? 'You' : 'Agent'} • {message.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Agent Status & Input */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 text-muted-foreground mb-4 transition-all duration-300 ease-in-out">
          <div className="transition-all duration-200 ease-in-out">
            {getAgentStatusIcon()}
          </div>
          <span className="text-sm transition-opacity duration-200 ease-in-out">
            Agent is {agentStatus.toLowerCase()}...
          </span>
        </div>

        {/* Message Input */}
        <div className="flex gap-2">
          <Input
            placeholder={isGenerating ? "Agent is working..." : "Type your message..."}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isGenerating}
            className="flex-1"
          />
          <Button 
            size="icon" 
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isGenerating}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Enhanced Project Scoping Modal */}
      <EnhancedProjectScopingModal
        open={scopingModalOpen}
        onOpenChange={setScopingModalOpen}
        onSubmit={handleScopeSubmit}
      />
    </div>
  )
}