import asyncio
import random
from typing import Dict, Tuple

YIELD_SOURCES = {
    "venus": {"contract": "0x1111111111111111111111111111111111111111"},
    "pancakeswap": {"contract": "0x2222222222222222222222222222222222222222"},
    "alpaca": {"contract": "0x3333333333333333333333333333333333333333"},
}


async def fetch_current_apy(_contract: str) -> float:
    # Replace this stub with protocol-specific APY reads.
    await asyncio.sleep(0)
    return round(random.uniform(3.5, 9.5), 2)


async def get_best_yield() -> Tuple[str, float, Dict[str, float]]:
    apys: Dict[str, float] = {}
    for name, source in YIELD_SOURCES.items():
        apys[name] = await fetch_current_apy(source["contract"])
    best = max(apys, key=apys.get)
    return best, apys[best], apys


async def rotate_if_better(current_protocol: str, threshold_bps: int = 100) -> Dict[str, float]:
    best_protocol, best_apy, apys = await get_best_yield()
    current_apy = apys.get(current_protocol, 0)
    improvement = best_apy - current_apy

    if improvement > (threshold_bps / 100):
        return {
            "rotated": 1,
            "from": current_protocol,
            "to": best_protocol,
            "improvement": round(improvement, 4),
        }

    return {"rotated": 0, "from": current_protocol, "to": current_protocol, "improvement": 0.0}


if __name__ == "__main__":
    result = asyncio.run(rotate_if_better("venus"))
    print(result)
