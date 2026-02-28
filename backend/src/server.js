import cors from "cors";
import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";

import { config } from "./config.js";
import { InMemoryDataStore } from "./dataStore.js";

const app = express();
app.use(cors());
app.use(express.json());

const store = new InMemoryDataStore();
let latest = store.updateFromTick();

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "predictarb-backend", ts: new Date().toISOString() });
});

app.get("/api/opportunities", (_req, res) => {
  res.json({ items: latest.opportunities });
});

app.get("/api/status", (_req, res) => {
  res.json(latest.status);
});

app.get("/api/transactions", (_req, res) => {
  res.json({ items: latest.transactions });
});

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: "/live" });

wss.on("connection", (socket) => {
  socket.send(
    JSON.stringify({
      type: "snapshot",
      opportunities: latest.opportunities,
      status: latest.status,
      transactions: latest.transactions,
    })
  );
});

setInterval(() => {
  latest = store.updateFromTick();

  const payload = JSON.stringify({
    type: "tick",
    opportunities: latest.opportunities,
    status: latest.status,
    transactions: latest.transactions,
    ts: Date.now(),
  });

  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }
}, config.pollMs);

httpServer.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`PredictArb backend listening on http://localhost:${config.port}`);
});
