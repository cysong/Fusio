# Fusio - System Design

> 多交易所聚合交易平台系统设计文档

## 系统概述

### 产品定位

多交易所加密货币交易聚合平台，提供统一的市场数据看板和智能订单路由服务。

### 核心价值

- 聚合多交易所实时数据，按币种分组对比展示
- 智能订单路由，自动选择最优价格
- 完整的风险控制体系
- 生产级监控和可观测性

### 用户访问流程

```
访问首页 (/)
    ↓
Landing Page (产品宣传页)
    ↓
点击 [Try It Now] → Login Modal
    ↓
登录成功
    ↓
Main Layout (侧边栏 + 主内容区)
    ↓
Market Overview (默认页面)
```

## 系统架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (Vite + React)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Price Board  │  │ Trade Panel  │  │ Order Book   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                  │                   │
│         └─────────────────┴──────────────────┘                   │
│                           │                                      │
│                    Socket.io Client                              │
└───────────────────────────┼──────────────────────────────────────┘
                            │
┌───────────────────────────┼──────────────────────────────────────┐
│                  Backend (NestJS)                                 │
│  ┌────────────────────────┴─────────────────────────┐            │
│  │         API Gateway / Main Module                │            │
│  │   [Auth Guard] [Rate Limiter] [Risk Control]    │            │
│  └────────┬────────────────────────┬─────────────────┘           │
│           │                        │                             │
│  ┌────────▼────────┐      ┌───────▼──────────┐                  │
│  │ WebSocket       │      │  REST/GraphQL    │                  │
│  │ Gateway         │      │  Controllers     │                  │
│  └────────┬────────┘      └───────┬──────────┘                  │
│           │                        │                             │
│  ┌────────▼────────────────────────▼──────────┐                 │
│  │            Service Layer                    │                 │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐ │                 │
│  │  │ Market   │  │ Trading  │  │   Risk   │ │                 │
│  │  │ Service  │  │ Service  │  │ Service  │ │                 │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘ │                 │
│  └───────┼─────────────┼─────────────┼────────┘                 │
│          │             │             │                           │
│  ┌───────▼─────────────▼─────────────▼────────┐                 │
│  │       Exchange Adapter Layer                │                 │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐ │                 │
│  │  │ Binance  │  │  Bybit   │  │   OKX    │ │                 │
│  │  │ Adapter  │  │ Adapter  │  │ Adapter  │ │                 │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘ │                 │
│  └───────┼─────────────┼─────────────┼────────┘                 │
│          │             │             │                           │
│  ┌───────▼─────────────▼─────────────▼────────┐                 │
│  │         Bull Queue (Async Jobs)             │                 │
│  └──────────────────────┬──────────────────────┘                 │
└─────────────────────────┼────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   ┌────▼─────┐    ┌─────▼──────┐   ┌─────▼──────┐
   │PostgreSQL│    │   Redis    │   │Prometheus  │
   └──────────┘    └────────────┘   └─────┬──────┘
                                           │
                                    ┌──────▼──────┐
                                    │  Grafana    │
                                    └─────────────┘
