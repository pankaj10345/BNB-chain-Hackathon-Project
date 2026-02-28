# PredictArb

AI-powered autonomous arbitrage and capital-allocation system for prediction markets on BNB Chain.

This README is intentionally a long-form, 10-page-equivalent project document so you can share one file instead of a PPT.

- Track: `AI Arbitrage Agent (1.2)`
- Networks: `BSC Testnet (97)`, `opBNB Testnet (5611)`
- Core stack: Solidity + Python + Node.js + Next.js + Redis
- Repo type: Hackathon MVP with production-oriented architecture

---

## Page 1: Executive Summary

PredictArb is a full-stack system that continuously scans fragmented prediction markets, detects cross-platform mispricing, decides a strategy, and executes actions with explicit risk controls.

The core thesis is straightforward: when different platforms price the same outcome differently at the same moment, a spread exists. If the spread is wide enough after costs, that spread can be converted into profit. If the spread is weak, capital should not stay idle and should be rotated into better yield opportunities.

PredictArb combines these two modes:

- `DELTA_NEUTRAL`: exploit strong price dislocations with controlled execution.
- `YIELD_ROTATION`: allocate capital to yield when arbitrage quality is low.

This makes PredictArb more practical than a simple trade bot. Traditional bots stop producing value when opportunities disappear. PredictArb is designed to keep capital productive through changing market conditions.

From a hackathon perspective, the project demonstrates end-to-end delivery rather than isolated components:

- On-chain contracts for enforceable constraints and asset controls.
- Off-chain intelligence for fast scanning and scoring.
- API + WebSocket backend for real-time state distribution.
- Frontend dashboard for observability and operator trust.

The result is an autonomous loop:

`detect -> score -> decide -> execute/simulate -> observe -> repeat`

---

## Page 2: Problem and Market Context

Prediction markets are structurally fragmented. The same event can appear across multiple venues with different liquidity profiles, user bases, fee structures, and update latency. As a result, implied probabilities can diverge temporarily.

### Why this matters

If Platform A prices an outcome at 54% and Platform B prices the same outcome at 65%, that divergence can represent an exploitable inefficiency if:

- execution is fast,
- position sizing is disciplined,
- confidence is high enough,
- and total expected return remains positive after gas and slippage assumptions.

### Why humans underperform in this setting

Manual traders face four structural constraints:

1. They cannot monitor all relevant venues 24/7.
2. Opportunity windows collapse quickly.
3. Manual decision and transaction latency is high.
4. Idle periods degrade annualized performance.

### System requirement that emerges

A practical system must provide:

- continuous scanning,
- normalized opportunity scoring,
- strategy switching based on market quality,
- execution safeguards,
- and visible telemetry for auditability.

PredictArb is built around these requirements.

---

## Page 3: Product Vision and Scope

PredictArb is not positioned as a single algorithm. It is positioned as an operating layer for automated market-efficiency actions in prediction markets.

### Product goals

- Convert fragmented pricing into structured opportunities.
- Improve capital efficiency across active and inactive phases.
- Enforce non-negotiable risk controls on-chain.
- Maintain deterministic behavior even when optional AI components are unavailable.

### Current scope in this repository

Implemented now:

- `ArbExecutor.sol`, `YieldVault.sol`, `PriceOracle.sol`
- Python agent loop (`price_scanner`, `opportunity_detector`, `strategy_engine`, `executor`, `main`)
- Node backend (`/api/status`, `/api/opportunities`, `/api/transactions`, `/live`)
- Next.js frontend widgets for opportunities, status, transactions, and yield allocation
- Hardhat tests for contracts

### Honest MVP boundaries

- Market adapters include mock/offline fallback for reliable demos.
- `DRY_RUN=true` by default to prevent accidental live execution.
- Production key custody, routing, and governance are intentionally staged for later hardening.

This scope is intentional: prove architecture and behavior first, then productionize.

---

## Page 4: Architecture Overview

PredictArb uses a hybrid architecture with clear separation of responsibilities.

### Off-chain intelligence layer (Python)

- `agent/price_scanner.py`
- `agent/opportunity_detector.py`
- `agent/strategy_engine.py`
- `agent/executor.py`
- `agent/main.py`

