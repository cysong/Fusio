# Fusio - Multi-Exchange Aggregated Trading Platform

> Real-time crypto market aggregation and demo trading experience.

Fusio is a real-time, multi-exchange crypto aggregation platform that provides a unified market dashboard and simulated trading experience.

## Documentation
- [USER_STORIES.md](./USER_STORIES.md): User stories and acceptance criteria.
- [DESIGN.md](./DESIGN.md): Architecture and phased roadmap.
- [DEVELOPMENT.md](./docs/DEVELOPMENT.md): Developer guide.

## Features
- **User Authentication**: Email registration/login, password strength validation (>=8 chars with upper/lowercase and numbers), JWT auth, auto-seeded demo balance (10,000 USDT).
- **Profile**: Shows role, registration time, and last login time/IP.
- **Real-Time Market Data**: Live prices (BTC/USDT, ETH/USDT), price change color cues, 24h change %, WebSocket streaming, connection status indicator.
- **Multi-Exchange Aggregation**: Unified data from Binance, Bybit, and OKX with normalized symbols and pricing.
- **Order Book & Ticker View**: Consolidated order book and ticker snapshots to visualize depth and price action.
- **Simulated Trading**: Paper-trade flows powered by the demo balance; balances update on fills.
- **Order History**: Inspect simulated orders and executions for auditability.
- **Risk Controls**: Balance checks, order limits, and circuit breaker hooks to prevent abnormal flows.
- **Monitoring & Observability**: Prometheus metrics and Grafana dashboards for service health and data latency.

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

### Usage
1. Open `http://localhost:5173`
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
