"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Calendar, Users, FileText, Clock, AlertCircle, MoreVertical, Trash2 } from "lucide-react"
import { ConnectionStatus } from "@/components/ConnectionStatus"
import { caseStudyService, CaseStudyResponse } from "@/services/caseStudyService"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import * as AlertDialog from "@radix-ui/react-alert-dialog"

interface DashboardProps {
  onSelectStudy: (study: CaseStudyResponse) => void
}

export function Dashboard({ onSelectStudy }: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending' | 'generating' | 'failed'>('all')
  const [studies, setStudies] = useState<CaseStudyResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [studyToDelete, setStudyToDelete] = useState<CaseStudyResponse | null>(null)

  // Fetch case studies from API
  useEffect(() => {
    const fetchStudies = async () => {
      try {
        setLoading(true)
        setError(null)
        const fetchedStudies = await caseStudyService.listCaseStudies()
        setStudies(fetchedStudies)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load case studies')
      } finally {
        setLoading(false)
      }
    }

    fetchStudies()
  }, [])

  const handleDeleteClick = (study: CaseStudyResponse, e: React.MouseEvent) => {
    e.stopPropagation()
    setStudyToDelete(study)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!studyToDelete) return
    
    try {
      setDeletingId(studyToDelete.id)
      await caseStudyService.deleteCaseStudy(studyToDelete.id)
      setStudies(prev => prev.filter(s => s.id !== studyToDelete.id))
      setDeleteConfirmOpen(false)
      setStudyToDelete(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete case study')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false)
    setStudyToDelete(null)
  }

  const filteredStudies = studies.filter(study => {
    const matchesSearch = study.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (study.executive_summary && study.executive_summary.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesFilter = filterStatus === 'all' || study.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'generating': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'pending': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'cancelled': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }


  return (
    <div className="h-full bg-background flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Manage and review your case studies</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="w-4 h-4" />
            <span>{studies.length} studies</span>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search studies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'completed', 'generating', 'pending', 'failed'] as const).map((status) => (
              <Button
                key={status}
                variant={filterStatus === status ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus(status)}
                className="capitalize"
              >
                {status === 'all' ? 'All' : status}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="p-6 border-b border-border">
        <ConnectionStatus onConnectionChange={(service, status) => {
          console.log(`${service} connection status changed to: ${status}`)
        }} />
      </div>

      {/* Studies Grid */}
      <div className="flex-1 p-6 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Clock className="w-12 h-12 text-muted-foreground mb-4 animate-spin" />
            <h3 className="text-lg font-medium text-foreground mb-2">Loading case studies...</h3>
            <p className="text-muted-foreground">Fetching your data from the server</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Error loading case studies</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
            >
              Retry
            </Button>
          </div>
        ) : filteredStudies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No studies found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Try adjusting your search terms' : 'Create your first case study to get started'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredStudies.map((study) => (
              <Card
                key={study.id}
                className="p-6 cursor-pointer hover:shadow-md transition-shadow relative"
                onClick={() => onSelectStudy(study)}
              >
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-foreground line-clamp-2">{study.project_name}</h3>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(study.status)}>
                        {study.status}
                      </Badge>
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-muted"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content
                            className="min-w-[160px] bg-background border border-border rounded-md p-1 shadow-lg z-50"
                            align="end"
                          >
                            <DropdownMenu.Item
                              className="flex items-center gap-2 px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 rounded cursor-pointer outline-none"
                              onClick={(e) => handleDeleteClick(study, e)}
                              disabled={deletingId === study.id}
                            >
                              <Trash2 className="h-4 w-4" />
                              {deletingId === study.id ? 'Deleting...' : 'Delete'}
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    </div>
                  </div>

                  {/* Summary */}
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {study.executive_summary || 'Case study analysis in progress...'}
                  </p>

                  {/* Metadata */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="w-3 h-3" />
                      <span>{study.template_type} template</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>Created {new Date(study.created_at).toLocaleDateString()}</span>
                    </div>
                    {study.status === 'generating' && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse" />
                        <span>{study.progress_percentage}% complete</span>
                      </div>
                    )}
                  </div>

                  {/* Key Insights Preview */}
                  {study.key_insights && study.key_insights.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {study.key_insights.slice(0, 2).map((insight, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {insight.substring(0, 30)}...
                        </Badge>
                      ))}
                      {study.key_insights.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{study.key_insights.length - 2} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog.Root open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background border border-border rounded-lg p-6 shadow-lg z-50">
            <AlertDialog.Title className="text-lg font-semibold text-foreground mb-2">
              Delete Case Study
            </AlertDialog.Title>
            <AlertDialog.Description className="text-muted-foreground mb-4">
              Are you sure you want to delete "{studyToDelete?.project_name}"? This action cannot be undone and will permanently remove the case study and all associated data.
            </AlertDialog.Description>
            <div className="flex justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <Button variant="outline" onClick={handleDeleteCancel}>
                  Cancel
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteConfirm}
                  disabled={deletingId !== null}
                >
                  {deletingId ? 'Deleting...' : 'Delete'}
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  )
}