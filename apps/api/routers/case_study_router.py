"""
Case Study Generation API Routes

Handles case study generation requests with streaming support for real-time updates.
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select
from sse_starlette.sse import EventSourceResponse

from database import get_session
from models.user import User
from models.case_study import (
    CaseStudy, 
    CaseStudyGenerationRequest, 
    CaseStudyResponse,
    CaseStudyStatus,
    CaseStudyStreamEvent,
    CaseStudyEvaluation,
    CaseStudyEvaluationRequest,
    CaseStudyEvaluationResponse
)
from services.llm_service import get_llm_service
from services.data_service import get_data_service
from routers.auth_router import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/case-study", tags=["case-study"])

@router.post("/generate")
async def start_case_study_generation(
    request: CaseStudyGenerationRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Start case study generation process
    Returns immediately with case study ID, actual generation runs in background
    """
    try:
        # Create case study record
        case_study = CaseStudy(
            user_id=uuid.UUID(current_user['id']),
            project_name=request.project_name,
            project_industry=request.project_industry,
            project_focus=request.project_focus,
            template_type=request.template_type,
            model_used=request.model_name,
            custom_instructions=request.custom_instructions,
            date_range_start=request.date_range_start,
            date_range_end=request.date_range_end,
            participants=request.participants,
            keywords=request.keywords,
            status=CaseStudyStatus.PENDING
        )
        
        session.add(case_study)
        session.commit()
        session.refresh(case_study)
        
        # Start background generation
        background_tasks.add_task(
            generate_case_study_background,
            case_study.id,
            uuid.UUID(current_user['id'])
        )
        
        return {
            "case_study_id": case_study.id,
            "status": "generation_started",
            "stream_url": f"/case-study/{case_study.id}/stream"
        }
        
    except Exception as e:
        logger.error(f"Failed to start case study generation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start generation: {str(e)}")

