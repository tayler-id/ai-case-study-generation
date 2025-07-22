"""
Case Study Database Models

SQLModel models for storing generated case studies and their metadata.
"""

from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any, List
from sqlmodel import SQLModel, Field, Column, JSON, Relationship
from sqlalchemy import Text

class CaseStudyStatus(str, Enum):
    """Status of case study generation"""
    PENDING = "pending"
    GENERATING = "generating" 
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class CaseStudyTemplate(str, Enum):
    """Available case study templates"""
    COMPREHENSIVE = "comprehensive"
    TECHNICAL = "technical"
    MARKETING = "marketing"
    PRODUCT = "product"
    CUSTOM = "custom"

class CaseStudySection(SQLModel, table=True):
    """Individual sections of a case study"""
    __tablename__ = "case_study_sections"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    case_study_id: int = Field(foreign_key="case_studies.id")
    section_name: str = Field(max_length=100)
    section_order: int = Field(default=0)
    content: str = Field(sa_column=Column(Text))
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    tokens_used: int = Field(default=0)
    
    # Relationship back to case study
    case_study: "CaseStudy" = Relationship(back_populates="sections")

class CaseStudyMetadata(SQLModel):
    """Metadata for case study generation"""
    model_used: str
    template_type: str
    generation_time_seconds: float
    total_tokens_used: int
    total_sections: int
    data_sources: List[str] = Field(default_factory=list)
    project_date_range: Dict[str, str] = Field(default_factory=dict)
    participant_count: int = 0
    keyword_count: int = 0
    error_messages: List[str] = Field(default_factory=list)

class CaseStudy(SQLModel, table=True):
    """Main case study record"""
    __tablename__ = "case_studies"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    
    # Project Details
    project_name: str = Field(max_length=200)
    project_industry: Optional[str] = Field(default=None, max_length=100)
    project_focus: Optional[str] = Field(default=None, max_length=200)
    
    # Generation Parameters
    template_type: CaseStudyTemplate = Field(default=CaseStudyTemplate.COMPREHENSIVE)
    model_used: str = Field(max_length=50)
    custom_instructions: Optional[str] = Field(default=None, sa_column=Column(Text))
    
    # Project Scope
    date_range_start: datetime
    date_range_end: datetime
    participants: List[str] = Field(sa_column=Column(JSON), default_factory=list)
    keywords: List[str] = Field(sa_column=Column(JSON), default_factory=list)
    
    # Status and Progress
    status: CaseStudyStatus = Field(default=CaseStudyStatus.PENDING)
    progress_percentage: int = Field(default=0)
    current_section: Optional[str] = Field(default=None, max_length=100)
    
    # Generation Results
    full_content: Optional[str] = Field(default=None, sa_column=Column(Text))
    executive_summary: Optional[str] = Field(default=None, sa_column=Column(Text))
    key_insights: List[str] = Field(sa_column=Column(JSON), default_factory=list)
    recommendations: List[str] = Field(sa_column=Column(JSON), default_factory=list)
    
    # Metadata
    generation_metadata: Dict[str, Any] = Field(sa_column=Column(JSON), default_factory=dict)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    sections: List[CaseStudySection] = Relationship(back_populates="case_study")
    user: "User" = Relationship()
    
    class Config:
        arbitrary_types_allowed = True

class CaseStudyGenerationRequest(SQLModel):
    """Request model for case study generation"""
    project_name: str = Field(min_length=1, max_length=200)
    project_industry: Optional[str] = Field(default=None, max_length=100)
    project_focus: Optional[str] = Field(default=None, max_length=200)
    
    date_range_start: datetime
    date_range_end: datetime
    participants: List[str] = Field(min_items=1)
    keywords: List[str] = Field(min_items=1)
    
    template_type: CaseStudyTemplate = Field(default=CaseStudyTemplate.COMPREHENSIVE)
    model_name: str = Field(default="gpt-4")
    custom_instructions: Optional[str] = Field(default=None)

class CaseStudyResponse(SQLModel):
    """Response model for case study data"""
    id: int
    project_name: str
    status: CaseStudyStatus
    progress_percentage: int
    current_section: Optional[str]
    
    template_type: CaseStudyTemplate
    model_used: str
    
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    
    # Content (only included when completed)
    executive_summary: Optional[str] = None
    key_insights: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    full_content: Optional[str] = None
    
    # Metadata
    generation_metadata: Dict[str, Any] = Field(default_factory=dict)

class CaseStudyStreamEvent(SQLModel):
    """Streaming event model for real-time updates"""
    case_study_id: int
    event_type: str  # "section_start", "content", "section_end", "progress", "error", "complete"
    content: Optional[str] = None
    section_name: Optional[str] = None
    progress_percentage: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)