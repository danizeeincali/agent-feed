#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Setting up Dual Claude Code Instance Architecture${NC}"
echo "=================================================="

# Configuration
PROJECT_ROOT="/workspaces/agent-feed"
DEV_CLAUDE_FILE="$PROJECT_ROOT/.claude-dev"
PROD_CLAUDE_FILE="$PROJECT_ROOT/.claude-prod"
BUSINESS_DIR="$PROJECT_ROOT/business"
CONFIG_DIR="$PROJECT_ROOT/config"

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if running in correct directory
if [ "$PWD" != "$PROJECT_ROOT" ]; then
    cd "$PROJECT_ROOT" || {
        print_error "Failed to change to project directory"
        exit 1
    }
fi

print_status "Changed to project directory: $PROJECT_ROOT"

# Create business directory structure
echo -e "\n${BLUE}📁 Setting up directory structure...${NC}"
mkdir -p "$BUSINESS_DIR"/{data,reports,templates,workflows,agents}
mkdir -p "$PROJECT_ROOT"/{logs,backups,monitoring}

print_status "Created business directory structure"

# Initialize development Claude instance
echo -e "\n${BLUE}🔧 Setting up Development Claude Instance...${NC}"
if [ ! -f "$DEV_CLAUDE_FILE" ]; then
    print_warning "Development Claude authentication not found"
    echo "You'll need to run: claude auth login --config-file .claude-dev"
    touch "$DEV_CLAUDE_FILE"
    echo '{"auth": "pending", "instance": "development"}' > "$DEV_CLAUDE_FILE"
    print_status "Created development Claude configuration file"
else
    print_status "Development Claude configuration exists"
fi

# Initialize production Claude instance  
echo -e "\n${BLUE}🔧 Setting up Production Claude Instance...${NC}"
if [ ! -f "$PROD_CLAUDE_FILE" ]; then
    print_warning "Production Claude authentication not found"
    echo "You'll need to run: claude auth login --config-file .claude-prod"
    touch "$PROD_CLAUDE_FILE"
    echo '{"auth": "pending", "instance": "production"}' > "$PROD_CLAUDE_FILE"
    print_status "Created production Claude configuration file"
else
    print_status "Production Claude configuration exists"
fi

# Install Claude Code CLI if not present
echo -e "\n${BLUE}📦 Checking Claude Code CLI installation...${NC}"
if ! command -v claude &> /dev/null; then
    print_warning "Claude CLI not found, installing..."
    # Install Claude CLI based on environment
    if command -v npm &> /dev/null; then
        npm install -g @anthropic-ai/claude-cli
        print_status "Installed Claude CLI via npm"
    else
        print_error "npm not found. Please install Claude CLI manually"
        exit 1
    fi
else
    print_status "Claude CLI is installed"
fi

# Copy agent configurations from /agents/ to business directory
echo -e "\n${BLUE}📋 Setting up agent configurations...${NC}"
if [ -d "$PROJECT_ROOT/agents" ]; then
    cp -r "$PROJECT_ROOT/agents/"* "$BUSINESS_DIR/agents/"
    print_status "Copied agent configurations to business directory"
else
    print_warning "No agent configurations found in /agents/ directory"
fi

# Create database schema for dual instances
echo -e "\n${BLUE}🗄️ Setting up database schema...${NC}"
cat > "$PROJECT_ROOT/database/dual-instance-schema.sql" << 'EOF'
-- Dual Claude Code Instance Database Schema

-- Development instance schema
CREATE SCHEMA IF NOT EXISTS development;

-- Production instance schema  
CREATE SCHEMA IF NOT EXISTS production;

