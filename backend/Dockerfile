FROM node:20-alpine AS build
WORKDIR /app
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
# 仅复制后端依赖清单，减少缓存失效
COPY backend/package.json ./
RUN pnpm install
COPY backend ./
RUN pnpm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV=production
RUN corepack enable
# 仅安装生产依赖
COPY backend/package.json ./
RUN pnpm install --prod
# 拷贝构建产物与必要的运行文件
COPY --from=build /app/dist ./dist
COPY backend/nest-cli.json ./nest-cli.json
COPY backend/tsconfig.* ./
CMD ["node", "dist/main.js"]
