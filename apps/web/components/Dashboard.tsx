"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Calendar, Users, FileText, Clock, AlertCircle } from "lucide-react"
import { ConnectionStatus } from "@/components/ConnectionStatus"
import { caseStudyService, CaseStudyResponse } from "@/services/caseStudyService"

interface DashboardProps {
  onSelectStudy: (study: CaseStudyResponse) => void
}

export function Dashboard({ onSelectStudy }: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending' | 'generating' | 'failed'>('all')
  const [studies, setStudies] = useState<CaseStudyResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
                className="p-6 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onSelectStudy(study)}
              >
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-foreground line-clamp-2">{study.project_name}</h3>
                    <Badge className={getStatusColor(study.status)}>
                      {study.status}
                    </Badge>
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
    </div>
  )
}