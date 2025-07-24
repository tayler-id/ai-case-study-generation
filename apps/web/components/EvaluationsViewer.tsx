"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, MessageSquare, BarChart3, TrendingUp } from "lucide-react"

interface Evaluation {
  id: number
  case_study_id: number
  project_name: string
  accuracy_rating: number | null
  usefulness_rating: number | null
  comment: string | null
  evaluation_created_at: string
  case_study_created_at: string
}

interface EvaluationStats {
  total_evaluations: number
  average_accuracy: number
  average_usefulness: number
  accuracy_distribution: Record<number, number>
  usefulness_distribution: Record<number, number>
  has_comments: number
}

export function EvaluationsViewer() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [stats, setStats] = useState<EvaluationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001'
        
        // Fetch evaluations and stats in parallel
        const [evaluationsResponse, statsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/case-study/evaluations/all`, {
            credentials: 'include'
          }),
          fetch(`${API_BASE_URL}/case-study/evaluations/stats`, {
            credentials: 'include'
          })
        ])

        if (!evaluationsResponse.ok || !statsResponse.ok) {
          throw new Error('Failed to load evaluation data')
        }

        const evaluationsData = await evaluationsResponse.json()
        const statsData = await statsResponse.json()

        setEvaluations(evaluationsData)
        setStats(statsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load evaluations')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const renderStars = (rating: number | null, color: string = "text-yellow-400") => {
    if (!rating) return <span className="text-muted-foreground text-sm">Not rated</span>
    
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < rating ? `fill-current ${color}` : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-1 text-sm font-medium">{rating}/5</span>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-muted-foreground mb-4 animate-pulse mx-auto" />
          <p className="text-muted-foreground">Loading evaluations...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Evaluation Insights</h2>
          <p className="text-muted-foreground">View and analyze feedback on your case studies</p>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Evaluations</p>
                <p className="text-2xl font-bold">{stats.total_evaluations}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Star className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Accuracy</p>
                <p className="text-2xl font-bold">{stats.average_accuracy.toFixed(1)}/5</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Usefulness</p>
                <p className="text-2xl font-bold">{stats.average_usefulness.toFixed(1)}/5</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">With Comments</p>
                <p className="text-2xl font-bold">{stats.has_comments}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Evaluations List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Recent Evaluations</h3>
        
        {evaluations.length === 0 ? (
          <Card className="p-8 text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground mb-4 mx-auto" />
            <h3 className="text-lg font-medium text-foreground mb-2">No evaluations yet</h3>
            <p className="text-muted-foreground">
              Complete some case studies and submit evaluations to see insights here
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {evaluations.map((evaluation) => (
              <Card key={evaluation.id} className="p-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground">{evaluation.project_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Evaluated on {formatDate(evaluation.evaluation_created_at)}
                      </p>
                    </div>
                    <Badge variant="outline">
                      Case Study #{evaluation.case_study_id}
                    </Badge>
                  </div>

                  {/* Ratings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Accuracy Rating</p>
                      {renderStars(evaluation.accuracy_rating, "text-yellow-400")}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Usefulness Rating</p>
                      {renderStars(evaluation.usefulness_rating, "text-blue-400")}
                    </div>
                  </div>

                  {/* Comment */}
                  {evaluation.comment && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Comment</p>
                      <div className="bg-muted/50 rounded-md p-3">
                        <p className="text-sm text-foreground">{evaluation.comment}</p>
                      </div>
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