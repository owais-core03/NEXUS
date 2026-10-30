from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional
from datetime import datetime
import re

ETH_ADDRESS_PATTERN = re.compile(r"^0x[a-fA-F0-9]{40}$")


class HealthResponse(BaseModel):
    status: str = "healthy"
    version: str = "0.1.0"
    etherscan_configured: bool
    tinyfish_configured: bool
    timestamp: datetime


class InvestigationCreate(BaseModel):
    address: str = Field(..., description="Ethereum wallet address (0x...)")
    chain_id: int = Field(default=1, description="Ethereum chain ID (1 = Mainnet)")

    @field_validator("address")
    @classmethod
    def validate_eth_address(cls, v: str) -> str:
        v_clean = v.strip()
        if not ETH_ADDRESS_PATTERN.match(v_clean):
            raise ValueError("Invalid Ethereum address format. Must be 0x followed by 40 hex characters.")
        return v_clean


class InvestigationResponse(BaseModel):
    id: str
    target_address: str
    chain_id: int
    status: str
    created_at: datetime
    updated_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
