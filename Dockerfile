FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile

FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN pnpm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN useradd -m -u 1001 bbm && chown -R bbm:bbm /app
COPY --from=build --chown=bbm:bbm /app/dist ./dist
COPY --from=build --chown=bbm:bbm /app/package.json ./
COPY --from=deps --chown=bbm:bbm /app/node_modules ./node_modules
COPY --from=build --chown=bbm:bbm /app/drizzle ./drizzle
USER bbm
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
