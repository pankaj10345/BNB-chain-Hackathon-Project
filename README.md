# PredictArb

AI-powered autonomous arbitrage and capital-allocation system for prediction markets on BNB Chain.

- Track: `AI Arbitrage Agent (1.2)`
- Networks: `BSC Testnet (97)`, `opBNB Testnet (5611)`
- Core stack: Solidity + Python + Node.js + Next.js + Redis
- Repo type: Hackathon MVP with production-oriented architecture

<img width="1512" height="895" alt="image" src="https://github.com/user-attachments/assets/0a6e1cf8-bb41-4730-8208-1da5b2912a20" />



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



---

## System architecture (how the code connects)

PredictArb is a hybrid system with clear separation of responsibilities:

### 1) Off-chain intelligence (Python agent)
Responsible for:
- collecting market snapshots,
- building comparable cross-platform views,
- scoring opportunity quality,
- selecting strategy,
- dispatching simulated or live execution.

Key files:
- `agent/price_scanner.py`
- `agent/opportunity_detector.py`
- `agent/strategy_engine.py`
- `agent/executor.py`
- `agent/main.py`

### 2) On-chain enforcement (Solidity)
Responsible for:
- enforcing execution permissions and guardrails,
- managing pooled capital and yield rotation,
- ensuring oracle inputs are fresh/trusted.

Key files:
- `contracts/ArbExecutor.sol`
- `contracts/YieldVault.sol`
- `contracts/PriceOracle.sol`

### 3) Product + observability (Backend + Frontend)
Responsible for:
- publishing runtime state and opportunities,
- streaming live events,
- providing an operator/judge dashboard for auditability.

Backend:
- `backend/src/server.js`
- endpoints: `/api/status`, `/api/opportunities`, `/api/transactions`
- websocket: `/live`

Frontend:
- `frontend/app/page.js` + `frontend/components/*`

---

## High-level data flow

1. **Scanner** ingests market data from configured sources.
2. **Detector** computes gap and expected profitability.
3. **Strategy engine** selects `DELTA_NEUTRAL` (stronger gaps) or `YIELD_ROTATION` (when arb quality is weak).
4. **Executor** performs `DRY_RUN` simulation or sends on-chain tx.
5. **Backend + UI** expose real-time state, opportunities, and tx/sim logs.

---

## Contracts (Solidity): what each does

### `ArbExecutor.sol`
Purpose: encode execution policy and safety checks on-chain.

Typical controls:
- **owner-gated sensitive execution**
- **market allowlist constraints**
- **minimum profit guardrails**
- **pause/unpause** emergency switch

Why it exists:
- critical safety logic should be verifiable on-chain,
- off-chain agent bugs should not imply unrestricted execution.

---

### `YieldVault.sol`
Purpose: keep capital productive during low-arbitrage periods.

Core responsibilities:
- pooled deposit/withdraw accounting,
- share math for participant balances,
- APY source registry,
- rebalance/rotate capital toward best configured yield source.

Why it exists:
- when arb frequency drops, idle capital kills annualized performance,
- yield rotation provides a “fallback engine” for capital efficiency.

---

### `PriceOracle.sol`
Purpose: ensure strategy decisions rely on **fresh, trusted signals**.

Core responsibilities:
- trusted reporter model (who can post updates),
- freshness checks (reject stale data),
- cross-platform gap support for comparisons.

Why it exists:
- stale inputs can destroy strategy quality,
- freshness windows are mandatory for robust automation.

---

## Python agent: what each module does

### `agent/price_scanner.py`
Purpose: collect price snapshots from sources and store them for the detector.

Behavior:
- polls configured market sources,
- writes snapshots to **Redis** with a TTL,
- includes deterministic synthetic fallback for offline/demo continuity.

Outputs (typical):
- per-market snapshots with timestamp, platform id, implied probability, liquidity metadata (if available).

---

### `agent/opportunity_detector.py`
Purpose: compute opportunities from snapshots, including profitability and confidence.

Behavior:
- loads ML model if available (`MODEL_PATH`),
- falls back to heuristic confidence if model missing/unavailable,
- finds overlapping markets across platforms,
- computes:
  - `gap_bps` (basis-point divergence)
  - `gross_profit`
  - `net_profit` (after gas/slippage assumptions)
  - `confidence`

Default filtering:
- reject if `net_profit <= 0`
- reject if `confidence < MIN_CONFIDENCE`

Strategy classification (default):
- strong/high-quality gaps → `DELTA_NEUTRAL`
- weaker conditions → `YIELD_ROTATION`

---

### `agent/strategy_engine.py`
Purpose: choose an action plan and size safely.

Behavior:
- can optionally use OpenAI if `OPENAI_API_KEY` is set,
- expects **strict JSON** output (machine-consumable),
- if API unavailable or response malformed → deterministic fallback.

Design goal:
- optional AI should *improve* decisions, never block execution logic.

---

### `agent/executor.py`
Purpose: turn decisions into execution events.

Modes:
- `DRY_RUN=true` (default): returns simulated tx result (no chain interaction)
- live mode: builds and sends tx via configured signer + `ArbExecutor` contract

Typical safeguards:
- checks opportunity still valid at execution time (freshness / thresholds),
- refuses if profit/confidence constraints fail.

---

### `agent/main.py`
Purpose: continuous loop orchestration.

Typical loop:
- scan → detect → decide → execute → publish telemetry → repeat

---

## Backend API (Node): what it exposes

Located in `backend/`.

### Endpoints
- `GET /api/status`  
  Current agent mode, last scan time, health signals.

- `GET /api/opportunities`  
  Latest ranked opportunities + scores + strategy tags.

- `GET /api/transactions`  
  Execution history: dry-run simulations and/or on-chain tx summaries.

### WebSocket
- `/live`  
  Streams near-real-time events: new opportunities, mode switches, executions, errors.

Purpose:
- machine-readable system state,
- historical + near-real-time context,
- feeds the dashboard.

---

## Frontend dashboard (Next.js)

Located in `frontend/`.

Key UI modules:
- `ArbMonitor.jsx`  
  Opportunity table, ranking, filters, strategy label, net profitability.

- `AgentStatus.jsx`  
  Agent health, loop timing, DRY_RUN state, connected sources.

- `TransactionLog.jsx`  
  Simulated executions and/or on-chain tx feed.

- `YieldTracker.jsx`  
  Vault allocation signals + yield rotation status (when enabled).

Purpose:
- visualize opportunities and system mode,
- improve trust via observability (operators/judges can see behavior live).

---

## Environment variables

> Defaults are designed to be safe: **`DRY_RUN=true`**.

Common variables (names may vary by implementation—see `.env.example` if present):

- `DRY_RUN=true|false`  
  If `true`, executor simulates and does not broadcast transactions.

- `REDIS_URL=...`  
  Snapshot store for scanner/detector pipeline.

- `MODEL_PATH=...`  
  Optional ML model for confidence scoring.

- `MIN_CONFIDENCE=...`  
  Minimum confidence threshold to allow execution.

- `GAS_USD=...` / `GAS_BPS=...`  
  Assumptions for net profitability calculation.

- `OPENAI_API_KEY=...`  
  Optional strategy engine enhancement (strict JSON; fallback exists).

- `RPC_URL=...` / `PRIVATE_KEY=...`  
  Live-mode chain execution (only needed when `DRY_RUN=false`).

---

## Local runbook (demo / development)

### 1) Install dependencies
- Python deps for agent
- Node deps for backend
- Node deps for frontend
- Hardhat deps for contracts/tests

### 2) Contracts: compile + test
```bash
npx hardhat compile
npx hardhat test
