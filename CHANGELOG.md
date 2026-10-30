# NEXUS - Changelog

All notable changes, phase progressions, tests run, and architecture milestones are recorded here.

## [Phase 1 - Ethereum Data Retrieval] - 2026-10-30

### Completed
- **Etherscan API V2 Client**:
  - Implemented in `backend/app/services/etherscan_client.py` using `https://api.etherscan.io/v2/api` with `chainid=1`.
  - Configured native transactions (`action=txlist`) and ERC-20 transfers (`action=tokentx`).
  - Strict timeout (30s), rate-limit backoff handling, and error response trapping.
- **Transaction Normalizer**:
  - Implemented in `backend/app/services/transaction_normalizer.py`.
  - Decimal-safe wei-to-ETH conversion using Python `Decimal` (`10^18`).
  - Decimal-aware ERC-20 token value calculation with token decimals validation.
  - Full audit trail preservation via `provider_payload` JSON storage.
- **API Endpoints**:
  - `POST /api/investigations`: Address format validation, initiates live fetch, stores deduplicated records in SQLite, returns investigation record.
  - `GET /api/investigations/{id}`: Returns investigation status and metadata.
  - `GET /api/investigations/{id}/transactions`: Returns normalized transactions with native/ERC-20 filtering.
  - `GET /api/investigations/{id}/summary`: Computes on-chain metrics (total ETH sent/received, unique counterparties, active range).
- **Testing & Verification**:
  - 10 automated unit tests passing in pytest (`test_health.py`, `test_wallet_validation.py`, `test_normalizer.py`).
  - Live mainnet test performed on target `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045` (vitalik.eth):
    - 980 total live records retrieved (500 native + 480 ERC-20).
    - 409 unique counterparties tracked.
    - Invalid address inputs confirmed returning HTTP 422.

---

## [Phase 0 - Project Foundation] - 2026-10-30

### Completed
- Project root set to `C:\NEXUS`.
- Modular FastAPI backend + React/Vite/Tailwind frontend.
- SQLite database schema initialized.
- UI UX Pro Max toolkit integrated and design tokens persisted in `C:\NEXUS\design-system\MASTER.md`.
