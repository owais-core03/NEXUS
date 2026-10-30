import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class ResearchRun(Base):
    __tablename__ = "research_runs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    investigation_id = Column(String(36), ForeignKey("investigations.id"), nullable=False, index=True)
    candidate_entity_id = Column(String(36), nullable=True)
    status = Column(String(32), default="pending", nullable=False)
    error_message = Column(Text, nullable=True)
    provider_run_id = Column(String(128), nullable=True)

    started_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    investigation_id = Column(String(36), ForeignKey("investigations.id"), nullable=False, index=True)
    research_run_id = Column(String(36), ForeignKey("research_runs.id"), nullable=True)
    candidate_entity_id = Column(String(36), nullable=True)

    evidence_type = Column(String(64), nullable=False)
    claim = Column(Text, nullable=False)
    source_url = Column(String(512), nullable=False)
    source_title = Column(String(256), nullable=False)
    supporting_excerpt = Column(Text, nullable=False)
    published_at = Column(String(64), nullable=True)
    retrieved_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    source_reliability_note = Column(Text, nullable=True)


class Report(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    investigation_id = Column(String(36), ForeignKey("investigations.id"), nullable=False, unique=True, index=True)
    report_json = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
