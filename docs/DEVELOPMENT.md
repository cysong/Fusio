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
- 交易所集成: Binance WebSocket (ws 库)
- 市场数据: 实时价格流、数据标准化、广播机制

**后续规划**:
- PostgreSQL 16 (订单、用户数据)
- Bull Queue + Redis (异步订单处理)
- Bybit、OKX WebSocket 适配器
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
│   │   ├── config/            # 数据库、Redis 配置
│   │   └── modules/
│   │       ├── auth/          # 认证模块 (JWT)
│   │       ├── user/          # 用户实体
│   │       └── market/        # 市场数据模块
│   │           ├── interfaces/     # 数据接口定义
│   │           ├── adapters/       # Binance WebSocket 适配器
│   │           ├── market.service.ts    # 核心业务逻辑
│   │           ├── market.gateway.ts    # Socket.io Gateway
│   │           ├── market.controller.ts # REST API
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
GET    /api/market/ticker/:exchange/:symbol    获取最新价格 (调试用)
       示例: GET /api/market/ticker/binance/BTCUSDT
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

规划中的系统模块：

**Market Data Service**
从交易所 WebSocket 聚合实时价格，数据标准化，广播给客户端，Redis 缓存。

**Trading Service**
智能订单路由 (SOR)，Bull Queue 异步执行，订单状态管理。

**Risk Control Service**
余额检查，每日订单限额，极端价格波动熔断机制。

**Exchange Adapter Layer**
使用适配器模式的抽象基类进行交易所集成。

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

详见项目根目录下的 `SOCKET-WARNING-FIX-V2.md` 获取完整修复过程。

## 开发日志

- **2025-01-13**: V0.1 完成 - 用户注册登录系统
- **2025-01-14**: V0.2 完成 - 实时市场数据看板
  - Binance WebSocket 适配器实现
  - Socket.io 实时推送机制
  - Redis 缓存集成
  - 多币种支持（BTC/USDT, ETH/USDT）
  - WebSocket 警告深度修复（事件监听器管理优化）
