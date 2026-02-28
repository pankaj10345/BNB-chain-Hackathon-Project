function pct(value) {
  return `${Math.round(value * 100)}%`;
}

export default function YieldTracker({ allocation }) {
  const rows = Object.entries(allocation || {});

  return (
    <section className="card">
      <div className="card-title">Yield Allocation</div>
      {rows.length ? (
        rows.map(([name, value]) => (
          <div className="yield-row" key={name}>
            <div className="yield-label">
              <span>{name}</span>
              <span>{pct(value)}</span>
            </div>
            <div className="bar">
              <div className="fill" style={{ width: pct(value) }} />
            </div>
          </div>
        ))
      ) : (
        <p className="empty">Waiting for allocation data</p>
      )}
    </section>
  );
}
