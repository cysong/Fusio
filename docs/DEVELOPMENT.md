# Fusio - Development Guide

> 开发者技术文档

## 技术架构

### 后端

**当前实现**:
- 框架: NestJS 11.x + TypeScript + Node.js 20 LTS
- 数据库: SQLite (开发) / PostgreSQL (生产预留)
- ORM: TypeORM
- 认证: JWT + Passport
- 验证: class-validator + class-transformer
- 安全: bcrypt, CORS, 全局异常过滤器
- 缓存: Redis 7 (ioredis)
- 实时通信: Socket.io (WebSocket Gateway)
- 交易所集成: **多交易所适配器架构** ✅
  - **Binance WebSocket** (ws 库) ✅
  - **Bybit V5 WebSocket** ✅
  - **OKX V5 WebSocket** ✅
- 市场数据: 实时价格流、数据标准化、统一接口、广播机制
- 架构模式: 适配器模式 + 工厂模式 + 配置驱动

**后续规划**:
- PostgreSQL 16 (订单、用户数据)
- Bull Queue + Redis (异步订单处理)
- 更多交易所适配器 (Kraken, Coinbase)
- Prometheus + Winston (监控和日志)

### 前端

**当前实现**:
- 框架: Vite 5.x + React 18 + TypeScript
- UI组件: Ant Design 5.x
- 状态管理: Zustand (全局) + TanStack Query (服务端)
- 路由: React Router v7
- HTTP客户端: Axios
- 实时通信: Socket.io-client (WebSocket 连接管理)
- 时间处理: dayjs (相对时间)
- 实时组件: ConnectionStatus, PriceCard, PriceBoard

**后续规划**:
- Lightweight Charts (价格可视化)

### 基础设施

规划中:
- Docker + Docker Compose
- Grafana + Prometheus (监控)
- GitHub Actions (CI/CD)

## 项目结构

### 当前结构

```
fusio/
├── backend/                    # NestJS 后端
│   ├── data/                  # SQLite 数据库文件
│   ├── src/
│   │   ├── common/            # 全局过滤器、拦截器
│   │   ├── config/
│   │   │   ├── database.config.ts     # 数据库配置
│   │   │   └── exchanges.config.ts    # 交易所配置 ✅ NEW
│   │   └── modules/
│   │       ├── auth/          # 认证模块 (JWT)
│   │       ├── user/          # 用户实体
│   │       └── market/        # 市场数据模块 ⬅️ 重构
│   │           ├── interfaces/
│   │           │   ├── ticker.interface.ts       # Ticker 数据接口
│   │           │   └── exchange-config.interface.ts  # 配置接口 ✅ NEW
│   │           ├── adapters/  # 交易所适配器层
│   │           │   ├── base-exchange.adapter.ts  # 抽象基类 ✅ NEW
│   │           │   ├── binance.adapter.ts        # Binance 实现 ♻️ 重构
│   │           │   ├── bybit.adapter.ts          # Bybit 实现 ✅ NEW
│   │           │   └── okx.adapter.ts            # OKX 实现 ✅ NEW
│   │           ├── factories/
│   │           │   └── exchange-adapter.factory.ts  # 适配器工厂 ✅ NEW
│   │           ├── market.service.ts    # 核心业务逻辑 ♻️ 重构
│   │           ├── market.gateway.ts    # Socket.io Gateway
│   │           ├── market.controller.ts # REST API ♻️ 增强
│   │           └── market.module.ts     # 模块定义
│   └── .env.development       # 开发环境变量
│
├── frontend/                   # Vite + React 前端
│   ├── src/
│   │   ├── api/              # API 接口
│   │   ├── components/       # React 组件
│   │   │   ├── ConnectionStatus.tsx  # 连接状态
│   │   │   ├── PriceCard.tsx        # 价格卡片
│   │   │   └── PriceBoard.tsx       # 价格看板
│   │   ├── lib/              # Axios, QueryClient, Socket.io
│   │   ├── pages/            # 页面组件
│   │   ├── stores/           # Zustand 状态
│   │   └── types/            # TypeScript 类型
│   │       └── market.ts     # 市场数据类型
│   └── .env                  # 环境变量
│
└── docs/                      # 文档目录
```

### 规划中的完整结构

