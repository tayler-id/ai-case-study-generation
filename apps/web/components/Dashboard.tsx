"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Calendar, Users, Star, FileText, Clock } from "lucide-react"

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
}

interface DashboardProps {
  onSelectStudy: (study: CaseStudy) => void
}

export function Dashboard({ onSelectStudy }: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'in-progress' | 'draft'>('all')

  // Mock data - in real app this would come from API
  const [studies] = useState<CaseStudy[]>([
    {
      id: '1',
      title: 'Q2 Product Launch Analysis',
      dateCreated: '2024-07-15',
      dateRange: { start: '2024-04-01', end: '2024-06-30' },
      participants: ['john@company.com', 'sarah@company.com', 'mike@company.com'],
      keywords: ['product launch', 'marketing', 'user acquisition'],
      rating: 5,
      status: 'completed',
      summary: 'Comprehensive analysis of Q2 product launch performance, including user acquisition metrics and retention rates.'
    },
    {
      id: '2',
      title: 'Marketing Campaign Retrospective',
      dateCreated: '2024-07-10',
      dateRange: { start: '2024-05-01', end: '2024-06-15' },
      participants: ['lisa@company.com', 'tom@company.com'],
      keywords: ['marketing', 'campaign', 'social media'],
      rating: 4,
      status: 'completed',
      summary: 'Analysis of social media marketing campaign effectiveness and ROI across multiple channels.'
    },
    {
      id: '3',
      title: 'Customer Support Process Review',
      dateCreated: '2024-07-08',
      dateRange: { start: '2024-06-01', end: '2024-06-30' },
      participants: ['anna@company.com', 'david@company.com'],
      keywords: ['customer support', 'process improvement', 'satisfaction'],
      rating: 0,
      status: 'in-progress',
      summary: 'Ongoing review of customer support processes and satisfaction metrics for June 2024.'
    }
  ])

  const filteredStudies = studies.filter(study => {
    const matchesSearch = study.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         study.keywords.some(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesFilter = filterStatus === 'all' || study.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'in-progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating 
            ? 'fill-yellow-400 text-yellow-400' 
            : 'text-gray-300 dark:text-gray-600'
        }`}
      />
    ))
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
            {(['all', 'completed', 'in-progress', 'draft'] as const).map((status) => (
              <Button
                key={status}
                variant={filterStatus === status ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus(status)}
                className="capitalize"
              >
                {status === 'all' ? 'All' : status.replace('-', ' ')}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Studies Grid */}
      <div className="flex-1 p-6 overflow-y-auto">
        {filteredStudies.length === 0 ? (
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
                    <h3 className="font-semibold text-foreground line-clamp-2">{study.title}</h3>
                    <Badge className={getStatusColor(study.status)}>
                      {study.status.replace('-', ' ')}
                    </Badge>
                  </div>

                  {/* Summary */}
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {study.summary}
                  </p>

                  {/* Metadata */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{study.dateRange.start} - {study.dateRange.end}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="w-3 h-3" />
                      <span>{study.participants.length} participants</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>Created {new Date(study.dateCreated).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Keywords */}
                  <div className="flex flex-wrap gap-1">
                    {study.keywords.slice(0, 3).map((keyword) => (
                      <Badge key={keyword} variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                    {study.keywords.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{study.keywords.length - 3}
                      </Badge>
                    )}
                  </div>

                  {/* Rating */}
                  {study.status === 'completed' && (
                    <div className="flex items-center gap-1">
                      {renderStars(study.rating)}
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