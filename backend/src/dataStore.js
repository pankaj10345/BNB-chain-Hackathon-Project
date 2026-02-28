const MARKETS = [
  "Will India win the cricket match?",
  "Will BTC close above 100k this week?",
  "Will Team A win IPL finals?",
];

const PLATFORMS = ["predict_fun", "opinion_bsc", "polymarket_bsc"];

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
  return Math.floor(random(min, max + 1));
}

export class InMemoryDataStore {
  constructor() {
    this.agentStatus = "scanning";
    this.lastTradeAt = null;
    this.totalPnl = 0;
    this.winRate = 0.81;
    this.trades = [];
    this.currentAllocation = {
      venus: 0.15,
      pancakeswap: 0.3,
      alpaca: 0.55,
    };
  }

  buildOpportunities() {
    return MARKETS.map((market, idx) => {
      const base = random(45, 75);
      const spread = random(0.5, 8.5);
      const a = PLATFORMS[idx % PLATFORMS.length];
      const b = PLATFORMS[(idx + 1) % PLATFORMS.length];

      return {
        market_title: market,
        platform_a: a,
        platform_b: b,
        price_a: Number(base.toFixed(2)),
        price_b: Number((base + spread).toFixed(2)),
        gap_bps: Math.round(spread * 100),
        net_profit: Number((spread * 0.9).toFixed(2)),
        confidence: Number(random(0.68, 0.93).toFixed(2)),
      };
    }).sort((x, y) => y.net_profit - x.net_profit);
  }

  updateFromTick() {
    const opportunities = this.buildOpportunities();
    const best = opportunities[0];

    if (best && best.gap_bps > 450 && best.confidence > 0.75) {
      this.agentStatus = "trading";
      const tradeProfit = Number(random(2.0, 8.5).toFixed(2));
      const trade = {
        id: `${Date.now()}-${randomInt(1000, 9999)}`,
        txHash: `0x${Math.random().toString(16).slice(2).padEnd(64, "0").slice(0, 64)}`,
        strategy: "DELTA_NEUTRAL",
        profit: tradeProfit,
        gasUsd: Number(random(0.08, 0.3).toFixed(3)),
        chain: "BSC Testnet",
        timestamp: new Date().toISOString(),
      };

      this.totalPnl += tradeProfit;
      this.lastTradeAt = trade.timestamp;
      this.trades.unshift(trade);
      this.trades = this.trades.slice(0, 30);
    } else {
      this.agentStatus = "yield";
    }

    return {
      opportunities,
      status: this.statusSnapshot(),
      transactions: this.trades,
    };
  }

  statusSnapshot() {
    return {
      state: this.agentStatus,
      lastTradeAt: this.lastTradeAt,
      totalPnl: Number(this.totalPnl.toFixed(2)),
      winRate: this.winRate,
      allocation: this.currentAllocation,
    };
  }
}
