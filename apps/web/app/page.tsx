"use client"

import { useState, useEffect } from "react"
import { Authentication } from "@/components/Authentication"
import { Sidebar } from "@/components/Sidebar"
import { MainContent } from "@/components/MainContent"
import { Dashboard } from "@/components/Dashboard"
import { ProjectScope } from "@/components/ProjectScopingModal"
import { useAuthStore } from "@/stores/useAuthStore"
import { User } from "@case-study/shared"
import { type StreamChunk } from "@/services/caseStudyService"

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
  content?: string
}

export default function HomePage() {
  const { user, isAuthenticated, isLoading, logout } = useAuthStore()
  const [currentView, setCurrentView] = useState<'dashboard' | 'study'>('study')
  const [currentStudy, setCurrentStudy] = useState<CaseStudy | null>(null)
  const [projectScope, setProjectScope] = useState<ProjectScope | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [agentStatus, setAgentStatus] = useState("Ready")
  const [streamedContent, setStreamedContent] = useState("")

  const handleAuthenticated = (authenticatedUser: User) => {
    // This is now handled by the auth store
    console.log('User authenticated:', authenticatedUser)
  }

  const handleCreateNewStudy = (scope: ProjectScope) => {
    setProjectScope(scope)
    setCurrentStudy({
      id: Date.now().toString(),
      title: scope.focus || "New Case Study",
      dateCreated: new Date().toISOString().split('T')[0],
      dateRange: scope.dateRange,
      participants: scope.participants,
      keywords: scope.keywords,
      rating: 0,
      status: 'in-progress',
      summary: `Analysis of ${scope.focus || 'project'} from ${scope.dateRange.start} to ${scope.dateRange.end}`,
      content: ""
    })
    
    // Simulate case study generation with realistic timing
    setIsGenerating(true)
    setAgentStatus("Connecting to data sources")
    
    setTimeout(() => {
      setAgentStatus("Analyzing emails and documents")
      setTimeout(() => {
        setAgentStatus("Identifying key patterns")
        setTimeout(() => {
          setAgentStatus("Synthesizing insights")
          setTimeout(() => {
            setAgentStatus("Writing case study")
            setTimeout(() => {
              setIsGenerating(false)
              setAgentStatus("Ready")
              setCurrentStudy(prev => prev ? {
                ...prev,
                status: 'completed' as const,
                content: generateMockCaseStudy(scope)
              } : null)
            }, 2000)
          }, 1500)
        }, 1500)
      }, 2000)
    }, 1000)
  }

  const handleSelectStudy = (study: CaseStudy) => {
    setCurrentStudy(study)
    setCurrentView('study')
    setIsGenerating(false)
    setAgentStatus("Ready")
  }

  const handleSendMessage = (message: string) => {
    console.log("User message:", message)
    // In a real app, this would send the message to the backend
    // For now, we can simulate some basic responses
    if (message.toLowerCase().includes('regenerate') || message.toLowerCase().includes('update')) {
      setIsGenerating(true)
      setAgentStatus("Updating analysis")
      setTimeout(() => {
        setIsGenerating(false)
        setAgentStatus("Ready")
      }, 3000)
    }
  }

  const handleStartGeneration = () => {
    setIsGenerating(true)
    setAgentStatus("Starting generation")
    setStreamedContent("")
    
    // Create a new case study when generation starts
    if (projectScope) {
      setCurrentStudy({
        id: Date.now().toString(),
        title: projectScope.projectName,
        dateCreated: new Date().toISOString().split('T')[0],
        dateRange: projectScope.dateRange,
        participants: projectScope.participants,
        keywords: projectScope.keywords,
        rating: 0,
        status: 'in-progress',
        summary: `Analysis of ${projectScope.projectName} from ${projectScope.dateRange.start} to ${projectScope.dateRange.end}`,
        content: ""
      })
    }
  }

  const handleStreamChunk = (chunk: StreamChunk) => {
    if (chunk.type === 'content') {
      setStreamedContent(prev => prev + chunk.content)
      setAgentStatus("Writing case study")
    } else if (chunk.type === 'section_start' && chunk.section) {
      setAgentStatus(`Writing: ${chunk.section}`)
    } else if (chunk.type === 'section_end') {
      setAgentStatus("Generating insights")
    }
    
    // Update current study content in real-time
    if (chunk.type === 'content') {
      setCurrentStudy(prev => prev ? {
        ...prev,
        content: (prev.content || "") + chunk.content,
        status: 'in-progress' as const
      } : null)
    }
  }

  const handleGenerationComplete = () => {
    setIsGenerating(false)
    setAgentStatus("Ready")
    
    // Mark current study as completed
    setCurrentStudy(prev => prev ? {
      ...prev, 
      status: 'completed' as const
    } : null)
  }

  const handleContentChange = (content: string) => {
    if (currentStudy) {
      setCurrentStudy(prev => prev ? { ...prev, content } : null)
    }
  }

  const handleSaveStudy = (content: string) => {
    console.log("Saving study:", content)
    // In a real app, this would save to the backend
    if (currentStudy) {
      const updatedStudy = { ...currentStudy, content }
      setCurrentStudy(updatedStudy)
      
      // Save to localStorage for persistence
      const savedStudies = JSON.parse(localStorage.getItem('case-studies') || '[]')
      const existingIndex = savedStudies.findIndex((s: CaseStudy) => s.id === updatedStudy.id)
      
      if (existingIndex >= 0) {
        savedStudies[existingIndex] = updatedStudy
      } else {
        savedStudies.push(updatedStudy)
      }
      
      localStorage.setItem('case-studies', JSON.stringify(savedStudies))
    }
  }

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Show authentication screen if user is not logged in
  if (!isAuthenticated || !user) {
    return <Authentication onAuthenticated={handleAuthenticated} />
  }

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-900">
      <Sidebar 
        onCreateNewStudy={handleCreateNewStudy}
        currentView={currentView}
        onViewChange={setCurrentView}
        user={user}
        onSignOut={() => {
          logout()
        }}
      />
      
      {currentView === 'dashboard' ? (
        <Dashboard onSelectStudy={handleSelectStudy} />
      ) : (
        <MainContent 
          projectScope={projectScope}
          currentStudy={currentStudy}
          isGenerating={isGenerating}
          agentStatus={agentStatus}
          onSendMessage={handleSendMessage}
          onProjectScopeUpdate={setProjectScope}
          onStartGeneration={handleStartGeneration}
          onStreamChunk={handleStreamChunk}
          onGenerationComplete={handleGenerationComplete}
          onContentChange={handleContentChange}
          onSaveStudy={handleSaveStudy}
        />
      )}
    </div>
  )
}

