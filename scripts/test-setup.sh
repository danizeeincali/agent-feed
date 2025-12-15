#!/bin/bash

# CI Environment Setup Script for Claude AI Response System Testing
set -e

echo "🚀 Setting up CI test environment..."

# Create necessary directories
mkdir -p test-results
mkdir -p coverage
mkdir -p performance-results
mkdir -p logs

# Set environment variables
export NODE_ENV=test
export CI=true
export FORCE_COLOR=1

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local timeout=${2:-30}
    local count=0
    
    echo "⏳ Waiting for service at $url..."
    
    while [ $count -lt $timeout ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo "✅ Service at $url is ready!"
            return 0
        fi
        
        count=$((count + 1))
        sleep 1
    done
    
    echo "❌ Timeout waiting for service at $url"
    return 1
}

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -i:$port > /dev/null 2>&1; then
        echo "⚠️  Port $port is in use, attempting to free it..."
        lsof -ti:$port | xargs -r kill -9
        sleep 2
    fi
}

# Clean up any existing processes
echo "🧹 Cleaning up existing processes..."
check_port 3000
check_port 5173
check_port 8080

# Kill any existing node processes that might interfere
pkill -f "simple-backend.js" || true
pkill -f "npm run dev" || true
pkill -f "vite" || true

# Wait a moment for cleanup
sleep 2

# Setup mock Claude CLI
echo "🎭 Setting up mock Claude CLI..."
chmod +x ./scripts/mock-claude-cli.js

# Create test configuration files if they don't exist
if [ ! -f "jest.ci.config.js" ]; then
    echo "📝 Creating CI Jest configuration..."
    cat > jest.ci.config.js << 'EOF'
const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,
  testTimeout: 30000,
  maxWorkers: '50%',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testResultsProcessor: 'jest-junit',
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'junit.xml'
    }]
  ]
};
EOF
fi

# Setup environment variables for testing
echo "🔧 Setting up test environment variables..."
export TEST_BACKEND_URL="http://localhost:3000"
export TEST_FRONTEND_URL="http://localhost:5173"
export MOCK_CLAUDE_CLI=true
export LOG_LEVEL=error

# Create test database/storage if needed
echo "📁 Setting up test storage..."
mkdir -p test-data
mkdir -p test-data/memory
mkdir -p test-data/logs

# Setup test SSL certificates if needed (for HTTPS testing)
if [ ! -f "test-certs/cert.pem" ]; then
    echo "🔐 Creating test SSL certificates..."
    mkdir -p test-certs
    openssl req -x509 -newkey rsa:4096 -keyout test-certs/key.pem -out test-certs/cert.pem -days 1 -nodes -subj "/CN=localhost" 2>/dev/null || true
fi

# Verify all dependencies are installed
echo "📦 Verifying dependencies..."

# Root dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing root dependencies..."
    npm ci
fi

# Frontend dependencies
if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend && npm ci && cd ..
fi

# Test dependencies
if [ ! -d "tests/node_modules" ]; then
    echo "Installing test dependencies..."
    cd tests && npm ci && cd ..
fi

# Install additional CI tools if needed
npm install -g serve || true

# Setup browser for E2E testing
echo "🌐 Setting up browser for E2E testing..."
if command -v google-chrome &> /dev/null; then
    echo "Chrome already installed"
else
    echo "Installing Chrome for testing..."
    # This would typically be handled by the CI environment
    # but we include it for completeness
fi

# Create health check endpoint test
echo "🏥 Creating health check script..."
cat > scripts/health-check.js << 'EOF'
const http = require('http');

function healthCheck(url, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Health check timeout for ${url}`));
        }, timeout);

        const req = http.get(url, (res) => {
            clearTimeout(timer);
            if (res.statusCode === 200 || res.statusCode === 204) {
                resolve(true);
            } else {
                reject(new Error(`Health check failed with status ${res.statusCode}`));
            }
        });

        req.on('error', (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

module.exports = { healthCheck };
EOF

# Setup logging for CI
echo "📝 Setting up CI logging..."
export DEBUG=claude-ai:*
export LOG_FILE="logs/ci-test.log"

# Create startup verification script
echo "✅ Creating startup verification..."
cat > scripts/verify-services.js << 'EOF'
const { healthCheck } = require('./health-check');

async function verifyServices() {
    const services = [
        { name: 'Backend', url: 'http://localhost:3000/health' },
        { name: 'Frontend', url: 'http://localhost:5173' }
    ];

    for (const service of services) {
        try {
            await healthCheck(service.url);
            console.log(`✅ ${service.name} is healthy`);
        } catch (error) {
            console.error(`❌ ${service.name} health check failed:`, error.message);
            process.exit(1);
        }
    }
    
    console.log('🎉 All services are healthy!');
}

if (require.main === module) {
    verifyServices();
}

module.exports = { verifyServices };
EOF

chmod +x scripts/verify-services.js

echo "✨ CI test environment setup complete!"
echo ""
echo "🔍 Environment Summary:"
echo "  - Node.js version: $(node --version)"
echo "  - NPM version: $(npm --version)"
echo "  - Test timeout: 30s"
echo "  - Coverage threshold: 80%"
echo "  - Mock Claude CLI: enabled"
echo "  - Test results: test-results/"
echo "  - Coverage reports: coverage/"
echo "  - Performance results: performance-results/"
echo ""
echo "🚀 Ready to run tests!"