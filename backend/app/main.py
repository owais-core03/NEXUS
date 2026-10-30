import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.health import router as health_router
from app.api.investigations import router as investigations_router
from app.database import init_db

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("nexus")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing NEXUS SQLite database schema...")
    init_db()
    logger.info("NEXUS backend initialized successfully.")
    yield
    logger.info("NEXUS backend shutting down.")


app = FastAPI(
    title="NEXUS API",
    description="Blockchain Intelligence & Evidence-Based VASP Attribution",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error processing {request.method} {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred while processing the request."}
    )

# Include routers
app.include_router(health_router, prefix="/api")
app.include_router(investigations_router, prefix="/api")


@app.get("/")
def root():
    return {
        "service": "NEXUS API",
        "description": "Ethereum Blockchain Intelligence & Evidence-Based VASP Attribution",
        "version": "0.1.0",
        "health_check": "/api/health"
    }
