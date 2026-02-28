import asyncio
import json
import logging
import random
import time
from typing import Any, Dict, List

import aiohttp
import redis

from agent.settings import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

MARKETS: Dict[str, Dict[str, str]] = {
    "predict_fun": {"url": "https://api.predictarb.xyz/mock/predict_fun"},
    "opinion_bsc": {"url": "https://api.predictarb.xyz/mock/opinion_bsc"},
    "polymarket_bsc": {"url": "https://api.predictarb.xyz/mock/polymarket_bsc"},
}

MOCK_MARKET_TITLES = [
    "Will India win the cricket match?",
    "Will BTC close above 100k this week?",
    "Will Team A win IPL finals?",
]

PLATFORM_PRICE_BIAS = {
    "predict_fun": -4.5,
    "opinion_bsc": 3.5,
    "polymarket_bsc": 0.0,
}


class PriceScanner:
    def __init__(self) -> None:
        self.redis = redis.from_url(settings.redis_url, decode_responses=True)
        self.local_cache: Dict[str, str] = {}
        self._redis_warning_emitted = False

    async def scan_all_markets(self) -> None:
        logger.info("Price scanner started")
        while True:
            tasks = [self.fetch_market_prices(name, cfg) for name, cfg in MARKETS.items()]
            prices = await asyncio.gather(*tasks, return_exceptions=True)
            self.update_redis(prices)
            await asyncio.sleep(settings.poll_interval_sec)

    async def fetch_market_prices(self, name: str, config: Dict[str, str]) -> Dict[str, Any]:
        url = config["url"]
        try:
            timeout = aiohttp.ClientTimeout(total=2)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(url) as resp:
                    if resp.status != 200:
                        raise ValueError(f"{name} returned {resp.status}")

                    data = await resp.json()
                    return {
                        "platform": name,
                        "timestamp": time.time(),
                        "markets": data.get("markets", []),
                    }
        except Exception:
            # Local deterministic fallback for PoC and offline demos.
            return self._mock_market_snapshot(name)

    def update_redis(self, price_data: List[Any]) -> None:
        for platform_data in price_data:
            if isinstance(platform_data, Exception):
                continue

            key = f"prices:{platform_data['platform']}"
            payload = json.dumps(platform_data)
            self.local_cache[key] = payload
            try:
                self.redis.setex(key, 10, payload)
            except Exception as error:
                if not self._redis_warning_emitted:
                    logger.warning("Redis unavailable, using local cache: %s", error)
                    self._redis_warning_emitted = True

    def _mock_market_snapshot(self, name: str) -> Dict[str, Any]:
        now = time.time()
        markets: List[Dict[str, Any]] = []
        platform_bias = PLATFORM_PRICE_BIAS.get(name, 0.0)
        for idx, title in enumerate(MOCK_MARKET_TITLES, start=1):
            anchor = 48 + (idx * 5)
            jitter = random.uniform(-4, 4)
            yes_price = max(5.0, min(95.0, anchor + platform_bias + jitter))
            no_price = max(5.0, min(95.0, 100 - yes_price))

            markets.append(
                {
                    "id": idx,
                    "title": title,
                    "yes_price": round(yes_price, 2),
                    "no_price": round(no_price, 2),
                    "liquidity": random.randint(30_000, 200_000),
                    "volume_24h": random.randint(10_000, 500_000),
                    "active": True,
                }
            )

        return {"platform": name, "timestamp": now, "markets": markets}


if __name__ == "__main__":
    scanner = PriceScanner()
    try:
        asyncio.run(scanner.scan_all_markets())
    except KeyboardInterrupt:
        logger.info("Price scanner stopped")
