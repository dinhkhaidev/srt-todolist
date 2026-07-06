FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@9

RUN apk add --no-cache python3 make g++

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY tsconfig.json ./

RUN pnpm --filter @todolist/shared run build
RUN pnpm --filter @todolist/api run build

# Dọn dẹp thư mục node_modules, chỉ giữ lại thư viện production
RUN pnpm prune --prod

FROM node:20-alpine

WORKDIR /app

# Copy toàn bộ thư mục /app đã được prune từ builder sang để bảo toàn cấu trúc symlink của pnpm
COPY --from=builder /app /app

WORKDIR /app/apps/api

EXPOSE 3000

CMD ["node", "dist/main"]