```
fusio/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/          # JWT 认证
│   │   │   ├── market/        # 市场数据聚合
│   │   │   ├── trading/       # 订单执行
│   │   │   ├── risk/          # 风险控制
│   │   │   ├── exchange/      # 交易所适配器 (Binance, Bybit, OKX)
│   │   │   └── monitoring/    # Prometheus 指标
│   │   ├── common/
│   │   │   ├── guards/        # 认证、风控守卫
│   │   │   ├── interceptors/  # 指标拦截器
│   │   │   └── filters/       # 异常过滤器
│   │   └── main.ts
│   └── test/
├── frontend/
│   ├── src/
│   │   ├── pages/             # Login, Dashboard, Trading, Orders
│   │   ├── components/        # PriceBoard, TradingPanel, OrderHistory
│   │   ├── lib/               # socket.ts, api.ts
│   │   └── stores/            # Zustand stores
└── monitoring/                 # 监控配置
    ├── prometheus/
    └── grafana/
```

## 数据库设计

### User Entity

支持从 SQLite 无缝迁移到 PostgreSQL。

**基础字段**:
- `id`: UUID主键
- `email`: 唯一邮箱 (索引)
- `passwordHash`: bcrypt 哈希密码
- `nickname`: 用户昵称

**扩展字段（预留）**:
- 角色权限: `role`, `status`
- 交易相关: `balanceUsdt`, `totalOrders`
- KYC认证: `isKycVerified`, `kycLevel`
- 安全: `twoFactorSecret`, `isTwoFactorEnabled`
- 统计: `lastLoginAt`, `lastLoginIp`
- 乐观锁: `version`

### 规划中的数据表

**orders** (订单表):
- `id`, `user_id`, `exchange`, `symbol`, `side`, `type`
- `quantity`, `price`, `status`, `filled_price`
- `created_at`, `filled_at`
- 索引: `(user_id, created_at DESC)`, `(status)`

**market_snapshots** (市场快照):
- `id`, `exchange`, `symbol`, `open_price`, `high_price`
- `low_price`, `close_price`, `volume`, `snapshot_time`
- 索引: `(exchange, symbol, snapshot_time)`

## API 端点

### 认证接口

```
POST   /api/auth/register    注册新用户
POST   /api/auth/login       用户登录
GET    /api/auth/profile     获取当前用户信息 (需认证)
```

### 市场数据接口

```
GET    /api/market/ticker/:exchange/:base/:quote    获取特定交易所价格
       示例: GET /api/market/ticker/binance/BTC/USDT
       示例: GET /api/market/ticker/bybit/ETH/USDT
       示例: GET /api/market/ticker/okx/BTC/USDT

GET    /api/market/ticker/:base/:quote/all         获取所有交易所价格（聚合）
       示例: GET /api/market/ticker/BTC/USDT/all
       返回: [binanceData, bybitData, okxData]

GET    /api/market/status                          获取所有连接状态
       返回: { "binance:BTC/USDT": true, "bybit:BTC/USDT": true, ... }
```

### WebSocket 接口

```
命名空间: /market
事件:
  - ticker: 实时价格推送
  - connect: 连接成功
  - disconnect: 连接断开
  - connect_error: 连接错误
```

### 响应格式

**成功响应**:
```json
{
  "success": true,
  "data": { }
}
```

**错误响应**:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "错误信息",
  "timestamp": "2025-01-13T10:00:00.000Z",
  "path": "/api/auth/register"
}
```

## 数据库迁移

### 从 SQLite 切换到 PostgreSQL

1. 修改 `.env` 文件:

```env
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=fusio
```

2. 安装 PostgreSQL 驱动:

```bash
pnpm install pg
```

3. 重启后端服务，TypeORM 会自动使用新配置。无需修改任何代码。

## 安全特性

- 密码 bcrypt 哈希（rounds=10）
- JWT Token 认证
- 全局验证管道（whitelist, forbidNonWhitelisted）
- CORS 配置
- 全局异常过滤器
- 防SQL注入（TypeORM参数化查询）
- 密码强度验证
- 邮箱唯一性检查

## 核心系统模块

### ✅ 已实现模块

**Market Data Service** (V0.2 完成)
- 从多个交易所 WebSocket 聚合实时价格
- 统一 TickerData 接口进行数据标准化
- Socket.io 广播给所有连接客户端
- Redis 缓存最新价格（10 秒过期）
- 支持 3 个交易所：Binance, Bybit, OKX

**Exchange Adapter Layer** (V0.3 完成)
- 使用适配器模式 + 工厂模式
- BaseExchangeAdapter 抽象基类
- 配置驱动：exchanges.config.ts
- 统一生命周期管理（connect, disconnect, reconnect）
- 自动重连机制（最多 5 次尝试）

### 📋 规划中模块

**Trading Service**
智能订单路由 (SOR)，Bull Queue 异步执行，订单状态管理。

**Risk Control Service**
余额检查，每日订单限额，极端价格波动熔断机制。

**Monitoring Service**
Prometheus 指标收集 (API 延迟、WebSocket 连接、订单成功率)。

## 交易所 API 集成

所有三个交易所都提供无需 API Key 的公共市场数据。

### Binance WebSocket

**文档**: https://binance-docs.github.io/apidocs/spot/en/#websocket-market-streams

**连接信息**
- 端点: `wss://stream.binance.com:9443` 或 `wss://data-stream.binance.vision`
- 公开市场数据: 无需 API Key
- 订阅格式: `{symbol}@ticker` (例如: btcusdt@ticker)