-- Shared cross-instance tables
CREATE TABLE IF NOT EXISTS public.instance_coordination (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_instance VARCHAR(20) NOT NULL,
    target_instance VARCHAR(20) NOT NULL,
    handoff_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Development agent activities
CREATE TABLE IF NOT EXISTS development.agent_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name VARCHAR(100) NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Production agent activities
CREATE TABLE IF NOT EXISTS production.agent_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name VARCHAR(100) NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent configurations
CREATE TABLE IF NOT EXISTS public.agent_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_type VARCHAR(20) NOT NULL,
    agent_name VARCHAR(100) NOT NULL,
    configuration JSONB NOT NULL,
    version INTEGER DEFAULT 1,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_instance_coordination_status ON public.instance_coordination(status);
CREATE INDEX IF NOT EXISTS idx_dev_activities_agent ON development.agent_activities(agent_name);
CREATE INDEX IF NOT EXISTS idx_prod_activities_agent ON production.agent_activities(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_configs_instance ON public.agent_configurations(instance_type, active);
EOF

print_status "Created dual-instance database schema"

# Create environment files
echo -e "\n${BLUE}⚙️ Creating environment configurations...${NC}"

# Development environment
cat > "$PROJECT_ROOT/.env.dev" << EOF
# Development Claude Code Instance
CLAUDE_CONFIG_FILE=.claude-dev
CLAUDE_INSTANCE=development
CLAUDE_PORT_RANGE=8080-8089
CLAUDE_MAX_AGENTS=10
CLAUDE_WORKSPACE=/workspaces/agent-feed
CLAUDE_API_BASE=http://localhost:3000/api/dev
CLAUDE_WEBSOCKET_URL=ws://localhost:3000/dev
DATABASE_SCHEMA=development
AGENTLINK_NAMESPACE=dev
EOF

# Production environment
cat > "$PROJECT_ROOT/.env.prod" << EOF
# Production Claude Code Instance
CLAUDE_CONFIG_FILE=.claude-prod
CLAUDE_INSTANCE=production
CLAUDE_PORT_RANGE=8090-8119
CLAUDE_MAX_AGENTS=30
CLAUDE_WORKSPACE=/workspaces/agent-feed/business
CLAUDE_API_BASE=http://localhost:3000/api/prod
CLAUDE_WEBSOCKET_URL=ws://localhost:3000/prod
DATABASE_SCHEMA=production
AGENTLINK_NAMESPACE=prod
EOF

print_status "Created environment configuration files"

# Create systemd service files (optional)
echo -e "\n${BLUE}🔄 Creating service configurations...${NC}"
mkdir -p "$PROJECT_ROOT/config/services"

cat > "$PROJECT_ROOT/config/services/claude-dev.service" << EOF
[Unit]
Description=Claude Code Development Instance
After=network.target

[Service]
Type=simple
User=\$USER
WorkingDirectory=$PROJECT_ROOT
Environment=NODE_ENV=development
EnvironmentFile=$PROJECT_ROOT/.env.dev
ExecStart=/usr/local/bin/claude code --config-file .claude-dev --port 8080
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

cat > "$PROJECT_ROOT/config/services/claude-prod.service" << EOF
[Unit]
Description=Claude Code Production Instance
After=network.target

[Service]
Type=simple
User=\$USER
WorkingDirectory=$PROJECT_ROOT
Environment=NODE_ENV=production
EnvironmentFile=$PROJECT_ROOT/.env.prod
ExecStart=/usr/local/bin/claude code --config-file .claude-prod --port 8090
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

print_status "Created service configuration files"

# Create monitoring configuration
echo -e "\n${BLUE}📊 Setting up monitoring...${NC}"
cat > "$PROJECT_ROOT/config/monitoring.json" << EOF
{
  "instances": {
    "development": {
      "port": 8080,
      "health_endpoint": "http://localhost:8080/health",
      "agent_count_target": 10,
      "workspace": "/workspaces/agent-feed"
    },
    "production": {
      "port": 8090,
      "health_endpoint": "http://localhost:8090/health", 
      "agent_count_target": 29,
      "workspace": "/workspaces/agent-feed/business"
    }
  },
  "alerts": {
    "instance_down": true,
    "agent_failure": true,
    "memory_threshold": 1.5,
    "response_time_threshold": 5000
  },
  "logging": {
    "level": "info",
    "file": "$PROJECT_ROOT/logs/claude-instances.log",
    "rotation": "daily"
  }
}
EOF

print_status "Created monitoring configuration"

# Create launch script
echo -e "\n${BLUE}🚀 Creating launch scripts...${NC}"
cat > "$PROJECT_ROOT/scripts/launch-dual-claude.sh" << 'EOF'
#!/bin/bash

# Launch both Claude Code instances
PROJECT_ROOT="/workspaces/agent-feed"
cd "$PROJECT_ROOT"

echo "🚀 Launching Dual Claude Code Instances..."

# Start development instance
echo "Starting development instance on port 8080..."
source .env.dev
claude code --config-file .claude-dev --port 8080 &
DEV_PID=$!
echo "Development instance PID: $DEV_PID"

# Start production instance  
echo "Starting production instance on port 8090..."
source .env.prod
claude code --config-file .claude-prod --port 8090 &
PROD_PID=$!
echo "Production instance PID: $PROD_PID"

# Save PIDs for management
echo "$DEV_PID" > "$PROJECT_ROOT/logs/claude-dev.pid"
echo "$PROD_PID" > "$PROJECT_ROOT/logs/claude-prod.pid"

echo "✅ Both instances launched successfully"
echo "Development: http://localhost:8080"
echo "Production: http://localhost:8090"
echo "AgentLink: http://localhost:3001"
EOF

chmod +x "$PROJECT_ROOT/scripts/launch-dual-claude.sh"
print_status "Created launch script"

# Final setup validation
echo -e "\n${BLUE}✅ Validating setup...${NC}"

# Check configuration files
if [ -f "$CONFIG_DIR/claude-dev-config.json" ] && [ -f "$CONFIG_DIR/claude-prod-config.json" ]; then
    print_status "Agent configuration files exist"
else
    print_error "Missing agent configuration files"
fi

# Check directory structure
if [ -d "$BUSINESS_DIR" ]; then
    print_status "Business directory structure created"
else
    print_error "Business directory not created"
fi

# Summary
echo -e "\n${GREEN}🎉 Dual Claude Code Instance Setup Complete!${NC}"
echo "=================================================="
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Authenticate development instance: claude auth login --config-file .claude-dev"
echo "2. Authenticate production instance: claude auth login --config-file .claude-prod"
echo "3. Launch both instances: ./scripts/launch-dual-claude.sh"
echo "4. Start AgentLink frontend: make dev"
echo "5. Access unified dashboard: http://localhost:3001"
echo ""
echo -e "${BLUE}Instance Details:${NC}"
echo "• Development Instance: Port 8080 (10 coding agents)"
echo "• Production Instance: Port 8090 (29 business agents)"
echo "• AgentLink Frontend: Port 3001 (unified dashboard)"
echo "• Backend API: Port 3000 (routing to both instances)"
echo ""
echo -e "${YELLOW}⚠ Important:${NC} Both instances need separate Claude account authentication"
echo "Use the same Claude account but different config files for security separation"
EOF

chmod +x /workspaces/agent-feed/scripts/setup-dual-claude.sh