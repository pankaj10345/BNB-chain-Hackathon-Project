import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    bsc_rpc: str = os.getenv("BSC_RPC", "https://bsc-testnet.publicnode.com")
    redis_url: str = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
    model_path: str = os.getenv("MODEL_PATH", "agent/models/arb_detector_v2.pkl")
    min_confidence: float = float(os.getenv("MIN_CONFIDENCE", "0.70"))
    min_net_profit_busd: float = float(os.getenv("MIN_NET_PROFIT_BUSD", "0.5"))
    poll_interval_sec: int = int(os.getenv("SCAN_INTERVAL_SEC", "2"))
    max_trades_per_loop: int = int(os.getenv("MAX_TRADES_PER_LOOP", "3"))
    chain_id: int = int(os.getenv("CHAIN_ID", "97"))
    agent_private_key: str = os.getenv("AGENT_PRIVATE_KEY", "")
    arb_executor_address: str = os.getenv("ARB_EXECUTOR_ADDRESS", "")
    yield_vault_address: str = os.getenv("YIELD_VAULT_ADDRESS", "")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
    dry_run: bool = os.getenv("DRY_RUN", "true").lower() == "true"


settings = Settings()