@router.post("/generate/stream")
async def generate_case_study_stream(
    request: CaseStudyGenerationRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Generate case study with real-time streaming and save to database
    """
    logger.info(f"🎬 Starting streaming case study generation for user {current_user['email']}")
    logger.info(f"   Project: {request.project_name}")
    logger.info(f"   Keywords: {request.keywords}")
    logger.info(f"   Participants: {request.participants}")
    logger.info(f"   Date range: {request.date_range_start} to {request.date_range_end}")
    logger.info(f"   Model: {request.model_name}")
    logger.info(f"   Template: {request.template_type}")
    
    # Create case study record for saving
    case_study = CaseStudy(
        user_id=uuid.UUID(current_user['id']),
        project_name=request.project_name,
        project_industry=request.project_industry,
        project_focus=request.project_focus,
        template_type=request.template_type,
        model_used=request.model_name,
        custom_instructions=request.custom_instructions,
        date_range_start=request.date_range_start,
        date_range_end=request.date_range_end,
        participants=request.participants,
        keywords=request.keywords,
        status=CaseStudyStatus.GENERATING,
        started_at=datetime.utcnow()
    )
    
    session.add(case_study)
    session.commit()
    session.refresh(case_study)
    
    logger.info(f"📝 Created case study record with ID: {case_study.id}")
    
    try:
        # Get project data first
        data_service = get_data_service()
        project_data = await data_service.fetch_all_project_data({
            "project_name": request.project_name,
            "keywords": request.keywords,
            "participant_emails": request.participants,
            "start_date": request.date_range_start.isoformat(),
            "end_date": request.date_range_end.isoformat()
        }, uuid.UUID(current_user['id']), session)
        
        # Extract email count information for UI display
        gmail_data = project_data.get('data', {}).get('gmail', {})
        email_count = len(gmail_data.get('items', [])) if gmail_data else 0
        total_emails_metadata = gmail_data.get('metadata', {}).get('total_emails', 0) if gmail_data else 0
        
        logger.info(f"📧 Email processing summary: {email_count} emails retrieved for case study generation")
        logger.info(f"📧 Total emails found in search: {total_emails_metadata}")
        
        # Generate case study with streaming
        llm_service = get_llm_service()
        
        async def stream_generator():
            full_content = ""
            sections_content = {}
            current_section = None
            
            try:
                # First, send email count metadata to the UI
                email_list = gmail_data.get('items', []) if gmail_data else []
                # Create summary of emails for UI display (first 50 for performance)
                email_summaries = []
                for i, email in enumerate(email_list[:50]):  # Show first 50 in UI
                    email_summaries.append({
                        "id": i + 1,
                        "subject": email.get('subject', 'No Subject'),
                        "sender": email.get('sender', 'Unknown'),
                        "recipient": email.get('recipient', 'Unknown'),
                        "date": email.get('date', ''),
                        "snippet": email.get('snippet', '')[:100] + "..." if len(email.get('snippet', '')) > 100 else email.get('snippet', ''),
                        "labels": email.get('labels', []),
                        "attachments": len(email.get('attachments', []))
                    })
                
                email_metadata = {
                    "type": "metadata",
                    "content": f"📧 Processing {email_count} emails for case study analysis",
                    "section": "data_summary",
                    "metadata": {
                        "emails_retrieved": email_count,
                        "total_emails_found": total_emails_metadata,
                        "gmail_connected": gmail_data is not None,
                        "email_list": email_summaries,
                        "showing_count": min(50, len(email_list)),
                        "case_study_id": case_study.id  # Include case study ID for saving
                    },
                    "timestamp": datetime.utcnow().isoformat()
                }
                
                yield {
                    "event": "chunk",
                    "data": json.dumps(email_metadata)
                }
                
                async for chunk in llm_service.generate_case_study_stream(
                    project_data=project_data,
                    model_name=request.model_name,
                    case_study_template=request.template_type.value,
                    custom_instructions=request.custom_instructions
                ):
                    # Track content for saving
                    if chunk.chunk_type == "section_start":
                        current_section = chunk.section_name
                        sections_content[current_section] = ""
                    elif chunk.chunk_type == "content":
                        # Always accumulate full content regardless of section  
                        full_content += chunk.content
                        # Also accumulate in current section if we have one
                        if current_section:
                            sections_content[current_section] += chunk.content
                        # Log content accumulation periodically
                        if len(full_content) % 500 == 0:  # Log every 500 characters
                            logger.info(f"📄 Content accumulated: {len(full_content)} characters")
                    
                    # Convert chunk to SSE format
                    event_data = {
                        "type": chunk.chunk_type,
                        "content": chunk.content,
                        "section": chunk.section_name,
                        "metadata": chunk.metadata,
                        "timestamp": chunk.timestamp.isoformat()
                    }
                    
                    yield {
                        "event": "chunk",
                        "data": json.dumps(event_data)
                    }
                    
                    # Small delay to prevent overwhelming the client
                    await asyncio.sleep(0.01)
                
                # Save completed case study to database
                logger.info(f"📝 Saving case study with content length: {len(full_content)} characters")
                case_study.full_content = full_content
                case_study.status = CaseStudyStatus.COMPLETED
                case_study.completed_at = datetime.utcnow()
                case_study.progress_percentage = 100
                
                # Extract executive summary and insights (basic implementation)
                if "Executive Summary" in sections_content:
                    case_study.executive_summary = sections_content["Executive Summary"]
                
                # Save generation metadata
                case_study.generation_metadata = {
                    "total_sections": len(sections_content),
                    "data_sources": ["gmail"] if gmail_data else [],
                    "emails_processed": email_count,
                    "generation_time_seconds": (datetime.utcnow() - case_study.started_at).total_seconds()
                }
                
                session.add(case_study)
                session.commit()
                
                logger.info(f"✅ Case study {case_study.id} completed and saved")
                
                # Send completion metadata
                completion_metadata = {
                    "type": "metadata",
                    "content": f"✅ Case study saved to dashboard",
                    "section": "completion",
                    "metadata": {
                        "case_study_id": case_study.id,
                        "generation_complete": True,
                        "saved_to_dashboard": True
                    },
                    "timestamp": datetime.utcnow().isoformat()
                }
                
                yield {
                    "event": "chunk",
                    "data": json.dumps(completion_metadata)
                }
                    
            except Exception as e:
                # Mark case study as failed
                case_study.status = CaseStudyStatus.FAILED
                case_study.generation_metadata = {"error": str(e)}
                session.add(case_study)
                session.commit()
                
                logger.error(f"Error in streaming generation: {str(e)}")
                yield {
                    "event": "error", 
                    "data": json.dumps({"error": str(e)})
                }
        
        return EventSourceResponse(stream_generator())
        
    except Exception as e:
        logger.error(f"Failed to stream case study generation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Streaming failed: {str(e)}")

@router.get("/{case_study_id}/stream")
async def stream_case_study_progress(
    case_study_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Stream real-time progress updates for a case study generation
    """
    # Verify case study belongs to user
    case_study = session.get(CaseStudy, case_study_id)
    if not case_study or case_study.user_id != uuid.UUID(current_user['id']):
        raise HTTPException(status_code=404, detail="Case study not found")
    
    async def stream_generator():
        last_update = datetime.utcnow()
        
        while True:
            try:
                # Refresh case study from DB
                session.refresh(case_study)
                
                # Send current status
                event_data = {
                    "case_study_id": case_study.id,
                    "status": case_study.status,
                    "progress": case_study.progress_percentage,
                    "current_section": case_study.current_section,
                    "updated_at": case_study.updated_at.isoformat()
                }
                
                yield {
                    "event": "progress",
                    "data": json.dumps(event_data)
                }
                
                # Break if completed or failed
                if case_study.status in [CaseStudyStatus.COMPLETED, CaseStudyStatus.FAILED, CaseStudyStatus.CANCELLED]:
                    # Send final status
                    final_data = event_data.copy()
                    if case_study.status == CaseStudyStatus.COMPLETED:
                        final_data.update({
                            "executive_summary": case_study.executive_summary,
                            "key_insights": case_study.key_insights,
                            "recommendations": case_study.recommendations,
                            "generation_metadata": case_study.generation_metadata
                        })
                    
                    yield {
                        "event": "complete",
                        "data": json.dumps(final_data)
                    }
                    break
                
                # Wait before next poll
                await asyncio.sleep(1)
                
            except Exception as e:
                logger.error(f"Error in progress streaming: {str(e)}")
                yield {
                    "event": "error",
                    "data": json.dumps({"error": str(e)})
                }
                break
    
    return EventSourceResponse(stream_generator())

@router.get("/{case_study_id}")
async def get_case_study(
    case_study_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> CaseStudyResponse:
    """Get case study by ID"""
    case_study = session.get(CaseStudy, case_study_id)
    if not case_study or case_study.user_id != uuid.UUID(current_user['id']):
        raise HTTPException(status_code=404, detail="Case study not found")
    
    return CaseStudyResponse(
        id=case_study.id,
        project_name=case_study.project_name,
        status=case_study.status,
        progress_percentage=case_study.progress_percentage,
        current_section=case_study.current_section,
        template_type=case_study.template_type,
        model_used=case_study.model_used,
        created_at=case_study.created_at,
        started_at=case_study.started_at,
        completed_at=case_study.completed_at,
        executive_summary=case_study.executive_summary if case_study.status == CaseStudyStatus.COMPLETED else None,
        key_insights=case_study.key_insights if case_study.status == CaseStudyStatus.COMPLETED else [],
        recommendations=case_study.recommendations if case_study.status == CaseStudyStatus.COMPLETED else [],
        full_content=case_study.full_content if case_study.status == CaseStudyStatus.COMPLETED else None,
        generation_metadata=case_study.generation_metadata
    )

@router.get("/")
async def list_case_studies(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
    limit: int = 20,
    offset: int = 0
) -> List[CaseStudyResponse]:
    """List case studies for the current user"""
    statement = (
        select(CaseStudy)
        .where(CaseStudy.user_id == uuid.UUID(current_user['id']))
        .order_by(CaseStudy.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    
    case_studies = session.exec(statement).all()
    
    return [
        CaseStudyResponse(
            id=cs.id,
            project_name=cs.project_name,
            status=cs.status,
            progress_percentage=cs.progress_percentage,
            current_section=cs.current_section,
            template_type=cs.template_type,
            model_used=cs.model_used,
            created_at=cs.created_at,
            started_at=cs.started_at,
            completed_at=cs.completed_at,
            generation_metadata=cs.generation_metadata
        )
        for cs in case_studies
    ]

@router.delete("/{case_study_id}")
async def delete_case_study(
    case_study_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> Dict[str, str]:
    """Delete a case study"""
    case_study = session.get(CaseStudy, case_study_id)
    if not case_study or case_study.user_id != uuid.UUID(current_user['id']):
        raise HTTPException(status_code=404, detail="Case study not found")
    
    session.delete(case_study)
    session.commit()
    
    return {"message": "Case study deleted successfully"}

async def generate_case_study_background(case_study_id: int, user_id: int):
    """
    Background task to generate case study content
    """
    from database import get_session
    
    session = next(get_session())
    
    try:
        # Get case study
        case_study = session.get(CaseStudy, case_study_id)
        if not case_study:
            logger.error(f"Case study {case_study_id} not found")
            return
        
        # Update status to generating
        case_study.status = CaseStudyStatus.GENERATING
        case_study.started_at = datetime.utcnow()
        case_study.progress_percentage = 5
        session.commit()
        
        # Get user for data access
        user = session.get(User, user_id)
        if not user:
            raise Exception("User not found")
        
        # Fetch project data
        case_study.current_section = "Fetching project data"
        case_study.progress_percentage = 10
        session.commit()
        
        data_service = get_data_service()
        project_data = await data_service.fetch_all_project_data({
            "project_name": case_study.project_name,
            "keywords": case_study.keywords,
            "participant_emails": case_study.participants,
            "start_date": case_study.date_range_start.isoformat(),
            "end_date": case_study.date_range_end.isoformat()
        }, user_id, session)
        
        case_study.progress_percentage = 20
        session.commit()
        
        # Generate case study
        case_study.current_section = "Generating case study"
        session.commit()
        
        llm_service = get_llm_service()
        result = await llm_service.generate_case_study_complete(
            project_data=project_data,
            model_name=case_study.model_used,
            case_study_template=case_study.template_type.value,
            custom_instructions=case_study.custom_instructions
        )
        
        # Parse and save results
        case_study.full_content = result["content"]
        case_study.generation_metadata = result["metadata"]
        
        # Extract key sections (basic implementation)
        content_lines = result["content"].split('\n')
        case_study.executive_summary = _extract_section(content_lines, "Executive Summary")
        case_study.key_insights = _extract_list_items(content_lines, "Key Insights", "Lessons Learned")  
        case_study.recommendations = _extract_list_items(content_lines, "Recommendations", "Best Practices")
        
        # Mark as completed
        case_study.status = CaseStudyStatus.COMPLETED
        case_study.completed_at = datetime.utcnow()
        case_study.progress_percentage = 100
        case_study.current_section = None
        
        session.commit()
        logger.info(f"Case study {case_study_id} generation completed")
        
    except Exception as e:
        logger.error(f"Case study generation failed: {str(e)}")
        case_study.status = CaseStudyStatus.FAILED
        case_study.generation_metadata = {"error": str(e)}
        case_study.progress_percentage = 0
        session.commit()
    
    finally:
        session.close()

def _extract_section(lines: List[str], section_name: str) -> Optional[str]:
    """Extract content from a specific section"""
    in_section = False
    section_content = []
    
    for line in lines:
        if section_name.lower() in line.lower() and ('##' in line or '#' in line):
            in_section = True
            continue
        elif in_section and ('##' in line or '#' in line):
            break
        elif in_section:
            section_content.append(line)
    
    return '\n'.join(section_content).strip() if section_content else None

def _extract_list_items(lines: List[str], *section_names: str) -> List[str]:
    """Extract list items from specific sections"""
    items = []
    in_section = False
    
    for line in lines:
        # Check if we're entering a target section
        if any(name.lower() in line.lower() for name in section_names) and ('##' in line or '#' in line):
            in_section = True
            continue
        # Check if we're leaving the section  
        elif in_section and ('##' in line or '#' in line):
            break
        # Extract list items
        elif in_section and (line.strip().startswith('-') or line.strip().startswith('*')):
            item = line.strip().lstrip('- *').strip()
            if item:
                items.append(item)
    
    return items

# Evaluation endpoints

@router.post("/{case_study_id}/evaluation")
async def submit_case_study_evaluation(
    case_study_id: int,
    evaluation_request: CaseStudyEvaluationRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> CaseStudyEvaluationResponse:
    """Submit or update evaluation for a case study"""
    
    # Verify case study exists and belongs to user
    case_study = session.get(CaseStudy, case_study_id)
    if not case_study or case_study.user_id != uuid.UUID(current_user['id']):
        raise HTTPException(status_code=404, detail="Case study not found")
    
    # Check if evaluation already exists for this user and case study
    existing_evaluation = session.exec(
        select(CaseStudyEvaluation)
        .where(CaseStudyEvaluation.case_study_id == case_study_id)
        .where(CaseStudyEvaluation.user_id == uuid.UUID(current_user['id']))
    ).first()
    
    if existing_evaluation:
        # Update existing evaluation
        if evaluation_request.accuracy_rating is not None:
            existing_evaluation.accuracy_rating = evaluation_request.accuracy_rating
        if evaluation_request.usefulness_rating is not None:
            existing_evaluation.usefulness_rating = evaluation_request.usefulness_rating
        if evaluation_request.comment is not None:
            existing_evaluation.comment = evaluation_request.comment
        existing_evaluation.updated_at = datetime.utcnow()
        
        session.add(existing_evaluation)
        session.commit()
        session.refresh(existing_evaluation)
        evaluation = existing_evaluation
    else:
        # Create new evaluation
        evaluation = CaseStudyEvaluation(
            case_study_id=case_study_id,
            user_id=uuid.UUID(current_user['id']),
            accuracy_rating=evaluation_request.accuracy_rating,
            usefulness_rating=evaluation_request.usefulness_rating,
            comment=evaluation_request.comment
        )
        
        session.add(evaluation)
        session.commit()
        session.refresh(evaluation)
    
    return CaseStudyEvaluationResponse(
        id=evaluation.id,
        case_study_id=evaluation.case_study_id,
        accuracy_rating=evaluation.accuracy_rating,
        usefulness_rating=evaluation.usefulness_rating,
        comment=evaluation.comment,
        created_at=evaluation.created_at,
        updated_at=evaluation.updated_at
    )

@router.get("/evaluations/all")
async def get_all_evaluations(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
    limit: int = 100,
    offset: int = 0
) -> List[Dict[str, Any]]:
    """Get all evaluations with case study details (admin view)"""
    
    # Get evaluations with case study information
    statement = (
        select(CaseStudyEvaluation, CaseStudy.project_name, CaseStudy.created_at.label('case_study_created'))
        .join(CaseStudy, CaseStudyEvaluation.case_study_id == CaseStudy.id)
        .where(CaseStudy.user_id == uuid.UUID(current_user['id']))  # Only user's own case studies
        .order_by(CaseStudyEvaluation.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    
    results = session.exec(statement).all()
    
    evaluations = []
    for evaluation, project_name, case_study_created in results:
        evaluations.append({
            "id": evaluation.id,
            "case_study_id": evaluation.case_study_id,
            "project_name": project_name,
            "accuracy_rating": evaluation.accuracy_rating,
            "usefulness_rating": evaluation.usefulness_rating,
            "comment": evaluation.comment,
            "evaluation_created_at": evaluation.created_at,
            "case_study_created_at": case_study_created
        })
    
    return evaluations

@router.get("/evaluations/stats")
async def get_evaluation_stats(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Get evaluation statistics for the user's case studies"""
    
    # Get all evaluations for user's case studies
    statement = (
        select(CaseStudyEvaluation)
        .join(CaseStudy, CaseStudyEvaluation.case_study_id == CaseStudy.id)
        .where(CaseStudy.user_id == uuid.UUID(current_user['id']))
    )
    
    evaluations = session.exec(statement).all()
    
    if not evaluations:
        return {
            "total_evaluations": 0,
            "average_accuracy": 0,
            "average_usefulness": 0,
            "accuracy_distribution": {},
            "usefulness_distribution": {},
            "has_comments": 0
        }
    
    # Calculate statistics
    accuracy_ratings = [e.accuracy_rating for e in evaluations if e.accuracy_rating is not None]
    usefulness_ratings = [e.usefulness_rating for e in evaluations if e.usefulness_rating is not None]
    
    accuracy_dist = {}
    usefulness_dist = {}
    
    for rating in accuracy_ratings:
        accuracy_dist[rating] = accuracy_dist.get(rating, 0) + 1
    
    for rating in usefulness_ratings:
        usefulness_dist[rating] = usefulness_dist.get(rating, 0) + 1
    
    return {
        "total_evaluations": len(evaluations),
        "average_accuracy": sum(accuracy_ratings) / len(accuracy_ratings) if accuracy_ratings else 0,
        "average_usefulness": sum(usefulness_ratings) / len(usefulness_ratings) if usefulness_ratings else 0,
        "accuracy_distribution": accuracy_dist,
        "usefulness_distribution": usefulness_dist,
        "has_comments": len([e for e in evaluations if e.comment and e.comment.strip()])
    }

@router.get("/{case_study_id}/evaluation")
async def get_case_study_evaluation(
    case_study_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> Optional[CaseStudyEvaluationResponse]:
    """Get existing evaluation for a case study by the current user"""
    
    # Verify case study exists and belongs to user
    case_study = session.get(CaseStudy, case_study_id)
    if not case_study or case_study.user_id != uuid.UUID(current_user['id']):
        raise HTTPException(status_code=404, detail="Case study not found")
    
    # Get evaluation
    evaluation = session.exec(
        select(CaseStudyEvaluation)
        .where(CaseStudyEvaluation.case_study_id == case_study_id)
        .where(CaseStudyEvaluation.user_id == uuid.UUID(current_user['id']))
    ).first()
    
    if not evaluation:
        return None
    
    return CaseStudyEvaluationResponse(
        id=evaluation.id,
        case_study_id=evaluation.case_study_id,
        accuracy_rating=evaluation.accuracy_rating,
        usefulness_rating=evaluation.usefulness_rating,
        comment=evaluation.comment,
        created_at=evaluation.created_at,
        updated_at=evaluation.updated_at
    )
