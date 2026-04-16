# Pixel Realm Online — Multiplayer Server Setup

The game already has a complete, production-ready WebSocket server at `server/server.js`.
This guide walks you through deploying it so real players can see each other.

---

## How It Works

```
Browser ──WS──▶ Game Server (server.js)
                 │
                 ├── PostgreSQL (player persistence)
                 └── Redis (leaderboard, optional)
```

- The server runs the authoritative game simulation at 15 TPS
- Players connect via WebSocket and send only input keys (`up`/`down`/`left`/`right`)
- The server calculates all positions, combat, XP, gold — no client cheating possible
- On disconnect, player progress is saved to PostgreSQL and restored on reconnect

---

## Option A: Railway (Recommended — Free Tier Available)

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **New Project → Deploy from GitHub repo**
3. Select this repo — when Railway asks for the service root, point it to the `server/` folder
4. Railway auto-detects the `package.json` and runs `node server/server.js`

**Add environment variables in Railway dashboard:**

| Variable | Value | Required |
|----------|-------|----------|
| `GAME_PORT` | `8080` | No (default) |
| `DATABASE_URL` | Your PostgreSQL URL | Recommended |
| `REDIS_URL` | Your Redis URL | Optional |

5. Railway gives you a URL like `https://game-server-production.up.railway.app`
6. Convert it to WebSocket: `wss://game-server-production.up.railway.app`

**Add a PostgreSQL database in Railway:**
- In your project, click **New → Database → PostgreSQL**
- Railway automatically injects `DATABASE_URL` into your server service

7. Set `NEXT_PUBLIC_GAME_WS_URL` in your mini-app's `.env`:
   ```
   NEXT_PUBLIC_GAME_WS_URL=wss://game-server-production.up.railway.app
   ```
8. The mini-app will now connect to the real server instead of the local sim.

---

## Option B: Render (Also Free)

1. Go to [render.com](https://render.com) → New Web Service
2. Connect your GitHub repo, set root directory to `server/`
3. Build command: `npm install`
4. Start command: `node server.js`
5. Add env vars: `DATABASE_URL`, `REDIS_URL` (optional)
6. Copy the service URL → convert to `wss://` → set as `NEXT_PUBLIC_GAME_WS_URL`

---

## Option C: Fly.io

```bash
cd server/
fly launch --name pixel-realm-server
fly secrets set DATABASE_URL="postgres://..."
fly deploy
```

---

## Testing Your Server

Once deployed, check the health endpoint:
```
https://your-server-url/health
```

Should return:
```json
{
  "ok": true,
  "players": 0,
  "entities": 80,
  "zones": { "greenfields": 20, "forest": 22, "dungeon": 24, "town": 14 },
  "dbEnabled": true,
  "redisEnabled": false
}
```

---

## What the Server Handles

| Feature | Status |
|---------|--------|
| Real-time multiplayer (all players see each other) | ✅ |
| Server-authoritative movement (anti-cheat) | ✅ |
| Server-authoritative combat (no damage hacks) | ✅ |
| Player persistence (login/logout saves progress) | ✅ with DATABASE_URL |
| Zone travel (greenfields, forest, dungeon, town) | ✅ |
| Monster AI (aggro, wander, attack) | ✅ |
| Agent AI (farming, aggressive bots) | ✅ |
| Loot drops | ✅ |
| Leaderboard | ✅ with Redis (or PostgreSQL fallback) |
| Auto-reconnect on disconnect | ✅ |
| Interest culling (only nearby entities sent) | ✅ |

---

## Local Testing

```bash
cd server/
npm install
node server.js
```

Then set in your app's `.env`:
```
NEXT_PUBLIC_GAME_WS_URL=ws://localhost:8080
```

The app will connect to your local server instead of the sim.
