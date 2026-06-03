# ── Stage 1: Install production dependencies ──────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# ── Stage 2: Final runtime image ──────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Install curl (needed for health checks) and create non-root user
RUN apk add --no-cache curl && \
    addgroup -S clothco && adduser -S clothco -G clothco

# Copy only what the server needs
COPY --from=deps /app/node_modules ./node_modules
COPY backend/  ./backend/
COPY frontend/ ./frontend/
COPY package.json ./

# Environment (real values injected at runtime via ECS task definition)
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

USER clothco

CMD ["node", "backend/server.js"]
