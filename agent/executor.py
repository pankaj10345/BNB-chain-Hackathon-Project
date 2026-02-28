import json
import logging
from typing import Any, Dict

from eth_account import Account
from web3 import Web3

from agent.settings import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

EXECUTE_ARBITRAGE_ABI = [
    {
        "inputs": [
            {
                "components": [
                    {"internalType": "address", "name": "marketA", "type": "address"},
                    {"internalType": "address", "name": "marketB", "type": "address"},
                    {"internalType": "uint256", "name": "marketIdA", "type": "uint256"},
                    {"internalType": "uint256", "name": "marketIdB", "type": "uint256"},
                    {"internalType": "uint256", "name": "amountIn", "type": "uint256"},
                    {"internalType": "bool", "name": "buyYesOnA", "type": "bool"},
                    {"internalType": "uint256", "name": "minProfit", "type": "uint256"},
                ],
                "internalType": "struct ArbExecutor.ArbOpportunity",
                "name": "opp",
                "type": "tuple",
            }
        ],
        "name": "executeArbitrage",
        "outputs": [{"internalType": "uint256", "name": "profit", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function",
    }
]


class TradeExecutor:
    def __init__(self) -> None:
        self.w3 = Web3(Web3.HTTPProvider(settings.bsc_rpc))

        self.account = None
        if settings.agent_private_key:
            try:
                self.account = Account.from_key(settings.agent_private_key)
            except ValueError as exc:
                if settings.dry_run:
                    logger.info(
                        "Ignoring invalid AGENT_PRIVATE_KEY because DRY_RUN=true: %s",
                        exc,
                    )
                else:
                    raise RuntimeError(
                        "Invalid AGENT_PRIVATE_KEY. Expected a 32-byte private key hex."
                    ) from exc

        self.executor_contract = None
        if settings.arb_executor_address and self.w3.is_address(settings.arb_executor_address):
            self.executor_contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(settings.arb_executor_address),
                abi=EXECUTE_ARBITRAGE_ABI,
            )

    def execute_arbitrage(self, opportunity: Dict[str, Any]) -> Dict[str, Any]:
        if settings.dry_run:
            return {
                "status": "simulated",
                "tx_hash": "0xSIMULATED_TX_HASH",
                "opportunity": opportunity,
            }

        if self.account is None or self.executor_contract is None:
            raise RuntimeError("Executor not configured. Set AGENT_PRIVATE_KEY and ARB_EXECUTOR_ADDRESS")

        if not opportunity.get("contract_a") or not opportunity.get("contract_b"):
            raise RuntimeError("Opportunity missing contract_a/contract_b addresses")

        opp_struct = (
            Web3.to_checksum_address(opportunity["contract_a"]),
            Web3.to_checksum_address(opportunity["contract_b"]),
            int(opportunity["id_a"]),
            int(opportunity["id_b"]),
            self.w3.to_wei(opportunity["amount_busd"], "ether"),
            bool(opportunity["buy_yes_on_a"]),
            self.w3.to_wei(opportunity["min_profit"], "ether"),
        )

        tx = self.executor_contract.functions.executeArbitrage(opp_struct)
        gas = tx.estimate_gas({"from": self.account.address})

        nonce = self.w3.eth.get_transaction_count(self.account.address)
        raw_tx = tx.build_transaction(
            {
                "from": self.account.address,
                "nonce": nonce,
                "chainId": settings.chain_id,
                "gas": int(gas * 1.2),
                "gasPrice": self.w3.to_wei("5", "gwei"),
            }
        )

        signed = self.account.sign_transaction(raw_tx)
        tx_hash = self.w3.eth.send_raw_transaction(signed.rawTransaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)

        logger.info("Executed tx: %s", receipt.transactionHash.hex())
        return {
            "status": "confirmed",
            "tx_hash": receipt.transactionHash.hex(),
            "block_number": receipt.blockNumber,
            "gas_used": receipt.gasUsed,
        }


if __name__ == "__main__":
    executor = TradeExecutor()
    sample = {
        "market": "demo market",
        "contract_a": "0x0000000000000000000000000000000000000001",
        "contract_b": "0x0000000000000000000000000000000000000002",
        "id_a": 1,
        "id_b": 1,
        "amount_busd": 100,
        "buy_yes_on_a": True,
        "min_profit": 0.5,
    }
    print(json.dumps(executor.execute_arbitrage(sample), indent=2))
