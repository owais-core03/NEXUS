import logging
from datetime import datetime, timezone
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.investigation import Investigation
from app.models.transaction import Transaction
from app.schemas.wallet import InvestigationCreate, InvestigationResponse
from app.schemas.transaction import TransactionListResponse, TransactionResponse, WalletSummaryResponse
from app.services.etherscan_client import EtherscanClient, EtherscanClientError, EtherscanRateLimitError
from app.services.transaction_normalizer import normalize_native_transaction, normalize_erc20_transfer

logger = logging.getLogger("nexus.investigations")
router = APIRouter(prefix="/investigations", tags=["investigations"])


@router.post("", response_model=InvestigationResponse, status_code=201)
def create_investigation(payload: InvestigationCreate, db: Session = Depends(get_db)):
    """
    Start an Ethereum wallet investigation and fetch on-chain transactions via Etherscan API V2.
    """
    clean_address = payload.address.strip().lower()

    # Create investigation record
    now = datetime.now(timezone.utc)
    investigation = Investigation(
        target_address=clean_address,
        chain_id=payload.chain_id,
        status="fetching_transactions",
        started_at=now,
    )
    db.add(investigation)
    db.commit()
    db.refresh(investigation)

    client = EtherscanClient(chain_id=payload.chain_id)

    raw_native = []
    raw_erc20 = []
    warning_messages = []

    # 1. Fetch native ETH transactions
    try:
        raw_native = client.get_native_transactions(clean_address)
    except EtherscanRateLimitError as e:
        logger.warning(f"Rate limited fetching native txs for {clean_address}: {e}")
        warning_messages.append(f"Native transactions rate limit: {str(e)}")
    except EtherscanClientError as e:
        logger.error(f"Error fetching native txs for {clean_address}: {e}")
        warning_messages.append(f"Native transactions error: {str(e)}")

    # 2. Fetch ERC-20 transfers
    try:
        raw_erc20 = client.get_erc20_transfers(clean_address)
    except EtherscanRateLimitError as e:
        logger.warning(f"Rate limited fetching ERC-20 transfers for {clean_address}: {e}")
        warning_messages.append(f"ERC-20 transfers rate limit: {str(e)}")
    except EtherscanClientError as e:
        logger.error(f"Error fetching ERC-20 transfers for {clean_address}: {e}")
        warning_messages.append(f"ERC-20 transfers error: {str(e)}")

    # 3. Normalize & Deduplicate
    seen_keys = set()
    records_to_insert = []

    for item in raw_native:
        record = normalize_native_transaction(item, investigation.id, payload.chain_id)
        key = (record.transaction_hash, record.log_index, record.record_type)
        if key not in seen_keys:
            seen_keys.add(key)
            records_to_insert.append(record)

    for item in raw_erc20:
        record = normalize_erc20_transfer(item, investigation.id, payload.chain_id)
        key = (record.transaction_hash, record.log_index, record.record_type)
        if key not in seen_keys:
            seen_keys.add(key)
            records_to_insert.append(record)

    if records_to_insert:
        db.add_all(records_to_insert)

    # 4. Update Investigation Status
    investigation.completed_at = datetime.now(timezone.utc)
    if warning_messages:
        investigation.status = "completed_with_warnings"
        investigation.error_message = "; ".join(warning_messages)
    else:
        investigation.status = "completed"

    db.commit()
    db.refresh(investigation)
    return investigation


@router.get("/{investigation_id}", response_model=InvestigationResponse)
def get_investigation(investigation_id: str, db: Session = Depends(get_db)):
    """Retrieve investigation status and metadata by ID."""
    investigation = db.query(Investigation).filter(Investigation.id == investigation_id).first()
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return investigation


@router.get("/{investigation_id}/transactions", response_model=TransactionListResponse)
def get_investigation_transactions(
    investigation_id: str,
    record_type: Optional[str] = Query(None, description="'native' or 'erc20'"),
    db: Session = Depends(get_db)
):
    """Retrieve normalized transaction records for an investigation."""
    investigation = db.query(Investigation).filter(Investigation.id == investigation_id).first()
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")

    query = db.query(Transaction).filter(Transaction.investigation_id == investigation_id)
    if record_type:
        query = query.filter(Transaction.record_type == record_type)

    txs = query.order_by(Transaction.timestamp.desc()).all()

    native_count = sum(1 for t in txs if t.record_type == "native")
    erc20_count = sum(1 for t in txs if t.record_type == "erc20")

    return TransactionListResponse(
        investigation_id=investigation_id,
        total_records=len(txs),
        native_count=native_count,
        erc20_count=erc20_count,
        transactions=txs
    )


@router.get("/{investigation_id}/summary", response_model=WalletSummaryResponse)
def get_investigation_summary(investigation_id: str, db: Session = Depends(get_db)):
    """Compute high-level summary metrics from retrieved records."""
    investigation = db.query(Investigation).filter(Investigation.id == investigation_id).first()
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")

    target = investigation.target_address.lower()
    txs = db.query(Transaction).filter(Transaction.investigation_id == investigation_id).all()

    native_count = 0
    erc20_count = 0
    total_sent = Decimal("0")
    total_received = Decimal("0")
    counterparties = set()
    timestamps = []

    for tx in txs:
        timestamps.append(tx.timestamp)
        if tx.from_address and tx.from_address != target:
            counterparties.add(tx.from_address)
        if tx.to_address and tx.to_address != target:
            counterparties.add(tx.to_address)

        if tx.record_type == "native":
            native_count += 1
            if tx.display_value:
                if tx.from_address == target:
                    total_sent += tx.display_value
                elif tx.to_address == target:
                    total_received += tx.display_value
        elif tx.record_type == "erc20":
            erc20_count += 1

    first_seen = min(timestamps) if timestamps else None
    last_seen = max(timestamps) if timestamps else None

    return WalletSummaryResponse(
        address=investigation.target_address,
        chain_id=investigation.chain_id,
        native_tx_count=native_count,
        erc20_transfer_count=erc20_count,
        total_eth_sent=total_sent,
        total_eth_received=total_received,
        first_seen_timestamp=first_seen,
        last_seen_timestamp=last_seen,
        unique_counterparties=len(counterparties)
    )
