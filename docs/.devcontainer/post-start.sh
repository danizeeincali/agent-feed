#!/bin/bash
# DevContainer Post-Start Script
# Runs after container starts

set -e

echo "Running post-start setup..."

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
while ! pg_isready -h localhost -p 5432 -U postgres > /dev/null 2>&1; do
    sleep 1
done

# Wait for application to be ready
echo "Waiting for application..."
while ! curl -s http://localhost:3000/health > /dev/null 2>&1; do
    sleep 1
done

# Initialize Claude Flow if available
if command -v npx > /dev/null 2>&1; then
    echo "Initializing Claude Flow swarm..."
    npx claude-flow@alpha swarm init mesh --max-agents 17 || echo "Swarm initialization skipped"
fi

echo "DevContainer is ready for development!"
echo "Access the application at http://localhost:3000"