**速率限制**
- 5 消息/秒
- 300 连接/5分钟/IP
- 连接时长: 24 小时自动断开

**心跳机制**
- 服务器每 20秒 ping
- 客户端必须在 60秒内 pong

**数据格式**
```json
{
  "e": "24hrTicker",
  "E": 1672515782136,
  "s": "BTCUSDT",
  "p": "1.00",
  "P": "0.015",
  "c": "16500.00",
  "v": "12345.67"
}
```

### Bybit WebSocket

**文档**: https://bybit-exchange.github.io/docs/v5/websocket/public/ticker

**连接信息**
- 端点: `wss://stream.bybit.com/v5/public/spot`
- 公开市场数据: 无需 API Key
- 订阅格式: `tickers.{symbol}` (例如: tickers.BTCUSDT)

**推送频率**
- 衍生品/期权: 100ms
- 现货: 50ms

**数据格式**
```json
{
  "topic": "tickers.BTCUSDT",
  "type": "snapshot",
  "data": {
    "symbol": "BTCUSDT",
    "lastPrice": "16500.00",
    "volume24h": "12345.67",
    "price24hPcnt": "0.0150"
  }
}
```

### OKX WebSocket

**文档**: https://www.okx.com/docs-v5/en/#websocket-api

**连接信息**
- 端点: `wss://ws.okx.com:8443/ws/v5/public`
- 公开市场数据: 无需 API Key
- 私有频道: 需要 API Key + Secret + Passphrase (HMAC SHA256)

**速率限制**
- 3 请求/秒/IP
- 480 订阅/小时/连接
- 连接限制: 每个子账户每个特定频道最多 30 个连接

**心跳机制**
- 无消息时必须在 30秒内 ping

**订阅格式**
```json
{
  "op": "subscribe",
  "args": [{
    "channel": "tickers",
    "instId": "BTC-USDT"
  }]
}
```

**数据格式**
```json
{
  "arg": {
    "channel": "tickers",
    "instId": "BTC-USDT"
  },
  "data": [{
    "instId": "BTC-USDT",
    "last": "16500",
    "vol24h": "12345.67",
    "sodUtc0": "0.015"
  }]
}
```

## 设计决策

**为什么选择 NestJS**
企业级架构，提供依赖注入、守卫、拦截器等开箱即用的功能。

**为什么选择 Bull Queue**
基于 Redis 的可靠任务队列，支持重试和任务优先级。

**为什么模拟执行**
Demo 无需真实交易，专注于系统架构和数据流。

**为什么选择 Socket.io**
抽象 WebSocket 复杂性，提供自动重连、基于房间的广播。

**为什么选择 TypeORM**
Active Record 模式简化 CRUD 操作，同时支持复杂查询的原生 SQL。

## 测试策略

规划中的测试方案：

- **单元测试**: 服务层逻辑、风控规则、路由算法
- **E2E 测试**: 完整交易流程（提交订单 → 异步执行 → 状态更新）
- **WebSocket 测试**: 连接稳定性、重连、消息处理
- **性能测试**: API 延迟 < 200ms (P95)，订单处理 < 3s

## 常见问题

### SQLite 构建错误

本项目使用 `better-sqlite3` 作为 SQLite 驱动。如果遇到构建问题：

```bash
cd backend
cd node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3
npm run install
```

或者切换到 PostgreSQL（修改 `.env` 中的 `DB_TYPE=postgres`）。

### CORS 错误

确保前端端口与后端 `.env` 中的 `CORS_ORIGIN` 一致（默认: http://localhost:5173）。

### Token 过期

Token 默认有效期 7 天，可在 `.env` 中修改 `JWT_EXPIRES_IN`。

### WebSocket 连接警告

**问题现象**：
刷新页面时控制台出现 "WebSocket is closed before the connection is established" 警告。

**根本原因**：
1. Socket.io 事件监听器未正确清理，导致重复注册
2. React 18 Strict Mode 下 useEffect 执行两次，加剧问题
3. 在连接建立前调用 `disconnect()` 导致 WebSocket 被过早关闭

**解决方案**：

**1. 使用命名函数注册监听器**

