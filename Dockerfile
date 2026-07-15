# syntax=docker/dockerfile:1
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# 国内服务器构建时在 .env 设 NPM_REGISTRY=https://registry.npmmirror.com 加速
ARG NPM_REGISTRY=https://registry.npmjs.org
RUN npm config set registry "$NPM_REGISTRY" && npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* 在 next build 时固化进产物（运行期改无效），所以必须走构建参数传入
ARG NEXT_PUBLIC_ICP_NUMBER=
ENV NEXT_PUBLIC_ICP_NUMBER=$NEXT_PUBLIC_ICP_NUMBER
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV UPLOAD_DIR=/app/uploads

RUN addgroup -S app && adduser -S app -G app \
    && mkdir -p /app/uploads && chown app:app /app/uploads

COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public

USER app
EXPOSE 3000
VOLUME ["/app/uploads"]
CMD ["node", "server.js"]
