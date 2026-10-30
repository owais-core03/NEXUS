import json
import logging
from decimal import Decimal, InvalidOperation
from typing import Dict, Any, Optional
from app.models.transaction import Transaction

logger = logging.getLogger("nexus.normalizer")

WEI_IN_ETH = Decimal("1000000000000000000")


def safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def safe_decimal_wei_to_eth(wei_str: Any) -> Optional[Decimal]:
    """Convert wei string/int to Decimal ETH safely."""
    if wei_str is None:
        return None
    try:
        wei_dec = Decimal(str(wei_str).strip())
        return (wei_dec / WEI_IN_ETH).quantize(Decimal("0.000000000000000001"))
    except (InvalidOperation, TypeError, ValueError):
        logger.warning(f"Could not convert wei value '{wei_str}' to Decimal ETH.")
        return None


def safe_token_value(raw_val: Any, decimals: Optional[int]) -> Optional[Decimal]:
    """Convert raw token uint256 to human-readable Decimal if decimals are known."""
    if raw_val is None or decimals is None or decimals < 0:
        return None
    try:
        val_dec = Decimal(str(raw_val).strip())
        factor = Decimal(10) ** decimals
        return val_dec / factor
    except (InvalidOperation, TypeError, ValueError):
        return None


def normalize_native_transaction(raw: Dict[str, Any], investigation_id: str, chain_id: int = 1) -> Transaction:
    """Normalize a raw Etherscan txlist record into a Transaction model."""
    tx_hash = str(raw.get("hash", "")).lower()
    from_addr = str(raw.get("from", "")).lower()
    to_addr = raw.get("to")
    if to_addr:
        to_addr = str(to_addr).lower()
    else:
        to_addr = None  # Contract creation

    raw_val = str(raw.get("value", "0"))
    display_eth = safe_decimal_wei_to_eth(raw_val)

    return Transaction(
        investigation_id=investigation_id,
        chain_id=chain_id,
        transaction_hash=tx_hash,
        record_type="native",
        log_index=None,
        block_number=safe_int(raw.get("blockNumber")),
        timestamp=safe_int(raw.get("timeStamp")),
        from_address=from_addr,
        to_address=to_addr,
        asset_contract=None,
        asset_symbol="ETH",
        asset_decimals=18,
        raw_value=raw_val,
        display_value=display_eth,
        provider_payload=json.dumps(raw, separators=(",", ":")),
    )


def normalize_erc20_transfer(raw: Dict[str, Any], investigation_id: str, chain_id: int = 1) -> Transaction:
    """Normalize a raw Etherscan tokentx record into a Transaction model."""
    tx_hash = str(raw.get("hash", "")).lower()
    from_addr = str(raw.get("from", "")).lower()
    to_addr = str(raw.get("to", "")).lower() if raw.get("to") else None
    contract_addr = str(raw.get("contractAddress", "")).lower() if raw.get("contractAddress") else None

    raw_val = str(raw.get("value", "0"))
    decimals_raw = raw.get("tokenDecimal")
    token_decimals = safe_int(decimals_raw) if decimals_raw is not None and str(decimals_raw).isdigit() else None
    token_symbol = str(raw.get("tokenSymbol", ""))[:32] or "UNKNOWN"

    display_val = safe_token_value(raw_val, token_decimals)

    log_idx = safe_int(raw.get("logIndex")) if raw.get("logIndex") is not None else None

    return Transaction(
        investigation_id=investigation_id,
        chain_id=chain_id,
        transaction_hash=tx_hash,
        record_type="erc20",
        log_index=log_idx,
        block_number=safe_int(raw.get("blockNumber")),
        timestamp=safe_int(raw.get("timeStamp")),
        from_address=from_addr,
        to_address=to_addr,
        asset_contract=contract_addr,
        asset_symbol=token_symbol,
        asset_decimals=token_decimals,
        raw_value=raw_val,
        display_value=display_val,
        provider_payload=json.dumps(raw, separators=(",", ":")),
    )
