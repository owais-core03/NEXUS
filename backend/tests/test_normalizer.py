from decimal import Decimal
from app.services.transaction_normalizer import (
    safe_decimal_wei_to_eth,
    safe_token_value,
    normalize_native_transaction,
    normalize_erc20_transfer,
)


def test_wei_to_eth_conversion():
    assert safe_decimal_wei_to_eth("1000000000000000000") == Decimal("1.000000000000000000")
    assert safe_decimal_wei_to_eth("500000000000000000") == Decimal("0.500000000000000000")
    assert safe_decimal_wei_to_eth("0") == Decimal("0.000000000000000000")
    assert safe_decimal_wei_to_eth(None) is None
    assert safe_decimal_wei_to_eth("invalid") is None


def test_token_value_conversion():
    # USDT has 6 decimals
    assert safe_token_value("1000000", 6) == Decimal("1")
    assert safe_token_value("50000000", 6) == Decimal("50")
    # DAI has 18 decimals
    assert safe_token_value("1000000000000000000", 18) == Decimal("1")
    assert safe_token_value("100", None) is None


def test_normalize_native_tx():
    raw_tx = {
        "hash": "0x123abc456def",
        "from": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        "to": "0x28C6c06298d514Db089934071355E5743bf21d60",
        "value": "2000000000000000000",
        "blockNumber": "19000000",
        "timeStamp": "1700000000",
    }
    tx = normalize_native_transaction(raw_tx, investigation_id="test-inv-1", chain_id=1)
    assert tx.record_type == "native"
    assert tx.transaction_hash == "0x123abc456def"
    assert tx.from_address == "0xd8da6bf26964af9d7eed9e03e53415d37aa96045"
    assert tx.to_address == "0x28c6c06298d514db089934071355e5743bf21d60"
    assert tx.display_value == Decimal("2.000000000000000000")
    assert tx.asset_symbol == "ETH"
    assert tx.block_number == 19000000


def test_normalize_erc20_tx():
    raw_erc20 = {
        "hash": "0x789xyz",
        "from": "0xAlice",
        "to": "0xBob",
        "contractAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        "tokenSymbol": "USDT",
        "tokenDecimal": "6",
        "value": "15000000",
        "blockNumber": "19000001",
        "timeStamp": "1700000010",
        "logIndex": "5",
    }
    tx = normalize_erc20_transfer(raw_erc20, investigation_id="test-inv-2", chain_id=1)
    assert tx.record_type == "erc20"
    assert tx.transaction_hash == "0x789xyz"
    assert tx.asset_symbol == "USDT"
    assert tx.asset_decimals == 6
    assert tx.display_value == Decimal("15")
    assert tx.log_index == 5
