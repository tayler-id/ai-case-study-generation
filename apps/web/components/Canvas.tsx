"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Star } from "lucide-react"
import { Edit3, Eye, Save, Download } from "lucide-react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface CanvasProps {
  content?: string
  isGenerating?: boolean
  onContentChange?: (content: string) => void
  onSave?: (content: string) => void
  title?: string
  streamingContent?: string
  isStreaming?: boolean
}

export function Canvas({ 
  content = "", 
  isGenerating = false, 
  onContentChange, 
  onSave,
  title = "Case Study Analysis",
  streamingContent = "",
  isStreaming = false
}: CanvasProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [markdownContent, setMarkdownContent] = useState(content)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)

  // Initialize content from props
  useEffect(() => {
    setMarkdownContent(content)
  }, [content])

  // Handle streaming content updates
  useEffect(() => {
    if (isStreaming && streamingContent) {
      setMarkdownContent(streamingContent)
    }
  }, [streamingContent, isStreaming])

  // Preserve streaming content when streaming stops
  useEffect(() => {
    if (!isStreaming && streamingContent) {
      setMarkdownContent(streamingContent)
      onContentChange?.(streamingContent)
    }
  }, [isStreaming, streamingContent])

  const handleSave = () => {
    setIsEditing(false)
    onContentChange?.(markdownContent)
    onSave?.(markdownContent)
  }

  const handleDownload = () => {
    const blob = new Blob([markdownContent], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.toLowerCase().replace(/\s+/g, '-')}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleRating = (value: number) => {
    setRating(value)
  }

  return (
    <div className="h-full bg-background flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground">
              {isStreaming ? "AI is writing your case study..." : 
               isGenerating ? "AI is generating your case study..." : "Generated case study"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isGenerating && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="gap-2"
                >
                  {isEditing ? (
                    <>
                      <Eye className="w-4 h-4" />
                      Preview
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-4 h-4" />
                      Edit
                    </>
                  )}
                </Button>
                {isEditing && (
                  <Button
                    size="sm"
                    onClick={handleSave}
                    className="gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {isEditing ? (
          <div className="h-full p-6">
            <Textarea
              value={markdownContent}
              onChange={(e) => setMarkdownContent(e.target.value)}
              className="h-full resize-none font-mono text-sm"
              placeholder="Write your case study in Markdown..."
            />
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            <div className="p-6">
              {isStreaming ? (
                <div className="space-y-4">
                  {/* Real-time streaming content */}
                  {markdownContent ? (
                    <div className="markdown-content streaming">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {markdownContent}
                      </ReactMarkdown>
                      {/* Typing cursor animation */}
                      <span className="inline-block w-0.5 h-4 bg-blue-500 animate-pulse ml-1"></span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-sm">AI is analyzing your data and starting to write...</span>
                    </div>
                  )}
                </div>
              ) : isGenerating ? (
                <div className="space-y-4">
                  <div className="animate-pulse-slow">
                    <div className="h-8 bg-muted rounded w-3/4 mb-4"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-full"></div>
                      <div className="h-4 bg-muted rounded w-5/6"></div>
                      <div className="h-4 bg-muted rounded w-4/5"></div>
                    </div>
                  </div>
                  <div className="animate-pulse-slow">
                    <div className="h-6 bg-muted rounded w-1/2 mb-3"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-full"></div>
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                    </div>
                  </div>
                </div>
              ) : markdownContent ? (
                <div className="markdown-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {markdownContent}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mb-4">
                    <Edit3 className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">No content yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start a new case study analysis to see content here
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer - Rating Section */}
      {!isGenerating && !isStreaming && markdownContent && (
        <div className="p-6 border-t border-border">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-foreground mb-1">Rate this case study</h4>
                <p className="text-sm text-muted-foreground">
                  Help us improve by rating the accuracy and usefulness
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Accuracy:</span>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 cursor-pointer transition-colors ${
                          i < (hoverRating || rating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300 hover:text-yellow-400'
                        }`}
                        onMouseEnter={() => setHoverRating(i + 1)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => handleRating(i + 1)}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Usefulness:</span>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 cursor-pointer transition-colors ${
                          i < (hoverRating || rating)
                            ? 'fill-blue-400 text-blue-400'
                            : 'text-gray-300 hover:text-blue-400'
                        }`}
                        onMouseEnter={() => setHoverRating(i + 1)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => handleRating(i + 1)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}