// Enhanced mock case study generator with more realistic content
function generateMockCaseStudy(scope: ProjectScope): string {
  const title = scope.focus || "Project Analysis"
  const dateRange = `${scope.dateRange.start} to ${scope.dateRange.end}`
  const startDate = new Date(scope.dateRange.start)
  const endDate = new Date(scope.dateRange.end)
  const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  
  return `# ${title}: A Comprehensive Retrospective

## Executive Summary

This case study provides a detailed analysis of the **${scope.focus?.toLowerCase() || 'project'}** initiative conducted from ${dateRange}. Through comprehensive data analysis spanning ${duration} days, we've identified key success factors, challenges, and actionable recommendations for future initiatives.

**Key Highlights:**
- 📈 **Performance:** Exceeded initial targets by 23%
- 👥 **Team Engagement:** 4.2/5 average satisfaction score
- ⏱️ **Timeline:** 95% of milestones delivered on schedule
- 💡 **Innovation:** 3 breakthrough solutions implemented

---

## Project Overview

| Attribute | Details |
|-----------|---------|
| **Timeline** | ${dateRange} (${duration} days) |
| **Industry** | ${scope.industry || 'Technology'} |
| **Team Size** | ${scope.participants.length} core participants |
| **Focus Area** | ${scope.focus || 'Strategic Initiative'} |
| **Keywords** | ${scope.keywords.join(', ') || 'N/A'} |

---

## Methodology

Our analysis leveraged multiple data sources to ensure comprehensive coverage:

### Data Sources Analyzed
- **Email Communications:** ${Math.floor(Math.random() * 500) + 200} emails processed
- **Document Repository:** ${Math.floor(Math.random() * 50) + 25} documents reviewed
- **Meeting Records:** ${Math.floor(Math.random() * 30) + 15} sessions analyzed
- **Project Artifacts:** Code commits, design files, and deliverables

### Analysis Framework
1. **Quantitative Metrics:** Performance indicators and timeline analysis
2. **Qualitative Insights:** Communication patterns and sentiment analysis
3. **Stakeholder Feedback:** Direct input from project participants
4. **Comparative Analysis:** Benchmarking against similar initiatives

---

## Key Findings

### 🎯 Performance Metrics

#### Primary Objectives Achievement
- **Objective 1:** User Engagement - **127%** of target (Target: 1,000 → Achieved: 1,270)
- **Objective 2:** Quality Score - **112%** of target (Target: 4.0 → Achieved: 4.48)
- **Objective 3:** Timeline Adherence - **95%** on-time delivery
- **Objective 4:** Budget Efficiency - **8%** under budget

#### Secondary Metrics
- **Team Velocity:** Increased by 34% over project duration
- **Defect Rate:** 0.3% (Industry average: 1.2%)
- **Customer Satisfaction:** 4.6/5.0 rating
- **Knowledge Transfer:** 100% documentation completion

### 💪 Critical Success Factors

#### 1. **Agile Communication Framework**
The implementation of daily standups and weekly retrospectives created unprecedented transparency:
- **Daily Standups:** 98% attendance rate
- **Blocker Resolution:** Average 1.2 days (vs. 3.5 days industry standard)
- **Cross-team Collaboration:** 45% increase in inter-departmental communications

#### 2. **Data-Driven Decision Making**
Regular metrics review enabled proactive course corrections:
- **Weekly Metrics Reviews:** Identified 12 potential issues before they became critical
- **A/B Testing:** 8 experiments conducted, 6 showed significant improvements
- **User Feedback Integration:** 23 feature adjustments based on real-time feedback

#### 3. **Technical Excellence**
Strong engineering practices maintained quality throughout:
- **Code Review Coverage:** 100% of commits reviewed
- **Automated Testing:** 94% code coverage achieved
- **Continuous Integration:** 99.7% build success rate

---

## Challenges & Resolutions

### 🚧 Major Challenges Encountered

#### Challenge 1: Resource Allocation Conflicts
**Issue:** Competing priorities across teams led to resource bottlenecks in weeks 3-4.

**Impact:** 
- 15% reduction in velocity
- 2 minor milestone delays
- Increased team stress levels

**Resolution:**
- Implemented resource allocation matrix
- Weekly capacity planning sessions
- Cross-training initiative for critical skills

**Outcome:** Velocity recovered to 110% of baseline by week 6.

#### Challenge 2: Integration Complexity
**Issue:** Third-party API limitations discovered during implementation phase.

**Impact:**
- 5-day delay in core feature delivery
- Required architecture redesign
- Additional testing cycles needed

**Resolution:**
- Rapid prototyping of alternative solutions
- Stakeholder alignment on revised approach
- Parallel development streams established

**Outcome:** Final solution exceeded original performance requirements by 40%.

#### Challenge 3: Stakeholder Alignment
**Issue:** Evolving requirements from key stakeholders mid-project.

**Impact:**
- Scope creep risk
- Team confusion on priorities
- Potential timeline impact

**Resolution:**
- Formal change request process implemented
- Weekly stakeholder sync meetings
- Clear communication of impact assessments

**Outcome:** All changes successfully integrated with minimal timeline impact.

---

## Innovation Highlights

### 🚀 Breakthrough Solutions

#### 1. **Automated Quality Assurance Pipeline**
- **Innovation:** ML-powered testing framework
- **Impact:** 60% reduction in manual testing time
- **Adoption:** Now standard across 3 other teams

#### 2. **Real-time Collaboration Dashboard**
- **Innovation:** Live project visibility for all stakeholders
- **Impact:** 40% improvement in stakeholder satisfaction
- **Recognition:** Featured in company innovation showcase

#### 3. **Predictive Analytics Integration**
- **Innovation:** Proactive issue identification system
- **Impact:** 80% reduction in critical bugs reaching production
- **Value:** Estimated $50K+ in prevented downtime costs

---

## Team Performance Analysis

### 👥 Individual Contributions

${scope.participants.slice(0, 5).map((participant, index) => `
#### ${participant}
- **Role:** ${['Lead Developer', 'Product Manager', 'UX Designer', 'Data Analyst', 'QA Engineer'][index] || 'Team Member'}
- **Key Contributions:** ${['Architecture design and implementation', 'Stakeholder management and roadmap planning', 'User experience optimization', 'Performance metrics and insights', 'Quality assurance and testing'][index] || 'Project execution and delivery'}
- **Impact Score:** ${(Math.random() * 2 + 3).toFixed(1)}/5.0
`).join('')}

### 📊 Team Dynamics
- **Collaboration Score:** 4.3/5.0
- **Communication Effectiveness:** 4.1/5.0
- **Problem-Solving Capability:** 4.5/5.0
- **Innovation Index:** 4.2/5.0

---

## Lessons Learned

### ✅ What Worked Exceptionally Well

1. **Early Stakeholder Engagement**
   - Regular feedback loops prevented major course corrections
   - Stakeholder buy-in remained high throughout project lifecycle
   - Clear communication channels established from day one

2. **Iterative Development Approach**
   - Weekly demos maintained momentum and visibility
   - Early user feedback shaped product direction effectively
   - Risk mitigation through incremental delivery

3. **Cross-Functional Collaboration**
   - Breaking down silos improved overall efficiency
   - Knowledge sharing accelerated problem-solving
   - Team members developed broader skill sets

### 🔄 Areas for Improvement

1. **Initial Planning Phase**
   - **Issue:** Underestimated complexity of integration requirements
   - **Recommendation:** Allocate 20% more time for technical discovery
   - **Implementation:** Technical spike stories in future projects

2. **Resource Management**
   - **Issue:** Peak workload periods created bottlenecks
   - **Recommendation:** Implement capacity planning tools
   - **Implementation:** Resource allocation dashboard for future projects

3. **Documentation Standards**
   - **Issue:** Inconsistent documentation quality across teams
   - **Recommendation:** Establish documentation templates and review process
   - **Implementation:** Documentation quality gates in definition of done

---

## Strategic Recommendations

### 🎯 Immediate Actions (Next 30 Days)

1. **Process Standardization**
   - Document successful practices as organizational standards
   - Create reusable templates and frameworks
   - Establish center of excellence for project management

2. **Knowledge Transfer**
   - Conduct organization-wide retrospective presentation
   - Create training materials for identified best practices
   - Establish mentorship program for future project leads

3. **Tool Optimization**
   - Implement automated reporting dashboards
   - Standardize project management toolchain
   - Establish integration between development and business tools

### 🚀 Long-term Strategy (Next 6 Months)

1. **Capability Building**
   - Invest in team skill development programs
   - Establish cross-functional training initiatives
   - Create innovation time allocation (20% rule)

2. **Process Evolution**
   - Implement predictive project analytics
   - Establish automated quality gates
   - Create self-service project initiation framework

3. **Cultural Transformation**
   - Promote data-driven decision making culture
   - Establish innovation recognition programs
   - Create psychological safety for experimentation

---

## Risk Assessment & Mitigation

### 🛡️ Future Risk Factors

| Risk Category | Probability | Impact | Mitigation Strategy |
|---------------|-------------|--------|-------------------|
| **Technical Debt** | Medium | High | Regular refactoring sprints, code quality metrics |
| **Team Scaling** | High | Medium | Structured onboarding, knowledge documentation |
| **Market Changes** | Low | High | Continuous market research, flexible architecture |
| **Resource Constraints** | Medium | Medium | Cross-training, vendor partnerships |

---

## Financial Impact Analysis

### 💰 Cost-Benefit Summary

#### Project Investment
- **Total Budget:** $${(Math.random() * 200000 + 100000).toLocaleString()}
- **Actual Spend:** $${(Math.random() * 180000 + 90000).toLocaleString()} (${Math.floor(Math.random() * 15 + 85)}% of budget)
- **Resource Hours:** ${Math.floor(Math.random() * 2000 + 1500)} person-hours

#### Return on Investment
- **Direct Revenue Impact:** $${(Math.random() * 500000 + 200000).toLocaleString()} (projected 12 months)
- **Cost Savings:** $${(Math.random() * 100000 + 50000).toLocaleString()} annually
- **Efficiency Gains:** ${Math.floor(Math.random() * 30 + 20)}% improvement in related processes
- **ROI:** ${Math.floor(Math.random() * 200 + 150)}% over 18 months

---

## Conclusion

The **${title}** project represents a significant success for our organization, demonstrating our ability to deliver complex initiatives while maintaining high quality standards and team satisfaction. The combination of agile methodologies, data-driven decision making, and strong stakeholder engagement created a foundation for sustainable success.

### 🏆 Key Achievements
- ✅ All primary objectives exceeded expectations
- ✅ Team satisfaction and engagement remained high throughout
- ✅ Innovation solutions created lasting organizational value
- ✅ Process improvements identified for future initiatives

### 🔮 Future Outlook
The practices and innovations developed during this project position us well for future challenges. The documented lessons learned and established frameworks will accelerate future project delivery while maintaining our commitment to quality and innovation.

**Overall Project Rating:** ⭐⭐⭐⭐⭐ (4.7/5.0)

---

*This comprehensive case study was generated through AI-powered analysis of project communications, documents, and artifacts spanning ${dateRange}. For detailed methodology or specific questions, please contact the project team.*

**Generated on:** ${new Date().toLocaleDateString()}  
**Analysis Duration:** ${duration} days  
**Data Sources:** ${scope.participants.length + scope.keywords.length + scope.folders.length} integrated sources`
}