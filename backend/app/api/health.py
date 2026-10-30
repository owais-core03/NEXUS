from fastapi import APIRouter
from datetime import datetime, timezone
from app.config import settings
from app.schemas.wallet import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def get_health():
    return HealthResponse(
        status="healthy",
        version="0.1.0",
        etherscan_configured=bool(settings.ETHERSCAN_API_KEY and settings.ETHERSCAN_API_KEY != "replace_me"),
        tinyfish_configured=bool(settings.TINYFISH_API_KEY and settings.TINYFISH_API_KEY != "replace_me"),
        timestamp=datetime.now(timezone.utc),
    )
