# Multi-stage Dockerfile for Claude Code Workflow System
ARG NODE_VERSION=18.20.4
ARG POSTGRES_VERSION=16

# Base stage with Node.js
FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    git \
    curl \
    bash \
    python3 \
    make \
    g++ \
    postgresql-client \
    && rm -rf /var/cache/apk/*

# Install Claude CLI globally
RUN npm install -g @anthropic-ai/claude-cli@latest

# Development dependencies stage
FROM base AS dev-deps
COPY package*.json ./
COPY frontend/package*.json ./frontend/
RUN npm ci --include=dev
RUN cd frontend && npm ci --include=dev

# Production dependencies stage
FROM base AS prod-deps
COPY package*.json ./
COPY frontend/package*.json ./frontend/
RUN npm ci --omit=dev
RUN cd frontend && npm ci --omit=dev

# Build stage
FROM dev-deps AS build
COPY . .
RUN npm run build
RUN cd frontend && npm run build

# PostgreSQL stage
FROM postgres:${POSTGRES_VERSION}-alpine AS postgres
ENV POSTGRES_DB=agent_feed
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=postgres
COPY infrastructure/config/init.sql /docker-entrypoint-initdb.d/
COPY src/database/schema.sql /docker-entrypoint-initdb.d/
COPY src/database/migrations/*.sql /docker-entrypoint-initdb.d/migrations/

# Development stage
FROM base AS development
COPY --from=dev-deps /app/node_modules ./node_modules
COPY --from=dev-deps /app/frontend/node_modules ./frontend/node_modules
COPY . .

# Install Claude Flow MCP
RUN npm install -g claude-flow@alpha

# Health check script
COPY infrastructure/scripts/health-check.sh /usr/local/bin/health-check.sh
RUN chmod +x /usr/local/bin/health-check.sh

# Startup script
COPY infrastructure/scripts/start-dev.sh /usr/local/bin/start-dev.sh
RUN chmod +x /usr/local/bin/start-dev.sh

EXPOSE 3000 8080
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD /usr/local/bin/health-check.sh

CMD ["/usr/local/bin/start-dev.sh"]

# Production stage
FROM base AS production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/frontend/node_modules ./frontend/node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/frontend/dist ./frontend/dist
COPY package*.json ./
COPY src ./src
COPY infrastructure/scripts/start-prod.sh /usr/local/bin/start-prod.sh
RUN chmod +x /usr/local/bin/start-prod.sh

# Install Claude Flow MCP
RUN npm install -g claude-flow@alpha

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["/usr/local/bin/start-prod.sh"]