Responsibilities:

- Collect market snapshots.
- Build comparable cross-platform views.
- Score opportunity quality.
- Decide strategy.
- Dispatch simulated or live action.

### On-chain enforcement layer (Solidity)

- `contracts/ArbExecutor.sol`
- `contracts/YieldVault.sol`
- `contracts/PriceOracle.sol`

Responsibilities:

- Enforce execution permissions and safety checks.
- Manage pooled capital and yield source rotation.
- Maintain trusted, fresh oracle signals.

### Product and observability layer

- `backend/src/server.js` and related modules
- `frontend/app/page.js` + components

Responsibilities:

- Publish runtime state and opportunities.
- Stream live activity over WebSocket.
- Provide visual monitoring for operators, reviewers, and judges.

### High-level data flow

1. Scanner ingests market data.
2. Detector computes spread and expected profitability.
3. Strategy engine selects `DELTA_NEUTRAL` or `YIELD_ROTATION`.
4. Executor performs dry-run or on-chain execution.
5. Backend and UI expose real-time outcomes.

---

## Page 5: Smart Contract Design

Smart contracts in PredictArb are not passive storage. They encode execution policy and capital rules.

### `ArbExecutor.sol`

Primary controls include:

- owner-gated sensitive execution path,
- market allowlist constraints,
- minimum profit guardrails,
- pause/unpause controls for emergency handling.

Design rationale:

- Critical safety logic should be verifiable on-chain.
- Off-chain agent bugs should not automatically lead to unrestricted execution.

### `YieldVault.sol`

Core responsibilities:

- pooled deposit/withdraw accounting,
- share logic for participant balances,
- APY source registry,
- rebalance actions toward best configured source.

Design rationale:

- Capital should remain productive even when arbitrage frequency drops.

### `PriceOracle.sol`

Core responsibilities:

- trusted reporter model,
- data freshness checks,
- cross-platform gap support.

Design rationale:

- stale or invalid inputs can destroy strategy quality.
- freshness windows are mandatory for robust automated decisioning.

### Contract safety posture

- Explicit owner checks
- Guardrails before execution
- Operational pause switch

This is the minimum acceptable baseline for automated capital movement systems.

---

## Page 6: AI Agent and Decisioning

The agent is a continuous loop that attempts to maximize expected value while honoring risk thresholds.

### `price_scanner.py`

- Polls configured market sources.
- Writes snapshots to Redis with TTL.
- Includes deterministic synthetic fallback for offline/demo continuity.

### `opportunity_detector.py`

- Loads model if available (`MODEL_PATH`).
- Falls back to heuristic confidence if model missing/unavailable.
- Finds overlapping markets across platforms.
- Computes:
  - `gap_bps`
  - `gross_profit`
  - `net_profit` (after gas assumption)
  - confidence score

Default selection logic includes:

- reject if `net_profit <= 0`
- reject if confidence below `MIN_CONFIDENCE`
- classify strategy as `DELTA_NEUTRAL` for stronger gaps, else `YIELD_ROTATION`

### `strategy_engine.py`

- Optional OpenAI model integration if `OPENAI_API_KEY` is set.
- Strict JSON response expectation for machine-consumable strategy outputs.
- Deterministic fallback if API unavailable or malformed response occurs.

### `executor.py`

- `DRY_RUN=true` returns simulated tx result.
- Live mode builds and sends transaction via configured signer and executor contract.

This hybrid (AI + deterministic fallback) design prioritizes reliability over novelty.

---

## Page 7: Backend, Frontend, and Operations

### Backend service

Located in `backend/`.

Provides:

- `GET /api/status`
- `GET /api/opportunities`
- `GET /api/transactions`
- WebSocket: `/live`

Purpose:

- expose machine-readable system state,
- serve historical and near-real-time context,
- feed the dashboard and operator workflows.

### Frontend dashboard

Located in `frontend/`.

Primary UI modules:

- `ArbMonitor.jsx`
- `AgentStatus.jsx`
- `TransactionLog.jsx`
- `YieldTracker.jsx`

Purpose:

