import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class Entity(Base):
    __tablename__ = "entities"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(128), nullable=False, unique=True)
    entity_type = Column(String(64), nullable=False)  # e.g., 'VASP', 'DEX', 'Bridge'
    website = Column(String(256), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    addresses = relationship("KnownAddress", back_populates="entity")


class KnownAddress(Base):
    __tablename__ = "known_addresses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    address = Column(String(42), nullable=False, index=True)  # stored in lowercase
    chain_id = Column(Integer, default=1, nullable=False)
    entity_id = Column(String(36), ForeignKey("entities.id"), nullable=False)

    source_url = Column(String(512), nullable=False)
    source_description = Column(Text, nullable=False)
    verification_status = Column(String(32), default="verified", nullable=False)
    last_verified_at = Column(String(32), nullable=True)
    dataset_name = Column(String(128), nullable=True)
    dataset_version = Column(String(32), nullable=True)

    entity = relationship("Entity", back_populates="addresses")
