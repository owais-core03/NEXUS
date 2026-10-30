import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    ETHERSCAN_API_KEY: str = Field(default="", description="Etherscan API key for on-chain retrieval")
    TINYFISH_API_KEY: str = Field(default="", description="TinyFish API key for public-web research")
    LLM_API_KEY: str = Field(default="", description="LLM API key for structured synthesis")

    DATABASE_URL: str = Field(default="sqlite:///./nexus.db", description="SQLAlchemy database URL")
    ETHERSCAN_CHAIN_ID: int = Field(default=1, description="Ethereum chain ID (1 = Mainnet)")

    MAX_TRANSACTIONS_PER_WALLET: int = Field(default=500, description="Max transactions to retrieve per wallet")
    MAX_GRAPH_HOPS: int = Field(default=3, description="Max hops for bounded path search")
    REQUEST_TIMEOUT_SECONDS: int = Field(default=30, description="Outbound HTTP timeout in seconds")

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
