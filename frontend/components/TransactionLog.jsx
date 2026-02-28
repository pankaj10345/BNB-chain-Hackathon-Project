export default function TransactionLog({ transactions }) {
  return (
    <section className="card">
      <div className="card-title">Transaction Log</div>
      <div className="tx-list">
        {transactions?.length ? (
          transactions.map((tx) => (
            <article key={tx.id} className="tx-item">
              <div>
                <strong>{tx.strategy}</strong>
                <p>{tx.txHash.slice(0, 16)}...</p>
              </div>
              <div>
                <p>Profit: ${tx.profit}</p>
                <p>Gas: ${tx.gasUsd}</p>
              </div>
            </article>
          ))
        ) : (
          <p className="empty">No transactions yet</p>
        )}
      </div>
    </section>
  );
}