错误做法：
```typescript
socket.on('connect', () => { ... }); // 匿名函数无法移除
```

正确做法：
```typescript
const handleConnect = () => { ... };
socket.on('connect', handleConnect);
// cleanup 时:
socket.off('connect', handleConnect); // 必须是同一个函数引用
```

**2. 正确的 cleanup 顺序**

```typescript
return () => {
  // 1. 先移除事件监听器
  socket.off('connect', handleConnect);
  socket.off('ticker', handleTicker);

  // 2. 再断开连接
  socketClient.disconnect();
};
```

**3. 严格的连接状态判断**

```typescript
disconnect() {
  if (!this.socket) return;

  // 只在真正连接后才调用 disconnect()
  if (this.socket.connected) {
    this.socket.disconnect();
  }
  // 如果正在连接，不做任何操作
  else if (this.isConnecting) {
    return; // 避免关闭正在连接的 WebSocket
  }
}
```

## 多交易所架构设计 (V0.3)

### 架构图

```
配置层 (exchanges.config.ts)
    ↓
MarketService (启动所有数据流)
    ↓
ExchangeAdapterFactory (创建适配器)
    ↓
BaseExchangeAdapter (抽象基类)
    ├─ BinanceAdapter
    ├─ BybitAdapter
    └─ OkxAdapter
    ↓
统一 TickerData 接口
    ↓
Redis 缓存 + Socket.io 广播
```

### 关键设计决策

**1. 适配器模式**
每个交易所继承 BaseExchangeAdapter，实现统一接口：
- `connect(nativeSymbol, standardSymbol)`
- `disconnect()`
- `normalizeTickerData(raw, standardSymbol)`

**2. 工厂模式**
ExchangeAdapterFactory 根据 exchangeId 动态创建适配器实例。

**3. 配置驱动**
所有交易所和交易对配置在 exchanges.config.ts：
- WebSocket 端点
- 重连策略
- 原生符号映射（btcusdt vs BTCUSDT vs BTC-USDT）

**4. 统一数据格式**
所有交易所数据规范化为 TickerData：
```typescript
{
  exchange: 'binance',
  symbol: 'BTC/USDT',
  price: 96958.80,
  priceChangePercent: 5.91,
  volume: 18062.20,
  high24h: 97500.00,
  low24h: 95000.00,
  timestamp: 1234567890,
  source: {
    nativeSymbol: 'btcusdt',
    exchangeTimestamp: 1234567890123
  }
}
```

### 扩展新交易所

只需 3 步（无需修改核心代码）：

1. 在 `exchanges.config.ts` 添加配置
2. 创建 `NewExchangeAdapter extends BaseExchangeAdapter`
3. 在 `ExchangeAdapterFactory` 添加 case

**示例：添加 Kraken**
```typescript
// 1. exchanges.config.ts
kraken: {
  id: 'kraken',
  name: 'Kraken',
  enabled: true,
  wsEndpoint: 'wss://ws.kraken.com',
  ...
}

// 2. kraken.adapter.ts
export class KrakenAdapter extends BaseExchangeAdapter {
  async connect(...) { ... }
  normalizeTickerData(...) { ... }
}

// 3. exchange-adapter.factory.ts
case 'kraken':
  return new KrakenAdapter(config, onTickerUpdate, onError);
```

### 特殊处理

**Bybit 心跳**
- 发送 JSON: `{"op":"ping"}`
- 响应 JSON: `{"op":"pong"}`
- 间隔: 20 秒

**OKX 心跳**
- 发送字符串: `"ping"`
- 响应字符串: `"pong"` (非 JSON，需特殊处理)
- 间隔: 15 秒

**Binance 心跳**
- 无需客户端心跳
- 服务器自动 ping

## 开发日志

- **2025-01-13**: V0.1 完成 - 用户注册登录系统
- **2025-01-14**: V0.2 完成 - 实时市场数据看板
  - Binance WebSocket 适配器实现
  - Socket.io 实时推送机制
  - Redis 缓存集成
  - 多币种支持（BTC/USDT, ETH/USDT）
  - WebSocket 警告深度修复（事件监听器管理优化）
- **2025-01-14**: V0.3 完成 - 多交易所聚合 ✅
  - 建立可扩展的多交易所架构
  - 适配器模式 + 工厂模式 + 配置驱动
  - 集成 Bybit V5 WebSocket API
  - 集成 OKX V5 WebSocket API
  - 统一数据格式（TickerData 接口增强）
  - 修复 OKX pong 响应处理（字符串 vs JSON）
  - 修复前端 ticker 覆盖问题（使用 exchange:symbol 组合 key）
  - 新增 API 端点：聚合查询、连接状态
