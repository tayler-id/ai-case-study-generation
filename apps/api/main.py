"""
FastAPI Main Application Entry Point

AI Case Study Generation Agent - Backend API
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import logging

# Import configuration and database
from config import settings
from database import init_database, get_session

# Import models to ensure they're registered with SQLModel
from models.user import User

# Import routers
from routers.auth_router import router as auth_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI instance
app = FastAPI(
    title="AI Case Study Generation API",
    version="1.0.0",
    description="API for the AI Case Study Generation application, handling user authentication, project scoping, and case study management."
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Initialize database on application startup"""
    try:
        logger.info("Starting application...")
        init_database()
        logger.info("Application started successfully")
    except Exception as e:
        logger.error(f"Failed to start application: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on application shutdown"""
    logger.info("Application shutting down...")

# Include routers
app.include_router(auth_router)

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "AI Case Study Generation API is running", "status": "healthy"}

@app.get("/health")
async def health_check():
    """Detailed health check endpoint"""
    return {
        "status": "healthy",
        "service": "ai-case-study-api",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    # Development server configuration
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("API_PORT", 8001)),
        reload=True
    )