import logging
import requests
from typing import Dict, Any, List, Optional
from app.config import settings

logger = logging.getLogger("nexus.etherscan")

ETHERSCAN_V2_BASE_URL = "https://api.etherscan.io/v2/api"


class EtherscanClientError(Exception):
    """Base exception for Etherscan client errors."""
    pass


class EtherscanRateLimitError(EtherscanClientError):
    """Raised when Etherscan rate limit is exceeded."""
    pass


class EtherscanClient:
    def __init__(self, api_key: Optional[str] = None, chain_id: Optional[int] = None, timeout: Optional[int] = None):
        self.api_key = api_key or settings.ETHERSCAN_API_KEY
        self.chain_id = chain_id or settings.ETHERSCAN_CHAIN_ID
        self.timeout = timeout or settings.REQUEST_TIMEOUT_SECONDS

        if not self.api_key or self.api_key == "replace_me":
            logger.warning("Etherscan API key is not configured.")

    def _call(self, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Execute a GET request to Etherscan API V2 and extract the result array."""
        if not self.api_key or self.api_key == "replace_me":
            raise EtherscanClientError("Etherscan API key is missing or not configured.")

        request_params = {
            "chainid": self.chain_id,
            "apikey": self.api_key,
            **params,
        }

        try:
            response = requests.get(
                ETHERSCAN_V2_BASE_URL,
                params=request_params,
                timeout=self.timeout
            )
            response.raise_for_status()
            data = response.json()
        except requests.exceptions.Timeout:
            logger.error(f"Etherscan request timed out after {self.timeout}s.")
            raise EtherscanClientError("Etherscan request timed out.")
        except requests.exceptions.RequestException as e:
            logger.error(f"Etherscan HTTP network error: {e}")
            raise EtherscanClientError(f"Etherscan network error: {str(e)}")
        except ValueError:
            logger.error("Failed to parse Etherscan response as JSON.")
            raise EtherscanClientError("Etherscan returned an invalid non-JSON payload.")

        status = str(data.get("status", "0"))
        message = data.get("message", "")
        result = data.get("result")

        # Handle rate limits
        if "Max rate limit reached" in str(result) or "rate limit" in str(message).lower():
            logger.warning("Etherscan rate limit encountered.")
            raise EtherscanRateLimitError("Etherscan rate limit exceeded. Please retry shortly.")

        # Etherscan status == "0" can mean either "No transactions found" (normal empty) or an error
        if status == "0":
            if message == "No transactions found" or result == [] or result is None:
                return []
            # Error condition
            err_msg = str(result) if result else message
            logger.error(f"Etherscan API error: {err_msg}")
            raise EtherscanClientError(f"Etherscan API returned error: {err_msg}")

        if isinstance(result, list):
            return result
        return []

    def get_native_transactions(
        self,
        address: str,
        start_block: int = 0,
        end_block: int = 99999999,
        offset: int = 500,
        sort: str = "desc"
    ) -> List[Dict[str, Any]]:
        """
        Fetch bounded native ETH transactions for an address.
        Etherscan API V2 txlist endpoint.
        """
        params = {
            "module": "account",
            "action": "txlist",
            "address": address,
            "startblock": start_block,
            "endblock": end_block,
            "page": 1,
            "offset": min(offset, settings.MAX_TRANSACTIONS_PER_WALLET),
            "sort": sort,
        }
        return self._call(params)

    def get_erc20_transfers(
        self,
        address: str,
        start_block: int = 0,
        end_block: int = 99999999,
        offset: int = 500,
        sort: str = "desc"
    ) -> List[Dict[str, Any]]:
        """
        Fetch bounded ERC-20 token transfers for an address.
        Etherscan API V2 tokentx endpoint.
        """
        params = {
            "module": "account",
            "action": "tokentx",
            "address": address,
            "startblock": start_block,
            "endblock": end_block,
            "page": 1,
            "offset": min(offset, settings.MAX_TRANSACTIONS_PER_WALLET),
            "sort": sort,
        }
        return self._call(params)