```

### 技术栈

**后端**
- 框架: NestJS + TypeScript + Node.js 20 LTS
- 数据库: PostgreSQL 16 / SQLite (开发)
- ORM: TypeORM
- 缓存: Redis 7
- 队列: Bull Queue
- 实时通信: Socket.io
- 认证: JWT + Passport
- 监控: Prometheus + Grafana

**前端**
- 框架: Vite + React 18 + TypeScript
- UI: Ant Design 5
- 状态: Zustand + TanStack Query
- 路由: React Router v7
- 实时: Socket.io-client
- 图表: Lightweight Charts

**基础设施**
- 容器: Docker + Docker Compose
- CI/CD: GitHub Actions
- 监控: Grafana + Prometheus

## 前端 UI 架构

### 页面布局设计

**Landing Page (单栏全屏)**
```
┌─────────────────────────────────────────────────────────┐
│  Header: FUSIO 🔷    [Try It Now] [Sign Up]            │
├─────────────────────────────────────────────────────────┤
│  Hero Section: 大标题 + CTA 按钮                         │
│  Features Section: 核心功能展示                          │
│  Roadmap Section: 开发路线图                             │
│  Footer                                                 │
└─────────────────────────────────────────────────────────┘
```

**Main Layout (两栏布局，登录后)**
```
┌────────────────────────────────────────────────────────┐
│  ╔════════════════╗  ┌────────────────────────────────┐│
│  ║  Sidebar       ║  │  Main Content Area            ││
│  ║                ║  │  (Market Overview / 其他页面) ││
│  ║  - User Card   ║  │                                ││
│  ║  - Menu Items  ║  │                                ││
│  ║  - Logout      ║  │                                ││
│  ╚════════════════╝  └────────────────────────────────┘│
└────────────────────────────────────────────────────────┘
```

### 侧边栏菜单结构

```
╔═══════════════════════════════════╗
║  FUSIO 🔷                         ║
║───────────────────────────────────║
║  👤 User Card (可点击)             ║
║  John Doe                         ║
║  john@example.com                 ║
║  💰 10,000.00 USDT                ║
║───────────────────────────────────║
║  📊 Market                         ║
║     └─ Overview                   ║
║     └─ Comparison                 ║
║                                   ║
║  💼 Trading                        ║
║     └─ Spot                       ║
║     └─ Orders                     ║
║                                   ║
║  📈 Portfolio                      ║
║     └─ Balance                    ║
║     └─ History                    ║
║                                   ║
║  ⚙️ Settings                       ║
║     └─ Profile                    ║
║     └─ Security                   ║
║                                   ║
║  🚪 Logout                         ║
╚═══════════════════════════════════╝
```

### 路由结构

```typescript
<Routes>
  {/* Public */}
  <Route path="/" element={<LandingPage />} />

  {/* Protected - Main Layout */}
  <Route path="/app" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
    <Route path="market/overview" element={<Dashboard />} />
    <Route path="market/comparison" element={<ComingSoonPlaceholder />} />

    <Route path="trading/spot" element={<ComingSoonPlaceholder />} />
    <Route path="trading/orders" element={<ComingSoonPlaceholder />} />

    <Route path="portfolio/balance" element={<ComingSoonPlaceholder />} />
    <Route path="portfolio/history" element={<ComingSoonPlaceholder />} />

    <Route path="settings/profile" element={<UserProfile />} />
    <Route path="settings/security" element={<ComingSoonPlaceholder />} />

    <Route index element={<Navigate to="/app/market/overview" />} />
  </Route>
</Routes>
```

### 组件架构

**现有组件**
- `LandingPage.tsx` - 产品首页，集成 Login/Register Modal
- `MainLayout.tsx` - 两栏布局框架
- `Dashboard.tsx` - Market Overview 页面
- `PriceBoard.tsx` - 价格看板（按币种分组展示）
- `PriceCard.tsx` - 单个交易所价格卡片
- `ConnectionStatus.tsx` - 连接状态指示器
- `PrivateRoute.tsx` - 路由守卫
- `ComingSoonPlaceholder.tsx` - 占位页面
- `UserProfile.tsx` - 用户信息页面

### 核心后端组件

**API Gateway**
统一入口，处理认证、限流、风控。

**WebSocket Gateway**
实时数据推送，连接状态管理。

**Service Layer**
业务逻辑层，包含市场数据、交易、风控服务。

**Exchange Adapter Layer**
交易所适配器抽象层，统一接口。

**Queue System**
异步任务处理，订单执行队列。

## 数据流设计

### 市场数据流

```
Binance/Bybit/OKX WebSocket
         ↓
Exchange Adapter (数据标准化)
         ↓
Market Service (处理 + 缓存)
         ↓
    Redis Cache ← REST API 查询
         ↓
Socket.io Gateway (广播)
         ↓
PriceBoard (按币种分组)
         ↓
自动识别最优价格 + 计算价差
         ↓
前端实时展示
```

**价格数据分组逻辑**
```typescript
// 按币种分组
const tickersBySymbol = useMemo(() => {
  const grouped: Record<string, TickerData[]> = {};

  Object.values(tickers).forEach((ticker) => {
    if (!grouped[ticker.symbol]) {
      grouped[ticker.symbol] = [];
    }
    grouped[ticker.symbol].push(ticker);
  });

  return grouped;
}, [tickers]);

// 每个币种渲染一个对比卡片
{symbols.map((symbol) => (
  <PriceComparison
    key={symbol}
    symbol={symbol}
    tickers={tickersBySymbol[symbol]}
  />
))}
```

### 订单执行流

```
前端提交订单
     ↓
API Gateway (认证 + 验证)
     ↓
Risk Guard (风控检查)
     ↓
Trading Service (智能路由)
     ↓
Bull Queue (异步任务)
     ↓
Exchange Adapter (模拟执行)
     ↓
