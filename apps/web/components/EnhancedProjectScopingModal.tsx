/**
 * Enhanced Project Scoping Modal
 * Connects to real data APIs to show previews and validate project scope
 */

"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Calendar, 
  Users, 
  Hash, 
  X, 
  Mail, 
  HardDrive, 
  Eye, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Clock
} from "lucide-react"
import { dataService, type ProjectScopeRequest, type DataPreview, type ConnectionHealth } from "@/services/dataService"

interface EnhancedProjectScopingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (scope: ProjectScope, previewData?: DataPreview) => void
}

export interface ProjectScope {
  projectName: string
  dateRange: {
    start: string
    end: string
  }
  participants: string[]
  keywords: string[]
  industry: string
  focus: string
}

export function EnhancedProjectScopingModal({ open, onOpenChange, onSubmit }: EnhancedProjectScopingModalProps) {
  const [scope, setScope] = useState<ProjectScope>({
    projectName: "",
    dateRange: { start: "", end: "" },
    participants: [],
    keywords: [],
    industry: "",
    focus: ""
  })

  const [newParticipant, setNewParticipant] = useState("")
  const [newKeyword, setNewKeyword] = useState("")
  const [connectionHealth, setConnectionHealth] = useState<ConnectionHealth | null>(null)
  const [previewData, setPreviewData] = useState<DataPreview | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isLoadingHealth, setIsLoadingHealth] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  // Load connection health when modal opens
  useEffect(() => {
    if (open) {
      loadConnectionHealth()
    }
  }, [open])

  // Auto-preview when scope changes (debounced)
  useEffect(() => {
    if (!isValidForPreview()) return

    const timeoutId = setTimeout(() => {
      loadPreview()
    }, 1000) // Debounce by 1 second

    return () => clearTimeout(timeoutId)
  }, [scope.keywords, scope.participants, scope.dateRange])

  const loadConnectionHealth = async () => {
    setIsLoadingHealth(true)
    try {
      const health = await dataService.checkConnectionsHealth()
      setConnectionHealth(health)
    } catch (error) {
      console.error('Failed to load connection health:', error)
    } finally {
      setIsLoadingHealth(false)
    }
  }

  const loadPreview = async () => {
    if (!isValidForPreview()) return

    setIsLoadingPreview(true)
    setPreviewError(null)
    try {
      const preview = await dataService.previewProjectData({
        project_name: scope.projectName || "Untitled Project",
        keywords: scope.keywords,
        participant_emails: scope.participants,
        start_date: new Date(scope.dateRange.start).toISOString(),
        end_date: new Date(scope.dateRange.end).toISOString(),
        max_results: 10
      })
      setPreviewData(preview)
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Failed to load preview')
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const addParticipant = () => {
    if (newParticipant.trim() && !scope.participants.includes(newParticipant.trim())) {
      setScope(prev => ({
        ...prev,
        participants: [...prev.participants, newParticipant.trim()]
      }))
      setNewParticipant("")
    }
  }

  const removeParticipant = (participant: string) => {
    setScope(prev => ({
      ...prev,
      participants: prev.participants.filter(p => p !== participant)
    }))
  }

  const addKeyword = () => {
    if (newKeyword.trim() && !scope.keywords.includes(newKeyword.trim())) {
      setScope(prev => ({
        ...prev,
        keywords: [...prev.keywords, newKeyword.trim()]
      }))
      setNewKeyword("")
    }
  }

  const removeKeyword = (keyword: string) => {
    setScope(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword)
    }))
  }

  const isValidForPreview = () => {
    return scope.dateRange.start && scope.dateRange.end && 
           (scope.participants.length > 0 || scope.keywords.length > 0)
  }

  const isValidForSubmit = () => {
    return isValidForPreview() && scope.projectName.trim()
  }

  const handleSubmit = () => {
    if (!isValidForSubmit()) return
    onSubmit(scope, previewData || undefined)
    onOpenChange(false)
  }

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'degraded': return <AlertCircle className="w-4 h-4 text-yellow-600" />
      case 'no_connections': return <AlertCircle className="w-4 h-4 text-gray-400" />
      default: return <AlertCircle className="w-4 h-4 text-red-600" />
    }
  }

  const getHealthStatus = (health: string) => {
    switch (health) {
      case 'healthy': return 'All connections healthy'
      case 'degraded': return 'Some connections have issues'
      case 'no_connections': return 'No data sources connected'
      default: return 'Connection error'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Define Project Scope</DialogTitle>
          <DialogDescription>
            Set the boundaries for your case study and preview available data from connected sources.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Project Definition */}
          <div className="lg:col-span-2 space-y-6">
            {/* Project Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Project Name</label>
              <Input
                placeholder="Enter project name..."
                value={scope.projectName}
                onChange={(e) => setScope(prev => ({ ...prev, projectName: e.target.value }))}
              />
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <label className="text-sm font-medium">Date Range</label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Start Date</label>
                  <Input
                    type="date"
                    value={scope.dateRange.start}
                    onChange={(e) => setScope(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, start: e.target.value }
                    }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">End Date</label>
                  <Input
                    type="date"
                    value={scope.dateRange.end}
                    onChange={(e) => setScope(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, end: e.target.value }
                    }))}
                  />
                </div>
              </div>
            </div>

            {/* Industry & Focus */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Industry</label>
                <Input
                  placeholder="e.g., Technology, Healthcare"
                  value={scope.industry}
                  onChange={(e) => setScope(prev => ({ ...prev, industry: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Focus Area</label>
                <Input
                  placeholder="e.g., Product Launch, Marketing Campaign"
                  value={scope.focus}
                  onChange={(e) => setScope(prev => ({ ...prev, focus: e.target.value }))}
                />
              </div>
            </div>

            {/* Participants */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <label className="text-sm font-medium">Participants</label>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add participant email..."
                  value={newParticipant}
                  onChange={(e) => setNewParticipant(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addParticipant()}
                />
                <Button onClick={addParticipant} variant="outline">Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {scope.participants.map((participant) => (
                  <Badge key={participant} variant="secondary" className="flex items-center gap-1">
                    {participant}
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => removeParticipant(participant)}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            {/* Keywords */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4" />
                <label className="text-sm font-medium">Keywords</label>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add keyword..."
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                />
                <Button onClick={addKeyword} variant="outline">Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {scope.keywords.map((keyword) => (
                  <Badge key={keyword} variant="secondary" className="flex items-center gap-1">
                    {keyword}
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => removeKeyword(keyword)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Connection Health & Preview */}
          <div className="space-y-4">
            {/* Connection Health */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  {isLoadingHealth ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : connectionHealth ? (
                    getHealthIcon(connectionHealth.overall_health)
                  ) : (
                    <AlertCircle className="w-4 h-4 text-gray-400" />
                  )}
                  Data Sources
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {isLoadingHealth ? (
                  <div className="text-sm text-muted-foreground">Checking connections...</div>
                ) : connectionHealth ? (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">
                      {getHealthStatus(connectionHealth.overall_health)}
                    </div>
                    
                    {/* Gmail Status */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3" />
                        Gmail
                      </div>
                      <Badge variant={connectionHealth.services.gmail.connected ? "default" : "secondary"} className="text-xs">
                        {connectionHealth.services.gmail.connected ? "Connected" : "Disconnected"}
                      </Badge>
                    </div>

                    {/* Drive Status */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-3 h-3" />
                        Google Drive
                      </div>
                      <Badge variant={connectionHealth.services.drive.connected ? "default" : "secondary"} className="text-xs">
                        {connectionHealth.services.drive.connected ? "Connected" : "Disconnected"}
                      </Badge>
                    </div>

                    {connectionHealth.issues && connectionHealth.issues.length > 0 && (
                      <div className="mt-2 p-2 bg-yellow-50 rounded text-xs text-yellow-800">
                        {connectionHealth.issues.join(", ")}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Unable to check connections</div>
                )}
              </CardContent>
            </Card>

            {/* Data Preview */}
            {isValidForPreview() && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Eye className="w-4 h-4" />
                    Data Preview
                    {isLoadingPreview && <Loader2 className="w-4 h-4 animate-spin" />}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Live preview of available data
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {isLoadingPreview ? (
                    <div className="text-sm text-muted-foreground">Loading preview...</div>
                  ) : previewError ? (
                    <div className="text-xs text-red-600">{previewError}</div>
                  ) : previewData ? (
                    <div className="space-y-3">
                      {/* Sources Available */}
                      <div>
                        <div className="text-xs font-medium mb-1">Available Sources</div>
                        <div className="flex gap-1">
                          {previewData.available_sources.map(source => (
                            <Badge key={source} variant="outline" className="text-xs">
                              {source === 'gmail' ? (
                                <>
                                  <Mail className="w-3 h-3 mr-1" />
                                  Gmail
                                </>
                              ) : (
                                <>
                                  <HardDrive className="w-3 h-3 mr-1" />
                                  Drive
                                </>
                              )}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Gmail Preview */}
                      {previewData.estimated_results.gmail && (
                        <div>
                          <div className="text-xs font-medium mb-1">Gmail Sample</div>
                          <div className="text-xs text-muted-foreground mb-1">
                            {previewData.estimated_results.gmail.sample_count} emails found
                          </div>
                          <div className="space-y-1">
                            {previewData.estimated_results.gmail.sample_subjects.slice(0, 3).map((subject, i) => (
                              <div key={i} className="text-xs bg-gray-50 p-1 rounded truncate">
                                {subject}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Drive Preview */}
                      {previewData.estimated_results.drive && (
                        <div>
                          <div className="text-xs font-medium mb-1">Drive Sample</div>
                          <div className="text-xs text-muted-foreground mb-1">
                            {previewData.estimated_results.drive.sample_count} documents found
                          </div>
                          <div className="space-y-1">
                            {previewData.estimated_results.drive.sample_files.slice(0, 3).map((file, i) => (
                              <div key={i} className="text-xs bg-gray-50 p-1 rounded truncate flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                {file}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Updated {new Date(previewData.preview_timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      No preview available
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValidForSubmit()}>
            Begin Analysis
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}