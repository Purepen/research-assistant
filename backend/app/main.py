"""
FastAPI Main Application
"""

# ============================================================
# CRITICAL: Load .env FIRST — before ANY other import
# that might call os.getenv() at module load time
# (e.g. adapters, auth_service, agent definitions)
# ============================================================
from dotenv import load_dotenv
load_dotenv()  # reads backend/.env into os.environ immediately
# ============================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from app.api.routes import (
    auth_router,
    research_router,
    projects_router,
    user_router,
)

app = FastAPI(
    title="Research Assistant API",
    description="AI-powered research specification generation",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://research-assistant.vercel.app",
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
    openai_ok = bool(os.getenv("OPENAI_API_KEY"))
    anthropic_ok = bool(os.getenv("ANTHROPIC_API_KEY"))
    return {
        "status": "healthy",
        "openai_key_loaded": openai_ok,
        "anthropic_key_loaded": anthropic_ok,
    }


app.include_router(auth_router)
app.include_router(research_router)
app.include_router(projects_router)
app.include_router(user_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)