WebSocket 通知前端
```

## 核心模块设计

### Market Data Service

**功能职责**
- 连接多个交易所 WebSocket
- 接收实时市场数据
- 数据标准化处理
- Redis 缓存最新价格
- 通过 Socket.io 广播给客户端

**模块结构**
```
backend/src/market/
├── interfaces/          # 数据接口定义
├── adapters/           # 交易所适配器
│   ├── base.adapter.ts
│   ├── binance.adapter.ts
│   ├── bybit.adapter.ts
│   └── okx.adapter.ts
├── market.service.ts   # 核心业务逻辑
├── market.gateway.ts   # Socket.io Gateway
├── market.controller.ts # REST API
└── market.module.ts    # 模块定义

frontend/src/components/
├── PriceBoard.tsx      # 价格看板（按币种分组）
├── PriceCard.tsx       # 单个交易所价格卡片
└── ConnectionStatus.tsx # 连接状态指示器
```

**关键接口**
```typescript
interface TickerData {
  exchange: string;      // 交易所名称
  symbol: string;        // 交易对
  price: number;         // 当前价格
  priceChangePercent: number;  // 24h 变化百分比
  volume: number;        // 24h 成交量
  timestamp: number;     // 时间戳
}
```

**数据流**
1. Adapter 连接交易所 WebSocket
2. 接收原始数据并标准化为 TickerData
3. Service 缓存到 Redis (TTL 10秒)
4. Gateway 广播给所有连接的客户端
5. 前端 PriceBoard 按币种分组展示
6. 自动标注最优价格和计算价差
7. 错误处理和自动重连

### Market Overview 展示优化

**按币种分组对比**
```
┌─────────────────────────────────────────────────────────────────┐
│  🟠 BTC/USDT                                                    │
│  ┌──────────────┬──────────────┬──────────────┐                │
│  │  BINANCE     │   BYBIT      │    OKX       │                │
│  │  $96,958.80  │  $96,955.20  │  $96,960.15  │                │
│  │  ↑ 5.91%     │  ↑ 5.89%     │  ↑ 5.92%     │                │
│  │  Vol: 18062  │  Vol: 18055  │  Vol: 18070  │                │
│  │  3s ago      │  🏆 Best     │  1s ago      │                │
│  └──────────────┴──────────────┴──────────────┘                │
│  💡 Price Spread: $4.95 (0.005%)                               │
└─────────────────────────────────────────────────────────────────┘
```

**核心优化点**
- **按币种分组**: 同一币种的所有交易所数据在一起，便于横向对比
- **最优价格标识**: 自动标注 🏆 Best 标签，绿色边框高亮
- **价差计算**: 自动计算最高价 - 最低价，显示绝对价差和百分比
- **视觉优化**: 币种颜色标签、涨跌颜色区分、紧凑布局
- **响应式设计**: 桌面端多列、移动端垂直堆叠

### Trading Service

**功能职责**
- 接收订单提交请求
- 执行智能订单路由 (SOR)
- 推入异步执行队列
- 跟踪订单状态

**智能路由设计**
```typescript
// 买入时选择最低卖价交易所
selectBestExchange(symbol, 'BUY'):
  prices = getLatestPrices(symbol)
  return prices.minBy(p => p.askPrice).exchange

// 卖出时选择最高买价交易所
selectBestExchange(symbol, 'SELL'):
  prices = getLatestPrices(symbol)
  return prices.maxBy(p => p.bidPrice).exchange
