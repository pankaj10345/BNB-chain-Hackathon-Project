export default function AgentStatus({ status }) {
  return (
    <section className="card status-card">
      <div className="card-title">Agent Status</div>
      <div className="status-row">
        <span className={`dot dot-${status?.state || "scanning"}`} />
        <strong>{(status?.state || "scanning").toUpperCase()}</strong>
      </div>
      <div className="kv">Total PnL: ${Number(status?.totalPnl || 0).toFixed(2)}</div>
      <div className="kv">Win Rate: {Math.round((status?.winRate || 0) * 100)}%</div>
      <div className="kv">Last Trade: {status?.lastTradeAt || "-"}</div>
    </section>
  );
}
