"use client";

import { useEffect, useMemo, useState } from "react";

import AgentStatus from "@/components/AgentStatus";
import ArbMonitor from "@/components/ArbMonitor";
import TransactionLog from "@/components/TransactionLog";
import YieldTracker from "@/components/YieldTracker";
import { wsUrl } from "@/lib/api";

export default function HomePage() {
  const [opportunities, setOpportunities] = useState([]);
  const [status, setStatus] = useState({ state: "scanning", allocation: {} });
  const [transactions, setTransactions] = useState([]);

  const liveUrl = useMemo(() => wsUrl(), []);

  useEffect(() => {
    const ws = new WebSocket(liveUrl);

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.opportunities) {
        setOpportunities(payload.opportunities);
      }
      if (payload.status) {
        setStatus(payload.status);
      }
      if (payload.transactions) {
        setTransactions(payload.transactions);
      }
    };

    return () => ws.close();
  }, [liveUrl]);

  return (
    <main className="page">
      <header className="hero">
        <p className="eyebrow">BNB HACK | AI Arbitrage Agent</p>
        <h1>PredictArb Live Control Room</h1>
        <p className="sub">
          Autonomous cross-market prediction arbitrage on BSC Testnet and opBNB.
        </p>
      </header>

      <section className="layout-grid">
        <AgentStatus status={status} />
        <YieldTracker allocation={status.allocation} />
        <ArbMonitor opportunities={opportunities} />
        <TransactionLog transactions={transactions} />
      </section>
    </main>
  );
}
