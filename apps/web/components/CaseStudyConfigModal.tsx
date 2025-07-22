/**
 * Case Study Configuration Modal
 * Configure generation settings like model, template, and custom instructions
 */

"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { 
  Settings,
  Zap,
  Brain,
  Lightbulb,
  Target,
  FileText,
  Clock,
  DollarSign,
  Sparkles
} from "lucide-react"
import { caseStudyService } from "@/services/caseStudyService"

interface GenerationConfig {
  template_type: 'comprehensive' | 'technical' | 'marketing' | 'product'
  model_name: 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3-sonnet' | 'claude-3-haiku'
  custom_instructions?: string
}

interface CaseStudyConfigModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: GenerationConfig
  onSubmit: (config: GenerationConfig) => void
}

interface ModelInfo {
  name: string
  displayName: string
  provider: string
  speed: 'fast' | 'medium' | 'slow'
  quality: 'high' | 'medium' | 'standard'
  cost: 'low' | 'medium' | 'high'
  description: string
  icon: React.ComponentType<any>
}

interface TemplateInfo {
  value: string
  label: string
  description: string
  icon: React.ComponentType<any>
  focus: string[]
}

const modelInfos: ModelInfo[] = [
  {
    name: 'gpt-4',
    displayName: 'GPT-4',
    provider: 'OpenAI',
    speed: 'slow',
    quality: 'high',
    cost: 'high',
    description: 'Most capable model with excellent reasoning and comprehensive analysis',
    icon: Sparkles
  },
  {
    name: 'gpt-3.5-turbo',
    displayName: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    speed: 'fast',
    quality: 'medium',
    cost: 'low',
    description: 'Fast and cost-effective with good general performance',
    icon: Zap
  },
  {
    name: 'claude-3-sonnet',
    displayName: 'Claude 3 Sonnet',
    provider: 'Anthropic',
    speed: 'medium',
    quality: 'high',
    cost: 'medium',
    description: 'Balanced performance with strong analytical capabilities',
    icon: Brain
  },
  {
    name: 'claude-3-haiku',
    displayName: 'Claude 3 Haiku',
    provider: 'Anthropic',
    speed: 'fast',
    quality: 'medium',
    cost: 'low',
    description: 'Fastest Claude model optimized for quick responses',
    icon: Zap
  }
]

const templateInfos: TemplateInfo[] = [
  {
    value: 'comprehensive',
    label: 'Comprehensive Analysis',
    description: 'Complete analysis covering all aspects of the project lifecycle',
    icon: FileText,
    focus: [
      'Executive Summary',
      'Project Background',
      'Stakeholder Analysis', 
      'Timeline & Milestones',
      'Communication Patterns',
      'Decision Points',
      'Outcomes & Results',
      'Lessons Learned',
      'Best Practices'
    ]
  },
  {
    value: 'technical',
    label: 'Technical Focus',
    description: 'Deep dive into technical decisions, architecture, and development processes',
    icon: Settings,
    focus: [
      'Technical Architecture',
      'Development Process',
      'Technology Stack',
      'Technical Challenges',
      'Code Quality & Testing',
      'Performance Optimization',
      'Technical Debt'
    ]
  },
  {
    value: 'marketing',
    label: 'Marketing Focus', 
    description: 'Analysis of marketing strategies, campaigns, and growth initiatives',
    icon: Target,
    focus: [
      'Marketing Strategy',
      'Campaign Performance',
      'Audience Analysis',
      'Growth Metrics',
      'Content Strategy',
      'Channel Effectiveness',
      'ROI Analysis'
    ]
  },
  {
    value: 'product',
    label: 'Product Focus',
    description: 'Product development insights, user feedback, and feature evolution',
    icon: Lightbulb,
    focus: [
      'Product Vision',
      'Feature Development',
      'User Feedback Analysis',
      'Product-Market Fit',
      'User Experience',
      'Product Metrics',
      'Iteration Process'
    ]
  }
]

