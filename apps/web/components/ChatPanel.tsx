"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader, Send, Bot, User, Calendar, Users, Hash, FolderOpen } from "lucide-react"
import { ProjectScope } from "@/components/ProjectScopingModal"

interface Message {
  id: string
  type: 'user' | 'agent'
  content: string
  timestamp: Date
}

interface ChatPanelProps {
  projectScope?: ProjectScope
  onSendMessage?: (message: string) => void
  isGenerating?: boolean
  agentStatus?: string
}

export function ChatPanel({ 
  projectScope, 
  onSendMessage, 
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

  const getAgentStatusIcon = () => {
    switch (agentStatus.toLowerCase()) {
      case 'analyzing':
        return <Loader className="w-4 h-4 animate-spin" />
      case 'writing':
        return <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse" />
      case 'thinking':
        return <div className="flex gap-1">
          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      default:
        return <div className="w-4 h-4 bg-green-500 rounded-full" />
    }
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
      {projectScope && (
        <div className="p-6 border-b border-border">
          <h3 className="font-semibold text-foreground mb-3">Project Scope</h3>
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

            {projectScope.participants.length > 0 && (
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

            {projectScope.keywords.length > 0 && (
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

            {projectScope.folders.length > 0 && (
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
        <div className="flex items-center gap-3 text-muted-foreground mb-4">
          {getAgentStatusIcon()}
          <span className="text-sm">
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
    </div>
  )
}