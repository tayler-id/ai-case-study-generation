/**
 * Data Preview Components
 * Display fetched emails and documents from Gmail and Google Drive
 */

"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Mail, 
  HardDrive, 
  Calendar, 
  Users, 
  ExternalLink, 
  FileText, 
  Eye, 
  EyeOff,
  ChevronDown,
  ChevronRight,
  Paperclip,
  User
} from "lucide-react"
import { DataFetchResponse } from "@/services/dataService"

interface DataPreviewProps {
  data: DataFetchResponse
  projectName: string
}

export function DataPreview({ data, projectName }: DataPreviewProps) {
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set())
  const [showFullContent, setShowFullContent] = useState<Set<string>>(new Set())

  const toggleEmailExpanded = (emailId: string) => {
    const newExpanded = new Set(expandedEmails)
    if (newExpanded.has(emailId)) {
      newExpanded.delete(emailId)
    } else {
      newExpanded.add(emailId)
    }
    setExpandedEmails(newExpanded)
  }

  const toggleFullContent = (emailId: string) => {
    const newShowFull = new Set(showFullContent)
    if (newShowFull.has(emailId)) {
      newShowFull.delete(emailId)
    } else {
      newShowFull.add(emailId)
    }
    setShowFullContent(newShowFull)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const truncateText = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  const gmailData = data.data.gmail
  const driveData = data.data.drive

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {projectName} - Data Summary
          </CardTitle>
          <CardDescription>
            Fetched on {formatDate(data.metadata.fetch_timestamp || new Date().toISOString())}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {gmailData && (
              <>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{gmailData.metadata.total_emails}</div>
                  <div className="text-sm text-muted-foreground">Emails</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{gmailData.metadata.total_threads}</div>
                  <div className="text-sm text-muted-foreground">Conversations</div>
                </div>
              </>
            )}
            {driveData && (
              <>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{driveData.metadata.total_documents}</div>
                  <div className="text-sm text-muted-foreground">Documents</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {Object.keys(driveData.metadata.file_types || {}).length}
                  </div>
                  <div className="text-sm text-muted-foreground">File Types</div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Tabs */}
      <Tabs defaultValue={gmailData ? "gmail" : "drive"} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          {gmailData && (
            <TabsTrigger value="gmail" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Gmail ({gmailData.metadata.total_emails})
            </TabsTrigger>
          )}
          {driveData && (
            <TabsTrigger value="drive" className="flex items-center gap-2">
              <HardDrive className="w-4 h-4" />
              Drive ({driveData.metadata.total_documents})
            </TabsTrigger>
          )}
        </TabsList>

        {/* Gmail Content */}
        {gmailData && (
          <TabsContent value="gmail" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {gmailData.emails.map((email: any) => (
                <Card key={email.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleEmailExpanded(email.id)}
                            className="p-0 h-auto"
                          >
                            {expandedEmails.has(email.id) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </Button>
                          {email.subject}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {email.sender}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(email.date)}
                            </div>
                            {email.attachments.length > 0 && (
                              <div className="flex items-center gap-1">
                                <Paperclip className="w-3 h-3" />
                                {email.attachments.length} attachments
                              </div>
                            )}
                          </div>
                        </CardDescription>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {email.labels.slice(0, 3).map((label: string) => (
                          <Badge key={label} variant="outline" className="text-xs">
                            {label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                  
                  {expandedEmails.has(email.id) && (
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <div className="text-sm text-muted-foreground bg-gray-50 p-3 rounded">
                          {email.snippet}
                        </div>
                        
                        {email.body_text && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-sm font-medium">Email Content</label>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleFullContent(email.id)}
                                className="text-xs"
                              >
                                {showFullContent.has(email.id) ? (
                                  <>
                                    <EyeOff className="w-3 h-3 mr-1" />
                                    Show Less
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-3 h-3 mr-1" />
                                    Show More
                                  </>
                                )}
                              </Button>
                            </div>
                            <div className="text-sm bg-white border p-3 rounded max-h-60 overflow-y-auto">
                              {showFullContent.has(email.id) ? 
                                email.body_text : 
                                truncateText(email.body_text)
                              }
                            </div>
                          </div>
                        )}

                        {email.attachments.length > 0 && (
                          <div>
                            <label className="text-sm font-medium mb-2 block">Attachments</label>
                            <div className="space-y-1">
                              {email.attachments.map((attachment: any, index: number) => (
                                <div key={index} className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded">
                                  <Paperclip className="w-4 h-4" />
                                  <span className="flex-1">{attachment.filename}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {Math.round(attachment.size / 1024)}KB
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>
        )}

        {/* Drive Content */}
        {driveData && (
          <TabsContent value="drive" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {driveData.documents.map((doc: any) => (
                <Card key={doc.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          {doc.name}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          <div className="flex items-center gap-4 text-sm">
                            <Badge variant="outline" className="text-xs">
                              {doc.file_type}
                            </Badge>
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {doc.owners.join(", ")}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(doc.modified_time)}
                            </div>
                            {doc.size && (
                              <span>{Math.round(doc.size / 1024)}KB</span>
                            )}
                          </div>
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.shared && (
                          <Badge variant="secondary" className="text-xs">
                            Shared
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(doc.web_view_link, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {doc.content_preview && (
                    <CardContent className="pt-0">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Content Preview</label>
                        <div className="text-sm bg-gray-50 p-3 rounded border max-h-32 overflow-y-auto">
                          {doc.content_preview}
                        </div>
                      </div>
                    </CardContent>
                  )}

                  {doc.description && (
                    <CardContent className="pt-0">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Description</label>
                        <div className="text-sm text-muted-foreground">
                          {doc.description}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Metadata Footer */}
      {data.metadata && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Fetch Metadata</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {data.metadata.sources_fetched && (
                <div>
                  <label className="font-medium">Sources Fetched</label>
                  <div className="text-muted-foreground">
                    {data.metadata.sources_fetched.join(", ")}
                  </div>
                </div>
              )}
              {data.metadata.total_items_fetched && (
                <div>
                  <label className="font-medium">Total Items</label>
                  <div className="text-muted-foreground">
                    {data.metadata.total_items_fetched}
                  </div>
                </div>
              )}
              <div>
                <label className="font-medium">Fetch Time</label>
                <div className="text-muted-foreground">
                  {formatDate(data.metadata.fetch_timestamp)}
                </div>
              </div>
              {data.errors && data.errors.length > 0 && (
                <div>
                  <label className="font-medium text-red-600">Errors</label>
                  <div className="text-red-600 text-xs">
                    {data.errors.join("; ")}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default DataPreview