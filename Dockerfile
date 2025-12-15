# Multi-stage Dockerfile for AgentLink + Claude Code VPS

# Base stage with Node.js and system dependencies
FROM node:18-alpine AS base
RUN apk add --no-cache \
    curl \
    bash \
    ca-certificates \
    postgresql-client \
    redis
WORKDIR /app

# Dependencies stage
FROM base AS dependencies
COPY package*.json ./
RUN npm ci --only=production && \
    cp -R node_modules prod_node_modules && \
    npm ci

# Build frontend stage
FROM base AS build-frontend
COPY package*.json ./
RUN npm ci
COPY frontend/ ./frontend/
WORKDIR /app/frontend
RUN npm ci && npm run build

# Build backend stage  
FROM base AS build-backend
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci
COPY src/ ./src/
COPY agents/ ./agents/
RUN npx tsc

# Production stage
FROM base AS production
ENV NODE_ENV=production
ENV PORT=3002

# Copy built applications
COPY --from=dependencies /app/prod_node_modules ./node_modules
COPY --from=build-backend /app/dist ./dist
COPY --from=build-frontend /app/frontend/dist ./frontend/dist
COPY --from=build-backend /app/agents ./agents
COPY package*.json ./

# Copy essential directories
COPY src/database/schema.sql ./src/database/schema.sql
COPY src/database/migrations/ ./src/database/migrations/

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S agentlink -u 1001 -G nodejs

# Create necessary directories
RUN mkdir -p logs memory/agents memory/sessions && \
    chown -R agentlink:nodejs logs memory

# Switch to non-root user
USER agentlink

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3002/health || exit 1

# Start the application
CMD ["node", "dist/api/server.js"]