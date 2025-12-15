# Multi-stage Dockerfile for Claude Code + AgentLink Development Environment
# Optimized for <2GB memory usage with hot reload capabilities

# Stage 1: Base Node.js with PostgreSQL
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    postgresql \
    postgresql-client \
    postgresql-contrib \
    bash \
    curl \
    git \
    openssl \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Create postgres user and directories
RUN adduser -D -s /bin/sh postgres && \
    mkdir -p /var/lib/postgresql/data && \
    chown -R postgres:postgres /var/lib/postgresql && \
    chmod 700 /var/lib/postgresql/data

# Initialize PostgreSQL
USER postgres
RUN initdb -D /var/lib/postgresql/data
USER root

# Stage 2: Development Dependencies
FROM base AS dev-deps

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies with cache optimization
RUN npm ci --only=production && \
    cd frontend && npm ci --only=production && \
    npm cache clean --force

# Stage 3: Production Build
FROM base AS prod-build

WORKDIR /app

# Copy source code
COPY . .
COPY --from=dev-deps /app/node_modules ./node_modules
COPY --from=dev-deps /app/frontend/node_modules ./frontend/node_modules

# Build application
RUN npm run build && \
    cd frontend && npm run build && \
    rm -rf node_modules && \
    rm -rf frontend/node_modules

# Stage 4: Runtime Environment
FROM base AS runtime

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV CLAUDE_CODE_PORT=8080
ENV POSTGRES_PORT=5432
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=postgres
ENV POSTGRES_DB=agentfeed
ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agentfeed

# Create app user
RUN adduser -D -s /bin/sh appuser

# Create necessary directories
RUN mkdir -p /app /var/log/postgresql /run/postgresql && \
    chown -R appuser:appuser /app && \
    chown -R postgres:postgres /var/log/postgresql /run/postgresql

WORKDIR /app

# Copy built application
COPY --from=prod-build --chown=appuser:appuser /app/dist ./dist
COPY --from=prod-build --chown=appuser:appuser /app/frontend/dist ./frontend/dist
COPY --from=prod-build --chown=appuser:appuser /app/package*.json ./
COPY --from=dev-deps --chown=appuser:appuser /app/node_modules ./node_modules

# Copy database schema and migrations
COPY --chown=appuser:appuser src/database/schema.sql ./database/
COPY --chown=appuser:appuser src/database/migrations ./database/migrations/

# Copy startup script
COPY --chown=appuser:appuser docs/start-system.sh ./start-system.sh
RUN chmod +x ./start-system.sh

# Install Claude Code (latest version)
RUN npm install -g @anthropic/claude@latest

# Create PostgreSQL configuration
RUN echo "listen_addresses = 'localhost'" >> /var/lib/postgresql/data/postgresql.conf && \
    echo "port = 5432" >> /var/lib/postgresql/data/postgresql.conf && \
    echo "max_connections = 50" >> /var/lib/postgresql/data/postgresql.conf && \
    echo "shared_buffers = 64MB" >> /var/lib/postgresql/data/postgresql.conf && \
    echo "effective_cache_size = 256MB" >> /var/lib/postgresql/data/postgresql.conf

# Health check script
COPY <<EOF /app/healthcheck.sh
#!/bin/bash
set -e

# Check PostgreSQL
pg_isready -h localhost -p 5432 -U postgres || exit 1

# Check Node.js app
curl -f http://localhost:3000/health || exit 1

# Check Claude Code availability
claude --version || exit 1

echo "All services healthy"
EOF

RUN chmod +x /app/healthcheck.sh

# Expose only port 3000 (external access)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD /app/healthcheck.sh

# Set user for security
USER appuser

# Start system with orchestration script
CMD ["./start-system.sh"]