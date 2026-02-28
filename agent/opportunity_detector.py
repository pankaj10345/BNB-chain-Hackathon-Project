import json
import logging
import os
from typing import Any, Dict, List, Optional

import joblib
import redis

from agent.settings import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

FALLBACK_MARKETS = [
    "Will India win the cricket match?",
    "Will BTC close above 100k this week?",
    "Will Team A win IPL finals?",
]


class OpportunityDetector:
    def __init__(self) -> None:
        self.redis = redis.from_url(settings.redis_url, decode_responses=True)
        self.model = self._load_model(settings.model_path)
        self.platforms = ["predict_fun", "opinion_bsc", "polymarket_bsc"]
        self.gas_cost_busd = 0.15
        self._redis_warning_emitted = False

    def _load_model(self, model_path: str):
        if not model_path:
            logger.info("MODEL_PATH not set; using heuristic confidence")
            return None

        if not os.path.exists(model_path):
            logger.info("Model file not found at %s; using heuristic confidence", model_path)
            return None

        try:
            return joblib.load(model_path)
        except Exception as error:
            logger.warning("Failed to load model (%s); using heuristic confidence", error)
            return None

    def find_opportunities(self) -> List[Dict[str, Any]]:
        prices = self._fetch_cached_prices()
        common_titles = self._get_common_market_titles(prices)

        opportunities: List[Dict[str, Any]] = []
        for market_title in common_titles:
            for i, platform_a in enumerate(self.platforms):
                for platform_b in self.platforms[i + 1 :]:
                    opportunity = self._check_gap(market_title, platform_a, platform_b, prices)
                    if opportunity is not None:
                        opportunities.append(opportunity)

        opportunities.sort(key=lambda x: x["net_profit"], reverse=True)
        return opportunities

    def _fetch_cached_prices(self) -> Dict[str, Any]:
        prices: Dict[str, Any] = {}
        try:
            for platform in self.platforms:
                raw = self.redis.get(f"prices:{platform}")
                if raw:
                    prices[platform] = json.loads(raw)
        except Exception as error:
            if not self._redis_warning_emitted:
                logger.warning("Redis unavailable, falling back to synthetic prices: %s", error)
                self._redis_warning_emitted = True
            prices = self._fallback_prices()
        return prices

    def _fallback_prices(self) -> Dict[str, Any]:
        prices: Dict[str, Any] = {}
        offsets = {
            "predict_fun": 0.0,
            "opinion_bsc": 2.2,
            "polymarket_bsc": -1.4,
        }
        for platform in self.platforms:
            markets = []
            for idx, title in enumerate(FALLBACK_MARKETS, start=1):
                base = 50 + (idx * 4)
                yes_price = max(1.0, min(99.0, base + offsets[platform]))
                markets.append(
                    {
                        "id": idx,
                        "title": title,
                        "yes_price": round(yes_price, 2),
                        "no_price": round(100 - yes_price, 2),
                        "liquidity": 50_000 + (idx * 10_000),
                        "volume_24h": 120_000 + (idx * 30_000),
                        "active": True,
                    }
                )
            prices[platform] = {"platform": platform, "markets": markets}
        return prices

    def _get_common_market_titles(self, prices: Dict[str, Any]) -> List[str]:
        title_sets = []
        for platform in self.platforms:
            if platform not in prices:
                continue
            titles = {
                m["title"].strip().lower()
                for m in prices[platform].get("markets", [])
                if m.get("active", True)
            }
            if titles:
                title_sets.append(titles)

        if not title_sets:
            return []
        common = set.intersection(*title_sets)
        return sorted(common)

    def _check_gap(
        self,
        market_title: str,
        platform_a: str,
        platform_b: str,
        prices: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        price_a = self._get_market_price(market_title, platform_a, prices)
        price_b = self._get_market_price(market_title, platform_b, prices)
        if not price_a or not price_b:
            return None

        gap = abs(price_b["yes_price"] - price_a["yes_price"])
        amount_busd = 100.0
        gross_profit = (gap / 100.0) * amount_busd
        net_profit = gross_profit - self.gas_cost_busd

        confidence = self._confidence(price_a, price_b, gap)
        if net_profit <= 0 or confidence < settings.min_confidence:
            return None

        buy_yes_on_a = price_a["yes_price"] <= price_b["yes_price"]
        return {
            "market": market_title,
            "platform_a": platform_a,
            "platform_b": platform_b,
            "id_a": price_a["id"],
            "id_b": price_b["id"],
            "gap_bps": int(gap * 100),
            "price_a": price_a["yes_price"],
            "price_b": price_b["yes_price"],
            "amount_busd": amount_busd,
            "min_profit": max(settings.min_net_profit_busd, net_profit * 0.5),
            "net_profit": round(net_profit, 4),
            "confidence": round(confidence, 4),
            "buy_yes_on_a": buy_yes_on_a,
            "strategy": "DELTA_NEUTRAL" if gap >= 5 else "YIELD_ROTATION",
        }

    def _get_market_price(
        self,
        market_title: str,
        platform: str,
        prices: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        market_data = prices.get(platform, {}).get("markets", [])
        for market in market_data:
            if market.get("title", "").strip().lower() == market_title:
                return market
        return None

    def _confidence(self, price_a: Dict[str, Any], price_b: Dict[str, Any], gap: float) -> float:
        if self.model is None:
            liquidity_score = min(1.0, (price_a.get("liquidity", 0) + price_b.get("liquidity", 0)) / 200_000)
            gap_score = min(1.0, gap / 10)
            return max(0.5, 0.4 * liquidity_score + 0.6 * gap_score)

        features = [[
            gap,
            float(price_a.get("liquidity", 0)),
            float(price_b.get("liquidity", 0)),
            float(price_a.get("volume_24h", 0)),
            float(price_b.get("volume_24h", 0)),
        ]]
        proba = self.model.predict_proba(features)
        return float(proba[0][1])


if __name__ == "__main__":
    detector = OpportunityDetector()
    for opp in detector.find_opportunities()[:5]:
        print(json.dumps(opp, indent=2))
