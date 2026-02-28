# PredictArb: 1-2 Page Project Explanation

## What This Project Is

PredictArb is an AI-powered autonomous arbitrage system for prediction markets on BNB Chain.  
The project combines on-chain smart contracts with an off-chain decision engine to detect price inefficiencies across multiple prediction platforms, choose a strategy, and execute trades with safety controls.

At a high level, PredictArb answers one core question:

How can we continuously turn fragmented prediction-market pricing into structured, automated opportunities while managing risk and idle capital?

The system is designed as a practical hackathon MVP that demonstrates full-stack execution:

- Solidity contracts for trust-minimized execution and capital controls.
- Python agent for scanning, scoring, and strategy selection.
- Node backend for APIs and live streaming.
- Next.js frontend for real-time monitoring and demo visibility.

## Problem We Are Solving

Prediction markets are fragmented. The same event can appear on multiple platforms with different implied probabilities at the same time.  
For example, one platform might price an outcome at 54% while another prices it at 65%. This spread can create arbitrage opportunities when execution is fast enough and properly risk-filtered.

Most users cannot capitalize on this manually because:

- They cannot track all platforms continuously.
- Opportunities disappear quickly.
- Manual execution latency is too high.
- Capital sits idle between trades, reducing overall efficiency.

In short, inefficiencies exist, but exploiting them consistently requires automation, cross-market visibility, and strict execution discipline.

## Our Solution

PredictArb is built as a hybrid system with three coordinated layers.

### 1) Off-chain Intelligence Layer (Python Agent)

The agent performs the intelligence loop:

- `price_scanner.py`: fetches platform prices and stores snapshots.
- `opportunity_detector.py`: computes spread, net profit, and confidence.
- `strategy_engine.py`: chooses strategy using optional OpenAI reasoning with heuristic fallback.
- `executor.py`: submits transactions or runs safe simulations in dry-run mode.
- `main.py`: orchestrates continuous scanning and decision cycles.

This layer gives speed and flexibility, while preserving deterministic fallback behavior if model files or external AI are unavailable.

### 2) On-chain Execution & Capital Layer (Solidity)

The smart contracts enforce key constraints and custody logic:

- `ArbExecutor.sol`: atomic execution path, market restrictions, minimum-profit guardrails, and pause controls.
- `YieldVault.sol`: pooled capital accounting, deposits/withdrawals, and rebalancing into higher-yield sources when trading is not preferred.
- `PriceOracle.sol`: trusted update model with freshness checks to reduce stale or invalid signal usage.

By placing critical safety checks on-chain, PredictArb avoids relying solely on off-chain bot logic.

### 3) Product & Observability Layer (Backend + Frontend)

The backend exposes API endpoints and live WebSocket streams for:

- system status
- opportunities
- transaction feed

The frontend dashboard provides:

- opportunity monitor
- agent state and PnL view
- transaction log
- yield allocation panel

This layer is essential in hackathon settings because judges and users can see system behavior in real time, not just hear claims.

## Strategy Design

PredictArb currently supports two strategies:

1. `DELTA_NEUTRAL`  
   Enter offsetting positions across markets when the spread is strong enough, with net-profit thresholds and confidence gating.

2. `YIELD_ROTATION`  
   When arbitrage quality is weak, move or maintain idle capital in better-yield options to avoid dead capital.

This dual-mode design is important. A pure arbitrage bot can be inactive or unproductive during low-opportunity periods, while PredictArb keeps capital utilization as a first-class objective.

## End-to-End Flow

1. Scanner fetches or synthesizes price snapshots from configured market sources.
2. Detector finds common markets across platforms and computes spread opportunities.
3. Strategy engine decides whether to trade (`DELTA_NEUTRAL`) or preserve capital (`YIELD_ROTATION`).
4. Executor performs dry-run simulation or submits on-chain transaction.
5. Backend and dashboard surface live results to operators and judges.

This creates a complete autonomous loop: detect -> decide -> execute -> observe -> repeat.

## Why This Project Matters

PredictArb contributes value at multiple levels:

- **Market efficiency:** narrows cross-platform mispricing through automated arbitrage.
- **Capital efficiency:** reduces idle periods via yield-aware rotation.
- **Operational maturity:** includes risk thresholds, pause controls, and explicit fallback logic.
- **Ecosystem value:** demonstrates practical AI + DeFi automation on BSC/opBNB-friendly architecture.

For hackathon evaluation, this is not just a contract demo and not just an AI demo. It is an integrated system with measurable behavior across the full stack.

## Business and Product Potential

After MVP validation, the project can evolve into:

- performance-fee based arbitrage vault
- managed automation product for semi-passive users
- B2B signal/API layer for wallets, aggregators, or market makers

Potential moats include:

- execution quality under latency
- stronger opportunity scoring models
- broader venue integrations
- robust risk and governance controls

## Current Scope and Honest Limitations

This repository is an MVP and intentionally includes demo-friendly fallbacks:

- mock/synthetic data paths for offline reliability
- heuristic confidence when model file is absent
- dry-run default to avoid unsafe live execution

Production upgrades still needed:

- deeper exchange/protocol-specific adapters
- hardened key management (KMS/HSM)
- MEV-aware routing and transaction protection
- stronger governance and permissions model

These limitations are normal for a hackathon build and should be presented transparently as planned next steps.

## Project Vision

PredictArb’s long-term vision is to become an autonomous efficiency layer for prediction markets: continuously monitoring fragmented venues, selecting risk-adjusted actions, and deploying capital where expected return is strongest.

In practical terms, PredictArb is more than a trading bot.  
It is an end-to-end intelligence, execution, and capital-management platform that can mature from hackathon MVP to production-grade infrastructure for prediction-market automation on BNB Chain.
