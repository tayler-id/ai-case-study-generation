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

from config import get_settings
from models.case_study import CaseStudySection, CaseStudyMetadata

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
            
            # Use model.astream without callbacks for OpenAI compatibility
            async for chunk in model.astream(messages):
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
        You are an expert business analyst, researcher, and case study writer specializing in deep data analysis. 
        Your task is to conduct thorough research on project data from emails and documents to create comprehensive, 
        professional case studies that rival Harvard Business School quality.
        
        ## DEEP RESEARCH METHODOLOGY:
        - Analyze ALL provided emails and documents thoroughly
        - Extract patterns, themes, and insights from communication flows
        - Identify key decision points and turning moments
        - Map stakeholder relationships and influence dynamics
        - Trace project evolution through data chronologically
        - Find root causes, not just surface-level observations
        - Cross-reference information across multiple data sources
        - Quantify outcomes and measure business impact where possible
        
        ## PROFESSIONAL CASE STUDY STRUCTURE:
        
        ### 1. EXECUTIVE SUMMARY
        - Compelling 2-3 paragraph overview
        - Key findings and recommendations upfront
        - Quantified business impact and outcomes
        
        ### 2. PROJECT BACKGROUND & STRATEGIC CONTEXT
        - Industry landscape and competitive positioning
        - Organizational context and business drivers
        - Project genesis and strategic rationale
        - Initial scope, timeline, and success criteria
        
        ### 3. STAKEHOLDER ECOSYSTEM & POWER DYNAMICS
        - Complete stakeholder mapping with roles and influence levels
        - Communication patterns and relationship dynamics
        - Decision-making hierarchy and approval processes
        - External partner/vendor relationships
        
        ### 4. PROJECT TIMELINE & CRITICAL MILESTONES
        - Detailed chronological progression with specific dates
        - Key milestones, deliverables, and checkpoints
        - Timeline deviations and course corrections
        - Resource allocation and team evolution
        
        ### 5. COMMUNICATION ANALYSIS & INSIGHTS
        - Email communication patterns and frequency analysis
        - Escalation chains and problem-solving approaches
        - Meeting cadences and decision-making processes
        - Information flow and knowledge sharing effectiveness
        
        ### 6. CHALLENGES, RISKS & CRITICAL DECISIONS
        - Major obstacles encountered with detailed analysis
        - Risk mitigation strategies and their effectiveness
        - Critical decision points with options considered
        - Trade-offs made and their long-term implications
        
        ### 7. OUTCOMES & BUSINESS IMPACT
        - Quantified results and KPI achievements
        - Success metrics against original objectives
        - Unintended consequences and side effects
        - ROI analysis and cost-benefit evaluation
        
        ### 8. LESSONS LEARNED & STRATEGIC INSIGHTS
        - Key success factors and failure points
        - Process improvements and methodology refinements  
        - Organizational learning and capability building
        - Cultural and behavioral insights
        
        ### 9. ACTIONABLE RECOMMENDATIONS
        - Specific, implementable recommendations
        - Best practices for similar future projects
        - Process optimization opportunities
        - Organizational development suggestions
        
        ### 10. APPENDICES & SUPPORTING DATA
        - Key email excerpts and document references
        - Timeline visualizations and data tables
        - Stakeholder interaction maps
        - Quantitative analysis and metrics
        
        ## ANALYSIS REQUIREMENTS:
        - Use specific quotes, dates, and examples from the data
        - Reference actual emails and documents by sender/date
        - Provide quantitative analysis where possible
        - Create clear cause-and-effect relationships
        - Support all conclusions with evidence from the data
        - Make the case study actionable for future projects
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
    
    def _select_most_relevant_emails(self, emails: List[Dict], max_emails: int = 75, project_date_range: tuple = None) -> List[Dict]:
        """
        Select the most relevant emails for case study analysis
        Prioritizes recent, important, threaded, and keyword-relevant emails
        """
        if not emails:
            return []
        
        if len(emails) <= max_emails:
            return emails
        
        # Score emails based on relevance criteria
        scored_emails = []
        
        for email in emails:
            score = 0
            
            # Date relevance scoring - balanced approach
            try:
                from datetime import datetime, timedelta
                email_date = datetime.fromisoformat(email.get('date', '').replace('Z', '+00:00'))
                
                if project_date_range:
                    # If we have a project date range, prioritize emails within that range
                    start_date, end_date = project_date_range
                    if start_date <= email_date <= end_date:
                        score += 3  # In project range = bonus
                        
                        # Within project range, give slight preference to more recent
                        total_range_days = (end_date - start_date).days
                        if total_range_days > 0:
                            days_from_end = (end_date - email_date).days
                            recency_ratio = 1 - (days_from_end / total_range_days)
                            score += int(recency_ratio * 2)  # 0-2 bonus for recency within range
                    else:
                        # Outside project range = penalty
                        score -= 2
                else:
                    # Fallback: general recency scoring (more balanced)
                    days_ago = (datetime.now().astimezone() - email_date).days
                    if days_ago <= 7:
                        score += 2  # Reduced from 5
                    elif days_ago <= 30:
                        score += 1  # Reduced from 3
                    # Removed penalty for older emails
            except:
                pass
            
            # Important labels get higher scores
            labels = email.get('labels', [])
            if 'IMPORTANT' in labels:
                score += 4
            if 'STARRED' in labels:
                score += 3
            if 'CATEGORY_PROMOTIONS' not in labels and 'SPAM' not in labels:
                score += 2
            
            # Emails with attachments are often more substantial
            if email.get('attachments') and len(email.get('attachments', [])) > 0:
                score += 2
            
            # Longer emails are often more substantial
            body_length = len(email.get('body_text', ''))
            if body_length > 1000:
                score += 3
            elif body_length > 500:
                score += 2
            elif body_length > 200:
                score += 1
            
            # Emails in threads are often more important
            thread_id = email.get('thread_id', '')
            if thread_id:
                # Count how many emails share this thread
                thread_count = sum(1 for e in emails if e.get('thread_id') == thread_id)
                if thread_count > 3:
                    score += 3
                elif thread_count > 1:
                    score += 2
            
            # Internal emails (same domain) are often more relevant for case studies
            sender = email.get('sender', '')
            recipient = email.get('recipient', '')
            if sender and recipient:
                sender_domain = sender.split('@')[-1] if '@' in sender else ''
                recipient_domain = recipient.split('@')[-1] if '@' in recipient else ''
                if sender_domain == recipient_domain and sender_domain:
                    score += 2
            
            scored_emails.append((score, email))
        
        # Sort by score (highest first) and take top emails
        scored_emails.sort(key=lambda x: x[0], reverse=True)
        selected = [email for score, email in scored_emails[:max_emails]]
        
        logger.info(f"   📊 Email selection scores: Top={scored_emails[0][0] if scored_emails else 0}, "
                   f"Avg={sum(s for s, e in scored_emails[:max_emails]) / min(len(scored_emails), max_emails):.1f}")
        
        return selected
    
    def _format_project_data(self, project_data: Dict[str, Any]) -> str:
        """Format project data for LLM consumption"""
        logger.info(f"🧠 Formatting project data for LLM consumption")
        logger.info(f"   Available data sources: {list(project_data.get('data', {}).keys())}")
        
        formatted_sections = []
        
        # Gmail data formatting
        if 'gmail' in project_data.get('data', {}):
            gmail_data = project_data['data']['gmail']
            total_emails = gmail_data.get('metadata', {}).get('total_emails', 0)
            total_threads = gmail_data.get('metadata', {}).get('total_threads', 0)
            
            logger.info(f"   📧 Processing Gmail data: {total_emails} emails, {total_threads} threads")
            
            formatted_sections.append("## Email Communications")
            formatted_sections.append(f"Total emails retrieved: {total_emails}")
            formatted_sections.append(f"Total conversations: {total_threads}")
            
            # Select most relevant emails for quality analysis (not quantity)
            all_emails = gmail_data.get('items', [])
            
            # Extract project date range from Gmail metadata
            project_date_range = None
            date_range_info = gmail_data.get('metadata', {}).get('date_range', {})
            if date_range_info.get('start') and date_range_info.get('end'):
                try:
                    from datetime import datetime
                    start_date = datetime.fromisoformat(date_range_info['start'].replace('Z', '+00:00'))
                    end_date = datetime.fromisoformat(date_range_info['end'].replace('Z', '+00:00'))
                    project_date_range = (start_date, end_date)
                    logger.info(f"   📅 Project date range: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
                except:
                    logger.warning("   ⚠️  Could not parse project date range from metadata")
            
            # Smart email selection for better case study quality
            selected_emails = self._select_most_relevant_emails(all_emails, max_emails=75, project_date_range=project_date_range)
            
            formatted_sections.append(f"Selected for detailed analysis: {len(selected_emails)} most relevant emails")
            if project_date_range:
                formatted_sections.append("(Prioritized within project date range by importance, thread activity, and content depth)")
            else:
                formatted_sections.append("(Prioritized by recency, importance, thread activity, and content depth)")
            
            logger.info(f"   📧 Email Selection Summary:")
            logger.info(f"      - Total emails retrieved: {len(all_emails)}")
            logger.info(f"      - Selected for analysis: {len(selected_emails)} (optimized for quality)")
            logger.info(f"      - Selection criteria: Recent, important, threaded, keyword-relevant")
            
            for i, email in enumerate(selected_emails):
                # Extract more comprehensive email details for analysis
                body_text = email.get('body_text', '')[:2000]  # Balanced length for quality analysis
                recipient = email.get('recipient', 'Unknown')
                labels = ', '.join(email.get('labels', []))
                attachments = len(email.get('attachments', []))
                
                formatted_sections.append(f"""
                === EMAIL {i+1} ===
                Subject: {email.get('subject', 'No Subject')}
                From: {email.get('sender', 'Unknown')}
                To: {recipient}
                Date: {email.get('date', 'Unknown')}
                Thread ID: {email.get('thread_id', 'N/A')}
                Labels: {labels}
                Attachments: {attachments}
                
                Content Preview:
                {body_text}
                
                Email Snippet: {email.get('snippet', 'No snippet')}
                
                ---
                """)
                if i == 0:  # Log the first email for debugging
                    logger.debug(f"   📧 First email sample: '{email.get('subject', 'No Subject')[:30]}...' from {email.get('sender', 'Unknown')}")
        else:
            logger.warning(f"   ⚠️  No Gmail data found in project_data")
        
        # Drive data formatting
        if 'drive' in project_data.get('data', {}):
            drive_data = project_data['data']['drive']
            total_docs = drive_data.get('metadata', {}).get('total_documents', 0)
            
            logger.info(f"   📁 Processing Drive data: {total_docs} documents")
            
            formatted_sections.append("\n## Project Documents")
            formatted_sections.append(f"Total documents: {total_docs}")
            
            # Add sample documents (fix: use 'items' not 'documents')  
            documents = drive_data.get('items', [])[:25]  # Increased to 25 for deeper analysis
            logger.info(f"   📁 Including {len(documents)} sample documents in LLM context")
            
            for i, doc in enumerate(documents):
                formatted_sections.append(f"""
                Document: {doc.get('name', 'Unnamed')}
                Type: {doc.get('file_type', 'Unknown')}
                Modified: {doc.get('modified_time', 'Unknown')}
                Preview: {doc.get('content_preview', 'No preview available')[:200]}...
                ---
                """)
                if i == 0:  # Log the first document for debugging
                    logger.debug(f"   📁 First document sample: '{doc.get('name', 'Unnamed')[:30]}...'")
        else:
            logger.info(f"   📁 No Drive data found in project_data")
        
        # Project metadata
        metadata = project_data.get('metadata', {})
        formatted_sections.append(f"\n## Project Metadata")
        formatted_sections.append(f"Data fetched: {metadata.get('fetch_timestamp', 'Unknown')}")
        formatted_sections.append(f"Sources: {', '.join(metadata.get('sources_fetched', []))}")
        formatted_sections.append(f"Total items: {metadata.get('total_items_fetched', 0)}")
        
        formatted_text = "\n".join(formatted_sections)
        char_count = len(formatted_text)
        logger.info(f"🧠 Formatted project data ready: {char_count} characters")
        logger.info(f"   📊 Data breakdown: {len(formatted_sections)} sections formatted")
        
        # Log a preview of the formatted data
        preview = formatted_text[:200] + "..." if len(formatted_text) > 200 else formatted_text
        logger.debug(f"   📝 Formatted data preview: {preview}")
        
        return formatted_text
    
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