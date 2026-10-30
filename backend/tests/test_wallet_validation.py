import pytest
from pydantic import ValidationError
from app.schemas.wallet import InvestigationCreate


def test_valid_ethereum_address():
    valid_addr = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
    payload = InvestigationCreate(address=valid_addr, chain_id=1)
    assert payload.address == valid_addr
    assert payload.chain_id == 1


def test_invalid_ethereum_address_too_short():
    with pytest.raises(ValidationError):
        InvestigationCreate(address="0x12345", chain_id=1)


def test_invalid_ethereum_address_non_hex():
    with pytest.raises(ValidationError):
        InvestigationCreate(address="0xZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ", chain_id=1)


def test_invalid_ethereum_address_no_prefix():
    with pytest.raises(ValidationError):
        InvestigationCreate(address="d8dA6BF26964aF9D7eEd9e03E53415D37aA96045", chain_id=1)
