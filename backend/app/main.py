"""
FastAPI Main Application

Purpose: Entry point for the Research Assistant backend API
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os

from app.api.routes import (
    auth_router,
    research_router,
    projects_router,
    user_router,
)

# Create FastAPI app
app = FastAPI(
    title="Research Assistant API",
    description="AI-powered research specification generation",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# 🔹 CREATE DATABASE TABLES ON STARTUP (DEV ONLY)


# # CORS Configuration *original follow come code
# origins = [
#     "http://localhost:3000",  # Next.js dev server
#     "http://localhost:3001",
#     "https://research-assistant.vercel.app",  # Production frontend
#     os.getenv("FRONTEND_URL", "http://localhost:3000"),
# ]

# CORS Configuration
origins = [
    "http://localhost:3000",  # Next.js dev server
    "http://localhost:3001",
    "https://research-assistant.vercel.app",  # Production frontend
]

frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    origins.append(frontend_url)


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/")
async def root():
    return {
        "message": "Research Assistant API",
        "status": "running",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "database": "connected",  # TODO: Add actual DB check
        "openai": "connected",    # TODO: Add actual OpenAI check
    }


# Include routers
app.include_router(auth_router)
app.include_router(research_router)
app.include_router(projects_router)
app.include_router(user_router)


# # Global exception handler
# @app.exception_handler(Exception)
# async def global_exception_handler(request, exc):
#     return JSONResponse(
#         status_code=500,
#         content={
#             "detail": "Internal server error",
#             "error": str(exc) if os.getenv("DEBUG") == "true" else "Something went wrong"
#         }
#     )


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