- visualize opportunities and system mode,
- show trade/simulation events,
- present allocation and PnL direction signals,
- improve trust via observability.

### Local runbook

1. Prepare env and dependencies.
2. Compile/test contracts.
3. Start backend and frontend.
4. Run Python agent.
5. Open UI and verify state transitions.

This supports both demo mode and iterative engineering.

---

## Page 8: Security, Risk, and Reliability

PredictArb includes explicit safeguards for an MVP, but should be presented honestly as pre-production.

### Current safeguards

- On-chain execution checks and pause controls.
- Profit floor gates to avoid low-quality actions.
- Dry-run default mode in agent execution path.
- Heuristic fallback when model and/or external AI is unavailable.

### Risk dimensions considered

- stale oracle or market data,
- overtrading on low-confidence signals,
- key misuse in live mode,
- strategy drift under changing market microstructure.

### Required hardening before production

1. KMS/HSM signer custody.
2. Private mempool / MEV-aware routing.
3. Protocol-specific adapters with better slippage/liquidity modeling.
4. Role-based governance (`multisig + timelock`) for privileged contract operations.
5. Enhanced telemetry, alerting, and incident runbooks.

The architecture is compatible with these upgrades without major redesign.

---

## Page 9: Business Model and Ecosystem Value

PredictArb can evolve from hackathon MVP to revenue-generating product in multiple forms.

### Value delivered

- Better market efficiency via narrower cross-platform mispricing.
- Better capital efficiency via arbitrage + yield dual engine.
- Better operational transparency via live observability stack.

### Monetization paths

- performance fee on profitable arbitrage cycles,
- management fee on vault AUM,
- B2B data/signal APIs for external integrators.

### Moat vectors

- execution quality under latency pressure,
- superior opportunity ranking and risk filtering,
- wider venue and protocol integrations,
- stronger reliability and governance posture.

### Why this matters for BNB ecosystem

- Demonstrates advanced, practical automation use cases.
- Encourages more efficient price discovery across venues.
- Provides blueprint for AI-assisted DeFi infrastructure products.

---

## Page 10: Roadmap, Milestones, and Setup

### Near-term engineering roadmap

1. Replace mock feeds with production market adapters.
2. Expand confidence scoring with retrained models and richer features.
3. Add MEV-aware execution strategy and transaction protection.
4. Implement multisig/timelock ownership and operational policies.
5. Build deeper analytics: hit-rate, PnL attribution, drawdown windows, and confidence calibration.

### Suggested milestone gates

- **M1 (Functional):** stable end-to-end loop with deterministic fallback.
- **M2 (Safety):** complete key-management and governance hardening.
- **M3 (Performance):** improve real net returns after gas/slippage.
- **M4 (Scale):** add venues, pairs, and API productization.

### Quick start (current repo)

Prerequisites:

- Node.js 20+
- Python 3.11+
- Redis 7+

Install:

```bash
cp .env.example .env
npm install
pip install -r requirements.txt
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

Compile and test:

```bash
npm run compile
npm test
```

Run services:

```bash
cd backend && npm run dev
cd frontend && npm run dev
python -m agent.main
```

Optional Docker flow:

```bash
docker compose up --build
```

---

## Environment Configuration Reference

Key variables from `.env` / `agent/settings.py` include:

- `BSC_RPC`
- `OPBNB_RPC`
- `REDIS_URL`
- `MODEL_PATH`
- `MIN_CONFIDENCE`
- `MIN_NET_PROFIT_BUSD`
- `SCAN_INTERVAL_SEC`
- `MAX_TRADES_PER_LOOP`
- `CHAIN_ID`
- `AGENT_PRIVATE_KEY`
- `ARB_EXECUTOR_ADDRESS`
- `YIELD_VAULT_ADDRESS`
- `OPENAI_API_KEY` (optional)
- `OPENAI_MODEL`
- `DRY_RUN`

---

## Repository Structure

```text
.
├── contracts/
├── agent/
├── backend/
├── frontend/
├── scripts/
├── test/
├── docs/
├── hardhat.config.js
├── bsc.address
├── .env.example
└── requirements.txt
```

---

## License

MIT
