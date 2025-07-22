"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Calendar, Users, FolderOpen, Hash, X } from "lucide-react"

interface ProjectScopingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (scope: ProjectScope) => void
}

export interface ProjectScope {
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

export function ProjectScopingModal({ open, onOpenChange, onSubmit }: ProjectScopingModalProps) {
  const [scope, setScope] = useState<ProjectScope>({
    dateRange: { start: "", end: "" },
    participants: [],
    keywords: [],
    folders: [],
    industry: "",
    focus: ""
  })

  const [newParticipant, setNewParticipant] = useState("")
  const [newKeyword, setNewKeyword] = useState("")
  const [newFolder, setNewFolder] = useState("")

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

  const addFolder = () => {
    if (newFolder.trim() && !scope.folders.includes(newFolder.trim())) {
      setScope(prev => ({
        ...prev,
        folders: [...prev.folders, newFolder.trim()]
      }))
      setNewFolder("")
    }
  }

  const removeFolder = (folder: string) => {
    setScope(prev => ({
      ...prev,
      folders: prev.folders.filter(f => f !== folder)
    }))
  }

  const handleSubmit = () => {
    onSubmit(scope)
    onOpenChange(false)
  }

  const isValid = scope.dateRange.start && scope.dateRange.end && 
                  (scope.participants.length > 0 || scope.keywords.length > 0 || scope.folders.length > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Define Project Scope</DialogTitle>
          <DialogDescription>
            Set the boundaries for your case study by defining the data sources and filters.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
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

          {/* Folders */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              <label className="text-sm font-medium">Drive Folders</label>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add folder path..."
                value={newFolder}
                onChange={(e) => setNewFolder(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addFolder()}
              />
              <Button onClick={addFolder} variant="outline">Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {scope.folders.map((folder) => (
                <Badge key={folder} variant="secondary" className="flex items-center gap-1">
                  {folder}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => removeFolder(folder)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid}>
            Begin Analysis
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}