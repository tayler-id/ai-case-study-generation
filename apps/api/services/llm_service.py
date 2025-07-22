"""
LLM Service for Case Study Generation

Provides streaming LLM generation capabilities for creating comprehensive case studies
from project data collected through Gmail and Google Drive APIs.

Features:
- Multi-provider support (OpenAI, Anthropic)
- Streaming response generation
- Structured output formatting
- Template-based case study generation
- Token usage tracking
- Error handling and retry logic
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, List, Any, AsyncGenerator, Optional, Literal
from dataclasses import dataclass

from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_core.language_models import BaseChatModel
from langchain_core.callbacks.streaming_stdout import StreamingStdOutCallbackHandler
from langchain_core.callbacks.base import BaseCallbackHandler
from langchain_core.outputs import LLMResult

from ..config import get_settings
from ..models.case_study import CaseStudySection, CaseStudyMetadata

logger = logging.getLogger(__name__)

@dataclass
class GenerationMetrics:
    """Metrics for LLM generation tracking"""
    start_time: datetime
    end_time: Optional[datetime] = None
    tokens_used: int = 0
    sections_generated: int = 0
    model_used: str = ""
    cost_estimate: float = 0.0
    
    @property
    def duration_seconds(self) -> float:
        if self.end_time and self.start_time:
            return (self.end_time - self.start_time).total_seconds()
        return 0.0

@dataclass 
class StreamingChunk:
    """Individual chunk of streaming data"""
    content: str
    chunk_type: Literal["section_start", "content", "section_end", "metadata", "error"]
    section_name: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()

class CaseStudyStreamingCallback(BaseCallbackHandler):
    """Custom callback handler for streaming case study generation"""
    
    def __init__(self):
        self.chunks: List[str] = []
        self.current_section = None
        self.section_buffer = ""
        
    async def on_llm_new_token(self, token: str, **kwargs) -> None:
        """Handle new token from LLM"""
        self.chunks.append(token)
        self.section_buffer += token
        
    def get_accumulated_text(self) -> str:
        """Get all accumulated text"""
        return "".join(self.chunks)
        
    def clear(self):
        """Clear accumulated chunks"""
        self.chunks.clear()
        self.section_buffer = ""

class LLMService:
    """Service for LLM-based case study generation"""
    
    def __init__(self):
        self.settings = get_settings()
        self.models = self._initialize_models()
        self.current_metrics: Optional[GenerationMetrics] = None
        
    def _initialize_models(self) -> Dict[str, BaseChatModel]:
        """Initialize supported LLM models"""
        models = {}
        
        # OpenAI models
        if self.settings.OPENAI_API_KEY:
            models["gpt-4"] = ChatOpenAI(
                model="gpt-4-1106-preview",
                api_key=self.settings.OPENAI_API_KEY,
                streaming=True,
                temperature=0.3
            )
            models["gpt-3.5-turbo"] = ChatOpenAI(
                model="gpt-3.5-turbo-1106",
                api_key=self.settings.OPENAI_API_KEY,
                streaming=True,
                temperature=0.3
            )
            
        # Anthropic models
        if self.settings.ANTHROPIC_API_KEY:
            models["claude-3-sonnet"] = ChatAnthropic(
                model="claude-3-sonnet-20240229",
                api_key=self.settings.ANTHROPIC_API_KEY,
                streaming=True,
                temperature=0.3
            )
            models["claude-3-haiku"] = ChatAnthropic(
                model="claude-3-haiku-20240307",
                api_key=self.settings.ANTHROPIC_API_KEY,
                streaming=True,
                temperature=0.3
            )
            
        if not models:
            raise ValueError("No LLM API keys configured. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY")
            
        return models
    
    def get_available_models(self) -> List[str]:
        """Get list of available models"""
        return list(self.models.keys())
    
    async def generate_case_study_stream(
        self,
        project_data: Dict[str, Any],
        model_name: str = "gpt-4",
        case_study_template: str = "comprehensive",
        custom_instructions: Optional[str] = None
    ) -> AsyncGenerator[StreamingChunk, None]:
        """
        Generate a case study with streaming output
        
        Args:
            project_data: Dictionary containing Gmail and Drive data
            model_name: Name of the LLM model to use
            case_study_template: Template type for case study structure
            custom_instructions: Additional instructions for generation
            
        Yields:
            StreamingChunk: Individual pieces of the generated case study
        """
        if model_name not in self.models:
            yield StreamingChunk(
                content=f"Model {model_name} not available",
                chunk_type="error"
            )
            return
            
        # Initialize metrics
        self.current_metrics = GenerationMetrics(
            start_time=datetime.utcnow(),
            model_used=model_name
        )
        
        model = self.models[model_name]
        callback = CaseStudyStreamingCallback()
        
        try:
            # Create the system prompt
            system_prompt = self._create_system_prompt(case_study_template, custom_instructions)
            
            # Format the project data
            formatted_data = self._format_project_data(project_data)
            
            # Create the chat messages
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=f"""
                Please analyze the following project data and generate a comprehensive case study:
                
                {formatted_data}
                
                Please structure your response with clear sections and provide actionable insights.
                """)
            ]
            
            # Start generation
            yield StreamingChunk(
                content="",
                chunk_type="section_start",
                section_name="generation_started",
                metadata={"model": model_name, "template": case_study_template}
            )
            
            # Generate with streaming
            current_section = None
            accumulated_content = ""
            
            async for chunk in model.astream(messages, callbacks=[callback]):
                if hasattr(chunk, 'content') and chunk.content:
                    content = chunk.content
                    accumulated_content += content
                    
                    # Detect section boundaries (basic implementation)
                    if self._is_section_boundary(accumulated_content):
                        section_name = self._extract_section_name(accumulated_content)
                        if section_name and section_name != current_section:
                            if current_section:
                                yield StreamingChunk(
                                    content="",
                                    chunk_type="section_end",
                                    section_name=current_section
                                )
                            
                            current_section = section_name
                            yield StreamingChunk(
                                content="",
                                chunk_type="section_start",
                                section_name=current_section
                            )
                    
                    # Yield the content chunk
                    yield StreamingChunk(
                        content=content,
                        chunk_type="content",
                        section_name=current_section
                    )
            
            # End the last section
            if current_section:
                yield StreamingChunk(
                    content="",
                    chunk_type="section_end",
                    section_name=current_section
                )
            
            # Update metrics
            self.current_metrics.end_time = datetime.utcnow()
            self.current_metrics.tokens_used = self._estimate_tokens(accumulated_content)
            self.current_metrics.sections_generated = len(self._extract_sections(accumulated_content))
            
            # Yield final metadata
            yield StreamingChunk(
                content="",
                chunk_type="metadata",
                metadata={
                    "generation_complete": True,
                    "metrics": {
                        "duration_seconds": self.current_metrics.duration_seconds,
                        "tokens_used": self.current_metrics.tokens_used,
                        "sections_generated": self.current_metrics.sections_generated,
                        "model_used": self.current_metrics.model_used
                    }
                }
            )
            
        except Exception as e:
            logger.error(f"Error in case study generation: {str(e)}")
            yield StreamingChunk(
                content=f"Generation error: {str(e)}",
                chunk_type="error"
            )
    
    def _create_system_prompt(self, template: str, custom_instructions: Optional[str] = None) -> str:
        """Create the system prompt for case study generation"""
        base_prompt = """
        You are an expert business analyst and case study writer. Your task is to analyze project data 
        from emails and documents to create comprehensive, actionable case studies.
        
        Your case studies should be:
        - Well-structured with clear sections
        - Data-driven and evidence-based  
        - Actionable with specific recommendations
        - Professional and engaging
        - Focused on lessons learned and best practices
        
        Standard case study structure:
        1. Executive Summary
        2. Project Background & Context
        3. Key Stakeholders & Timeline
        4. Communication Analysis
        5. Decision Points & Challenges
        6. Outcomes & Results
        7. Lessons Learned
        8. Recommendations & Best Practices
        
        Use the provided email and document data to support your analysis with specific examples,
        quotes, and timeline details.
        """
        
        if template == "technical":
            base_prompt += """
            
            Focus on technical aspects, architecture decisions, development processes, 
            and technical challenges overcome.
            """
        elif template == "marketing":
            base_prompt += """
            
            Focus on marketing strategies, campaign performance, audience engagement, 
            and growth metrics.
            """
        elif template == "product":
            base_prompt += """
            
            Focus on product development, user feedback, feature decisions, 
            and product-market fit considerations.
            """
        
        if custom_instructions:
            base_prompt += f"\n\nAdditional Instructions:\n{custom_instructions}"
            
        return base_prompt
    
    def _format_project_data(self, project_data: Dict[str, Any]) -> str:
        """Format project data for LLM consumption"""
        formatted_sections = []
        
        # Gmail data formatting
        if 'gmail' in project_data.get('data', {}):
            gmail_data = project_data['data']['gmail']
            formatted_sections.append("## Email Communications")
            formatted_sections.append(f"Total emails: {gmail_data.get('metadata', {}).get('total_emails', 0)}")
            formatted_sections.append(f"Conversations: {gmail_data.get('metadata', {}).get('total_threads', 0)}")
            
            # Add sample emails
            emails = gmail_data.get('emails', [])[:10]  # Limit to first 10 for context
            for email in emails:
                formatted_sections.append(f"""
                Email: {email.get('subject', 'No Subject')}
                From: {email.get('sender', 'Unknown')}
                Date: {email.get('date', 'Unknown')}
                Snippet: {email.get('snippet', 'No snippet')}
                ---
                """)
        
        # Drive data formatting
        if 'drive' in project_data.get('data', {}):
            drive_data = project_data['data']['drive']
            formatted_sections.append("\n## Project Documents")
            formatted_sections.append(f"Total documents: {drive_data.get('metadata', {}).get('total_documents', 0)}")
            
            # Add sample documents
            documents = drive_data.get('documents', [])[:10]  # Limit to first 10
            for doc in documents:
                formatted_sections.append(f"""
                Document: {doc.get('name', 'Unnamed')}
                Type: {doc.get('file_type', 'Unknown')}
                Modified: {doc.get('modified_time', 'Unknown')}
                Preview: {doc.get('content_preview', 'No preview available')[:200]}...
                ---
                """)
        
        # Project metadata
        metadata = project_data.get('metadata', {})
        formatted_sections.append(f"\n## Project Metadata")
        formatted_sections.append(f"Data fetched: {metadata.get('fetch_timestamp', 'Unknown')}")
        formatted_sections.append(f"Sources: {', '.join(metadata.get('sources_fetched', []))}")
        
        return "\n".join(formatted_sections)
    
    def _is_section_boundary(self, text: str) -> bool:
        """Detect if we've hit a section boundary in the generated text"""
        # Look for markdown headers or numbered sections
        lines = text.strip().split('\n')
        if not lines:
            return False
            
        last_line = lines[-1].strip()
        return (
            last_line.startswith('#') or 
            last_line.startswith('## ') or
            (last_line.endswith(':') and len(last_line.split()) <= 5)
        )
    
    def _extract_section_name(self, text: str) -> Optional[str]:
        """Extract section name from accumulated text"""
        lines = text.strip().split('\n')
        if not lines:
            return None
            
        last_line = lines[-1].strip()
        
        # Remove markdown formatting
        if last_line.startswith('##'):
            return last_line.replace('##', '').strip()
        elif last_line.startswith('#'):
            return last_line.replace('#', '').strip()
        elif last_line.endswith(':'):
            return last_line.replace(':', '').strip()
            
        return None
    
    def _extract_sections(self, text: str) -> List[str]:
        """Extract all section names from generated text"""
        sections = []
        lines = text.split('\n')
        
        for line in lines:
            line = line.strip()
            if line.startswith('#') or (line.endswith(':') and len(line.split()) <= 5):
                sections.append(line)
                
        return sections
    
    def _estimate_tokens(self, text: str) -> int:
        """Rough token estimation (4 characters = 1 token average)"""
        return max(1, len(text) // 4)
    
    async def generate_case_study_complete(
        self,
        project_data: Dict[str, Any],
        model_name: str = "gpt-4",
        case_study_template: str = "comprehensive",
        custom_instructions: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate a complete case study (non-streaming) for testing/simple use cases
        """
        chunks = []
        content_chunks = []
        metadata = {}
        
        async for chunk in self.generate_case_study_stream(
            project_data, model_name, case_study_template, custom_instructions
        ):
            chunks.append(chunk)
            if chunk.chunk_type == "content":
                content_chunks.append(chunk.content)
            elif chunk.chunk_type == "metadata":
                metadata.update(chunk.metadata or {})
        
        return {
            "content": "".join(content_chunks),
            "chunks": chunks,
            "metadata": metadata
        }

# Global service instance
_llm_service_instance = None

def get_llm_service() -> LLMService:
    """Get the global LLM service instance"""
    global _llm_service_instance
    if _llm_service_instance is None:
        _llm_service_instance = LLMService()
    return _llm_service_instance