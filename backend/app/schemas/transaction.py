from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from decimal import Decimal


class TransactionResponse(BaseModel):
    id: str
    investigation_id: str
    chain_id: int
    transaction_hash: str
    record_type: str  # 'native' or 'erc20'
    log_index: Optional[int] = None
    block_number: int
    timestamp: int
    from_address: str
    to_address: Optional[str] = None
    asset_contract: Optional[str] = None
    asset_symbol: Optional[str] = None
    asset_decimals: Optional[int] = None
    raw_value: str
    display_value: Optional[Decimal] = None

    model_config = ConfigDict(from_attributes=True)


class TransactionListResponse(BaseModel):
    investigation_id: str
    total_records: int
    native_count: int
    erc20_count: int
    transactions: List[TransactionResponse]


class WalletSummaryResponse(BaseModel):
    address: str
    chain_id: int
    native_tx_count: int
    erc20_transfer_count: int
    total_eth_sent: Decimal
    total_eth_received: Decimal
    first_seen_timestamp: Optional[int] = None
    last_seen_timestamp: Optional[int] = None
    unique_counterparties: int
