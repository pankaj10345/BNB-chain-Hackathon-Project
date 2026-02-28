import asyncio
import logging

from agent.executor import TradeExecutor
from agent.opportunity_detector import OpportunityDetector
from agent.price_scanner import PriceScanner
from agent.settings import settings
from agent.strategy_engine import StrategyEngine

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


async def trading_loop() -> None:
    detector = OpportunityDetector()
    executor = TradeExecutor()
    strategy_engine = StrategyEngine()
    idle_cycles = 0

    while True:
        opportunities = detector.find_opportunities()
        if not opportunities:
            idle_cycles += 1
            if idle_cycles % 12 == 0:
                logger.info("No opportunities found in the last minute")
            await asyncio.sleep(5)
            continue

        idle_cycles = 0
        for opportunity in opportunities[: settings.max_trades_per_loop]:
            decision = strategy_engine.choose_strategy(opportunity)
            opportunity["strategy"] = decision["strategy"]

            if opportunity["net_profit"] < settings.min_net_profit_busd:
                continue

            if opportunity["strategy"] != "DELTA_NEUTRAL":
                logger.info("Skipping non-arbitrage opportunity: %s", decision["rationale"])
                continue

            result = executor.execute_arbitrage(opportunity)
            logger.info(
                "Execution %s | market=%s | %s->%s | net_profit=%.2f | confidence=%.2f",
                result["status"],
                opportunity["market"],
                opportunity["platform_a"],
                opportunity["platform_b"],
                opportunity["net_profit"],
                opportunity["confidence"],
            )

        await asyncio.sleep(5)


async def main() -> None:
    scanner = PriceScanner()
    await asyncio.gather(scanner.scan_all_markets(), trading_loop())


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Agent stopped")