```

**异步处理流程**
1. 创建订单记录 (status: PENDING)
2. 推入 Bull Queue
3. Worker 异步执行
4. 更新订单状态 (FILLED/FAILED)
5. WebSocket 通知前端

### Risk Control Service

**功能职责**
- 订单提交前风控检查
- 实时监控市场波动
- 触发熔断机制

**风控规则**

**余额检查**
验证用户 USDT 余额是否足够。

**单日交易次数限制**
使用 Redis 记录每日订单数，超过 100 笔拒绝。

**单笔订单金额上限**
防止异常大额订单。

**市场熔断机制**
监控价格波动，超过 5% 时暂停交易 5 分钟。

**实现方式**
```typescript
// NestJS Guard
@UseGuards(RiskGuard)
@Post('/orders')
async createOrder() { }
```

### Monitoring Service

**功能职责**
- 采集系统运行指标
- Prometheus 格式暴露
- Grafana 可视化

**指标体系**

**API 性能指标**
- 请求响应时间 (P50/P95/P99)
- 请求成功率
- 并发请求数

**WebSocket 指标**
- 活跃连接数
- 消息推送频率
- 连接错误率

**业务指标**
- 订单提交数
- 订单成功率
- 各交易所分布

**系统资源**
- CPU 使用率
- 内存使用率
- Redis 连接数

## 渐进式开发路线

### 阶段划分原则

每个阶段都是完整可演示的系统，后续阶段在前一阶段基础上增强。

### 版本功能矩阵

| 阶段 | 开发时间 | 核心功能 | 技术亮点 |
|------|---------|---------|---------|
| V0.1 | 3天 | 用户认证 | JWT 认证、bcrypt 加密 |
| V0.2 | +2天 | 实时数据看板 | WebSocket 推送、Redis 缓存 |
| V0.3 | +2天 | 多交易所聚合 + UI 升级 | 适配器模式、Landing Page、按币种分组展示 |
| V0.4 | +3天 | 交易执行 | Bull Queue 异步处理 |
| V0.5 | +2天 | 智能路由 | 最优价格算法 |
| V0.6 | +2天 | 风险控制 | Guard 模式、熔断机制 |
| V0.7 | +2天 | 监控体系 | Prometheus 集成 |

### 功能演进路径

**基础能力**
- 用户注册登录系统
- JWT Token 认证和授权
- 密码加密和验证
- 基础安全防护

**实时数据能力**
- Binance WebSocket 集成
- 实时价格推送到前端
- Redis 缓存优化性能
- 价格变化视觉反馈
- 连接状态管理

**多交易所聚合能力 + UI 优化**
- Bybit WebSocket 集成
- OKX WebSocket 集成
- 统一数据格式
- 适配器模式设计
- 多连接并发管理
- Landing Page 产品首页
- 两栏布局（侧边栏 + 主内容区）
- 按币种分组对比展示
- 自动识别最优价格
- 价差计算和展示

**交易执行能力**
- 模拟订单执行
- 订单状态跟踪
- 订单历史查询
- Bull Queue 异步处理
- 失败重试机制

**智能路由能力**
- 实时价格比较
- 最优交易所选择
- 滑点计算
- 节省成本展示

**风险控制能力**
- 余额验证
- 交易限额检查
- 熔断机制
- 异常监控告警

**监控能力**
- Prometheus 指标采集
- Grafana 仪表板
- 性能监控
- 业务指标分析

## 设计决策

### 为什么选择 NestJS

企业级 Node.js 框架，提供完整的架构模式：
- 依赖注入容器
- 模块化设计
- Guard/Interceptor/Pipe 机制
- 内置 WebSocket 支持
- 良好的 TypeScript 支持

### 为什么选择 Bull Queue

基于 Redis 的可靠消息队列：
- 持久化任务存储
- 自动重试机制
- 任务优先级
- 延迟执行
- 监控和管理界面

### 为什么模拟执行

项目专注于系统架构设计：
- 无需真实交易的复杂性
- 避免资金风险
- 快速验证架构
- 展示完整数据流

真实交易只需替换 Adapter 实现。

### 为什么选择 Socket.io

抽象 WebSocket 底层复杂性：
- 自动重连机制
- 心跳检测
- 房间和命名空间
- 事件驱动模型
- 浏览器兼容性好

### 为什么选择适配器模式

交易所接入统一接口设计：
- 新增交易所无需修改业务逻辑
- 统一数据格式转换
- 易于测试和维护
- 支持动态配置

```typescript
abstract class ExchangeAdapter {
  abstract connect(symbol: string): void;
  abstract disconnect(): void;
  protected abstract normalizeData(raw: any): TickerData;
}
```

### 为什么选择 TypeORM

功能全面的 ORM 框架：
- Active Record 模式简化 CRUD
- 支持多种数据库
- 迁移管理
- 查询构建器
- 事务支持

## 扩展规划

### 可扩展性设计

**WebSocket 分布式扩展**
使用 Redis Adapter 实现多实例消息广播。

**数据库读写分离**
主库写入，从库读取，提升查询性能。

**队列系统升级**
大规模场景下可替换为 Kafka。

**微服务拆分**
按业务模块拆分为独立服务。

**CDN 加速**
静态资源和前端应用使用 CDN 分发。

### 性能优化方向

**缓存优化**
- 多级缓存策略 (Redis + 内存)
- 缓存预热
- 过期策略优化

**数据库优化**
- 索引优化
- 查询优化
- 连接池配置

**WebSocket 优化**
- 连接池管理
- 消息批量推送
- 压缩传输

**负载均衡**
- Nginx 反向代理
- 会话保持
- 健康检查

### 安全增强

**认证增强**
- 双因素认证 (2FA)
- OAuth 第三方登录
- 刷新 Token 机制

**API 安全**
- 请求签名验证
- IP 白名单
- DDoS 防护

**数据安全**
- 敏感数据加密存储
- 传输层 TLS 加密
- 审计日志
