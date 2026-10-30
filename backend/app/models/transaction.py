import uuid
from sqlalchemy import Column, String, Integer, BigInteger, Numeric, DateTime, Text, UniqueConstraint
from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    investigation_id = Column(String(36), nullable=False, index=True)
    chain_id = Column(Integer, default=1, nullable=False)
    transaction_hash = Column(String(66), nullable=False, index=True)
    record_type = Column(String(16), nullable=False)  # 'native' or 'erc20'
    log_index = Column(Integer, nullable=True)

    block_number = Column(BigInteger, nullable=False)
    timestamp = Column(BigInteger, nullable=False)
    from_address = Column(String(42), nullable=False, index=True)
    to_address = Column(String(42), nullable=True, index=True)

    asset_contract = Column(String(42), nullable=True)
    asset_symbol = Column(String(32), nullable=True)
    asset_decimals = Column(Integer, nullable=True)

    raw_value = Column(Text, nullable=False)
    display_value = Column(Numeric(precision=38, scale=18), nullable=True)
    provider_payload = Column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("investigation_id", "transaction_hash", "log_index", "record_type", name="uq_tx_record"),
    )
