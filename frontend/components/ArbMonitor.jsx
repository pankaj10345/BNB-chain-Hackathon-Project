export default function ArbMonitor({ opportunities }) {
  return (
    <section className="card">
      <div className="card-title">Live Arb Monitor</div>
      <div className="opps-grid">
        {opportunities?.length ? (
          opportunities.map((opp, idx) => (
            <article key={`${opp.market_title}-${idx}`} className="opp-item">
              <h3>{opp.market_title}</h3>
              <p>
                {opp.platform_a}: {opp.price_a}% {"->"} {opp.platform_b}: {opp.price_b}%
              </p>
              <p>
                Gap <strong>{opp.gap_bps} bps</strong> | Est. Profit <strong>${opp.net_profit}</strong>
              </p>
            </article>
          ))
        ) : (
          <p className="empty">No active opportunities</p>
        )}
      </div>
    </section>
  );
}
