# Fusio - 多交易所聚合交易平台

> 实时加密货币交易聚合平台

Fusio 是一个实时多交易所加密货币交易聚合平台，提供统一的市场数据看板和交易执行服务。

## 文档

- [USER_STORIES.md](./USER_STORIES.md): 用户故事和验收标准
- [DESIGN.md](./DESIGN.md): 完整技术架构和分阶段开发路线图
- [DEVELOPMENT.md](./docs/DEVELOPMENT.md): 开发者技术文档

## 功能特性

### 用户认证系统

- 邮箱注册登录
- 密码强度验证（至少8位，包含大小写字母和数字）
- JWT Token 认证，7天登录保持
- 自动初始化模拟余额（10,000 USDT）

### 实时市场数据

- 实时价格展示（BTC/USDT, ETH/USDT）
- 价格变化视觉反馈（绿色上涨/红色下跌）
- 24小时变化百分比和成交量
- WebSocket 实时推送
- 连接状态指示器

## 快速开始

### 环境要求

- Node.js 20+
- pnpm 8+

### 安装依赖

```bash
# 后端依赖
cd backend
pnpm install

# 前端依赖
cd ../frontend
pnpm install
```

### 启动服务

**启动后端**:
```bash
cd backend
pnpm run start:dev
```

后端运行在 `http://localhost:4000/api`

**启动前端**:
```bash
cd frontend
pnpm run dev
```

前端运行在 `http://localhost:5173`

### 使用指南

1. 访问 `http://localhost:5173`
2. 点击「立即注册」创建账户
3. 填写邮箱、密码（至少8位，包含大小写字母和数字）
4. 注册成功后自动登录并跳转到 Dashboard
5. 查看实时市场价格和个人信息

## 技术栈

### 后端
NestJS, TypeScript, TypeORM, SQLite/PostgreSQL, Redis, Socket.io, JWT, bcrypt

### 前端
Vite, React 18, TypeScript, Ant Design, Zustand, TanStack Query, Socket.io-client

## 开发路线图

### V0.1 - 用户认证系统
用户注册登录、JWT 认证、基础安全特性

### V0.2 - 实时市场数据看板
Binance WebSocket 集成、实时价格展示、Redis 缓存

### V0.3 - 多交易所聚合
Bybit、OKX 集成、统一数据格式

### V0.4 - 交易执行系统

模拟订单执行、订单历史查询

### V0.5 - 智能订单路由
最优价格选择、订单路由决策

### V0.6 - 风险控制系统
余额检查、订单限额、熔断机制

### V0.7 - 监控与可观测性
Prometheus 指标收集、Grafana 仪表板

详见 [DESIGN.md](./DESIGN.md) 获取完整路线图。

## 许可证

本项目仅用于技术展示。