export function CaseStudyConfigModal({ 
  open, 
  onOpenChange, 
  config, 
  onSubmit 
}: CaseStudyConfigModalProps) {
  const [localConfig, setLocalConfig] = useState<GenerationConfig>(config)
  const [availableModels, setAvailableModels] = useState<string[]>([])

  useEffect(() => {
    setLocalConfig(config)
  }, [config])

  useEffect(() => {
    if (open) {
      loadAvailableModels()
    }
  }, [open])

  const loadAvailableModels = async () => {
    try {
      const models = await caseStudyService.getAvailableModels()
      setAvailableModels(models)
    } catch (error) {
      console.error('Failed to load available models:', error)
    }
  }

  const handleSubmit = () => {
    onSubmit(localConfig)
    onOpenChange(false)
  }

  const selectedModel = modelInfos.find(m => m.name === localConfig.model_name)
  const selectedTemplate = templateInfos.find(t => t.value === localConfig.template_type)

  const getQualityBadgeColor = (quality: string) => {
    switch (quality) {
      case 'high': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSpeedBadgeColor = (speed: string) => {
    switch (speed) {
      case 'fast': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-red-100 text-red-800'
    }
  }

  const getCostBadgeColor = (cost: string) => {
    switch (cost) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-red-100 text-red-800'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Case Study Generation Configuration
          </DialogTitle>
          <DialogDescription>
            Configure the AI model, template type, and custom instructions for your case study generation.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Model Selection */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">AI Model Selection</Label>
              <p className="text-sm text-muted-foreground">Choose the AI model for generation</p>
            </div>

            <RadioGroup
              value={localConfig.model_name}
              onValueChange={(value) => setLocalConfig(prev => ({ 
                ...prev, 
                model_name: value as GenerationConfig['model_name']
              }))}
            >
              {modelInfos
                .filter(model => availableModels.includes(model.name))
                .map((model) => (
                <Card key={model.name} className={`cursor-pointer transition-colors ${
                  localConfig.model_name === model.name ? 'ring-2 ring-primary' : 'hover:bg-gray-50'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <RadioGroupItem 
                        value={model.name} 
                        id={model.name}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <model.icon className="w-4 h-4" />
                          <Label htmlFor={model.name} className="font-medium cursor-pointer">
                            {model.displayName}
                          </Label>
                          <span className="text-xs text-muted-foreground">
                            by {model.provider}
                          </span>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {model.description}
                        </p>
                        
                        <div className="flex gap-1">
                          <span className={`text-xs px-2 py-1 rounded ${getQualityBadgeColor(model.quality)}`}>
                            {model.quality} quality
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${getSpeedBadgeColor(model.speed)}`}>
                            {model.speed} speed
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${getCostBadgeColor(model.cost)}`}>
                            {model.cost} cost
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </RadioGroup>
          </div>

          {/* Template Selection */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Template Type</Label>
              <p className="text-sm text-muted-foreground">Choose the case study structure and focus</p>
            </div>

            <RadioGroup
              value={localConfig.template_type}
              onValueChange={(value) => setLocalConfig(prev => ({ 
                ...prev, 
                template_type: value as GenerationConfig['template_type']
              }))}
            >
              {templateInfos.map((template) => (
                <Card key={template.value} className={`cursor-pointer transition-colors ${
                  localConfig.template_type === template.value ? 'ring-2 ring-primary' : 'hover:bg-gray-50'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <RadioGroupItem 
                        value={template.value} 
                        id={template.value}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <template.icon className="w-4 h-4" />
                          <Label htmlFor={template.value} className="font-medium cursor-pointer">
                            {template.label}
                          </Label>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {template.description}
                        </p>
                        
                        {localConfig.template_type === template.value && (
                          <div className="mt-3 p-2 bg-blue-50 rounded-sm">
                            <div className="text-xs font-medium text-blue-900 mb-1">
                              Will include sections:
                            </div>
                            <div className="text-xs text-blue-800">
                              {template.focus.slice(0, 4).join(' • ')}
                              {template.focus.length > 4 && ` • +${template.focus.length - 4} more`}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </RadioGroup>
          </div>
        </div>

        {/* Custom Instructions */}
        <div className="space-y-2">
          <Label htmlFor="custom-instructions" className="text-base font-medium">
            Custom Instructions (Optional)
          </Label>
          <p className="text-sm text-muted-foreground">
            Provide specific guidance or requirements for your case study generation
          </p>
          <Textarea
            id="custom-instructions"
            placeholder="e.g., Focus on technical decisions made during the critical milestone phase, include specific metrics from the project dashboard, emphasize lessons learned about remote team coordination..."
            value={localConfig.custom_instructions || ''}
            onChange={(e) => setLocalConfig(prev => ({ 
              ...prev, 
              custom_instructions: e.target.value || undefined
            }))}
            rows={4}
            className="resize-none"
          />
        </div>

        {/* Summary */}
        <Card className="bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Generation Summary</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Model:</span> {selectedModel?.displayName}
              </div>
              <div>
                <span className="font-medium">Template:</span> {selectedTemplate?.label}
              </div>
              <div>
                <span className="font-medium">Quality:</span> {selectedModel?.quality}
              </div>
              <div>
                <span className="font-medium">Speed:</span> {selectedModel?.speed}
              </div>
            </div>
            {localConfig.custom_instructions && (
              <div className="mt-2 text-sm">
                <span className="font-medium">Custom instructions:</span> 
                <span className="text-muted-foreground"> Provided</span>
              </div>
            )}
          </CardContent>
        </Card>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Apply Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}