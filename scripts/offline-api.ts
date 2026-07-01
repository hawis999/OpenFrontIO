import express from "express";
import type { GameRecord } from "../src/core/Schemas";

const app = express();
const port = Number(process.env.OFFLINE_API_PORT ?? 8787);
const archivedGames = new Map<string, GameRecord>();

const emptyCosmetics = {
  colorPalettes: {},
  patterns: {},
  flags: {},
  skins: {},
  effects: {
    transportShipTrail: {},
    nukeTrail: {},
  },
  currencyPacks: {},
  subscriptions: {},
};

app.use(express.json({ limit: "25mb" }));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin ?? "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "authorization,content-type,x-api-key",
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

app.get("/cosmetics.json", (_req, res) => {
  res.json(emptyCosmetics);
});

app.get("/profane_words_game_server", (_req, res) => {
  res.json([]);
});

app.get("/reserved_clan_tags", (_req, res) => {
  res.json([]);
});

app.post("/matchmaking/checkin", (_req, res) => {
  res.json({ assignment: false });
});

app.post("/turnstile", (_req, res) => {
  res.json({ success: true });
});

app.post("/game/:id", (req, res) => {
  archivedGames.set(req.params.id, req.body as GameRecord);
  res.json({ success: true });
});

app.get("/game/:id", (req, res) => {
  const game = archivedGames.get(req.params.id);
  if (!game) {
    res.status(404).json({ error: "Game not found in offline archive" });
    return;
  }
  res.json(game);
});

app.post("/auth/refresh", (_req, res) => {
  res.status(401).json({ error: "Offline API has no account session" });
});

app.post("/auth/logout", (_req, res) => {
  res.json({ success: true });
});

app.post("/auth/revoke", (_req, res) => {
  res.json({ success: true });
});

app.get("/users/@me", (_req, res) => {
  res.status(401).json({ error: "Offline API has no linked account" });
});

app.use("/public", (_req, res) => {
  res.json([]);
});

app.use((_req, res) => {
  res.status(404).json({ error: "Offline API endpoint not implemented" });
});

app.listen(port, () => {
  console.log(`Offline OpenFront API listening on http://localhost:${port}`);
});
