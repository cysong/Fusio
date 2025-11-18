# Fusio - Multi-Exchange Aggregated Trading Platform

![Backend Deploy](https://github.com/cysong/Fusio/actions/workflows/backend-fly-deploy.yml/badge.svg?branch=master)
![Frontend Deploy](https://github.com/cysong/Fusio/actions/workflows/frontend-pages-deploy.yml/badge.svg?branch=master)

> Real-time crypto market aggregation and demo trading experience.

Fusio is a real-time, multi-exchange crypto aggregation platform that provides a unified market dashboard and simulated trading experience.

## Documentation
- [USER_STORIES.md](./USER_STORIES.md): User stories and acceptance criteria.
- [DESIGN.md](./DESIGN.md): Architecture and phased roadmap.
- [DEVELOPMENT.md](./docs/DEVELOPMENT.md): Developer guide.

## Features
- **Real-time multi-exchange aggregation**: Binance/Bybit/OKX WebSocket adapters with normalized tickers, best-price detection, spread display, and consolidated order book/ticker snapshots.
- **Trading demo with safeguards**: JWT auth, seeded 10k USDT demo balance, simulated order execution with balance checks, order limits, circuit-breaker hooks, and audit-ready order history.
- **Modular NestJS backend**: Market/trading/risk modules, exchange adapter layer, Socket.io gateway for live pushes, Redis caching, and TypeORM (SQLite/PostgreSQL) persistence.
- **Observability and ops**: Prometheus/Grafana metrics and dashboards, health checks, CI/CD to Fly.io (backend) and Cloudflare Pages (frontend), guard/risk patterns in the request flow.
- **Frontend UX for realtime data**: React/Vite + Ant Design with connection status indicators, live price color cues, and grouped price comparisons across venues.
- **Scalability path**: Adapter pattern to add venues, Bull/Redis for async processing, and roadmap items for smart order routing plus deeper risk/monitoring controls.

## Quick Start
### Requirements
- Node.js 20+
- pnpm 8+

### Install Dependencies
```bash
# Backend dependencies
cd backend
pnpm install

# Frontend dependencies
cd ../frontend
pnpm install
```

### Run Services
**Backend**
```bash
cd backend
pnpm run start:dev
```
API available at `http://localhost:4000/api`

**Frontend**
```bash
cd frontend
pnpm run dev
```
App available at `http://localhost:5173`

### Live Demo
- Frontend: `https://fusio-1fu.pages.dev/`
- Backend: deployed on Fly.io (`https://fusio-my09ug.fly.dev`, API under `/api`)

### Usage
1. Open home page
2. Click "Register" to create an account
3. Use an email and a password (>=8 chars, upper/lowercase, numbers)
4. After registration you're auto-logged in and redirected to the dashboard
5. View real-time market data and your profile info

## Tech Stack
- **Backend**: NestJS, TypeScript, TypeORM, SQLite/PostgreSQL, Redis, Socket.io, JWT, bcrypt
- **Frontend**: Vite, React 18, TypeScript, Ant Design, Zustand, TanStack Query, Socket.io-client

## Roadmap
- **V0.1**: User auth and security basics
- **V0.2**: Real-time market dashboard (Binance WebSocket + Redis cache)
- **V0.3**: Multi-exchange aggregation (Bybit, OKX)
- **V0.4**: Simulated order execution and history
- **V0.5**: Smart order routing
- **V0.6**: Risk controls (balance checks, limits, circuit breaker)
- **V0.7**: Monitoring & observability (Prometheus, Grafana)

See [DESIGN.md](./DESIGN.md) for the full roadmap.

## License
For technical demonstration purposes only.

## CI/CD & Deployment
- GitHub Actions
  - Backend deploy: `.github/workflows/backend-fly-deploy.yml` (Fly.io, builds from `fly.toml`/`backend/Dockerfile`)
  - Frontend deploy: `.github/workflows/frontend-pages-deploy.yml` (Cloudflare Pages)
- Environment / Secrets (examples)
  - Fly: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `PORT=3000` (set via Fly secrets)
  - Frontend build: `VITE_API_BASE` pointing to the backend origin (e.g., `https://fusio-my09ug.fly.dev`)
- Health check: `/api/health` (Fly health check path aligned)
