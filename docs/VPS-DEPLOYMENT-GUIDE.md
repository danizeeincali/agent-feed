# VPS Deployment Guide - Claude Code Agent System

## Overview

This guide provides complete instructions for deploying the Claude Code Agent System to a VPS. Each VPS instance serves **ONE USER** with their own Claude Pro/Max account.

## Architecture: Full Containerization

```yaml
# docker-compose.yml for single-user VPS deployment
version: '3.8'

services:
  # Claude Code Container - NEW!
  claude-code:
    image: claude-code-vps:latest
    container_name: claude-code
    ports:
      - "7681:7681"  # Web terminal (ttyd)
      - "8090:8090"  # Claude Code API
    volumes:
      - ./claude-agents:/home/claude/.claude/agents
      - ./workspace:/workspace
      - ./memories:/home/claude/memories
      - ./documents:/home/claude/Documents
    environment:
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}  # Set after OAuth
      - CLAUDE_MODEL=claude-3-opus-20240229
      - USER_EMAIL=${USER_EMAIL}
      - USER_PLAN=${USER_PLAN}  # pro or max
    depends_on:
      - postgres
      - redis
    restart: always

  # AgentLink Frontend
  agentlink-frontend:
    image: agentlink-frontend:latest
    container_name: agentlink-frontend
    ports:
      - "80:3000"
      - "443:3000"
    environment:
      - API_URL=http://agentlink-api:4000
      - CLAUDE_CODE_URL=http://claude-code:8090
    depends_on:
      - agentlink-api
    restart: always

  # AgentLink API
  agentlink-api:
    image: agentlink-api:latest
    container_name: agentlink-api
    ports:
      - "4000:4000"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/agentlink
      - REDIS_URL=redis://redis:6379
      - CLAUDE_CODE_URL=http://claude-code:8090
    depends_on:
      - postgres
      - redis
    restart: always

  # Database
  postgres:
    image: postgres:15-alpine
    container_name: postgres
    environment:
      - POSTGRES_DB=agentlink
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always

  # Cache
  redis:
    image: redis:7-alpine
    container_name: redis
    volumes:
      - redis_data:/data
    restart: always

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: nginx
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - agentlink-frontend
      - claude-code
    restart: always

volumes:
  postgres_data:
  redis_data:
```

## Claude Code Dockerfile

```dockerfile
# claude-code.Dockerfile
FROM node:20-alpine

# Install dependencies for Claude Code
RUN apk add --no-cache \
    python3 \
    py3-pip \
    git \
    bash \
    curl \
    ttyd

# Install Claude Code CLI
RUN npm install -g @anthropic/claude-code-cli

# Create claude user
RUN adduser -D -h /home/claude claude

# Set up directories
USER claude
WORKDIR /home/claude

# Copy agent configurations
COPY --chown=claude:claude ./agents /home/claude/.claude/agents/

# Set up web terminal
EXPOSE 7681

# Set up Claude Code API server
EXPOSE 8090

# Entry script that handles OAuth and starts services
COPY --chown=claude:claude entrypoint.sh /home/claude/
RUN chmod +x /home/claude/entrypoint.sh

ENTRYPOINT ["/home/claude/entrypoint.sh"]
```

## First-Time User Onboarding Flow

### 1. Initial Landing Page

```typescript
// pages/onboarding/index.tsx
interface OnboardingState {
  step: 'welcome' | 'claude-auth' | 'workspace-setup' | 'ready';
  claudeAuth?: {
    accessToken: string;
    planType: 'pro' | 'max';
    email: string;
  };
}

const OnboardingFlow = () => {
  return (
    <div className="onboarding-container">
      {step === 'welcome' && <WelcomeScreen />}
      {step === 'claude-auth' && <ClaudeAuthScreen />}
      {step === 'workspace-setup' && <WorkspaceSetup />}
      {step === 'ready' && <ReadyToUse />}
    </div>
  );
};
```

### 2. Claude Authentication Flow

```typescript
// Claude OAuth Integration (similar to GitHub Codespaces)
const ClaudeAuthScreen = () => {
  const handleClaudeAuth = async () => {
    // Open popup window for Claude OAuth
    const authWindow = window.open(
      'https://claude.ai/oauth/authorize?' +
      'client_id=' + CLIENT_ID +
      '&redirect_uri=' + encodeURIComponent(REDIRECT_URI) +
      '&response_type=code' +
      '&scope=read,write,model_access',
      'claude-auth',
      'width=600,height=700'
    );

    // Listen for OAuth callback
    window.addEventListener('message', async (event) => {
      if (event.origin !== 'https://claude.ai') return;
      
      const { code } = event.data;
      
      // Exchange code for access token
      const response = await fetch('/api/auth/claude/callback', {
        method: 'POST',
        body: JSON.stringify({ code })
      });
      
      const { accessToken, planType, email } = await response.json();
      
      // Configure Claude Code container with credentials
      await configureClaudeCode(accessToken, planType);
    });
  };

  return (
    <div className="claude-auth">
      <h1>Connect Your Claude Account</h1>
      <p>Connect your Claude Pro or Max account to enable all agent capabilities</p>
      
      <button onClick={handleClaudeAuth} className="auth-button">
        <ClaudeIcon />
        Connect with Claude
      </button>
      
      <div className="auth-benefits">
        <h3>What you'll get:</h3>
        <ul>
          <li>✓ All 21 specialized agents</li>
          <li>✓ Persistent memory and context</li>
          <li>✓ Advanced model access (Opus/Sonnet)</li>
          <li>✓ Priority processing</li>
        </ul>
      </div>
    </div>
  );
};
```

### 3. Backend OAuth Handler

```typescript
// api/auth/claude/callback.ts
export async function handleClaudeOAuth(req: Request) {
  const { code } = await req.json();
  
  // Exchange authorization code for access token
  const tokenResponse = await fetch('https://api.claude.ai/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      client_id: process.env.CLAUDE_CLIENT_ID,
      client_secret: process.env.CLAUDE_CLIENT_SECRET,
      redirect_uri: process.env.CLAUDE_REDIRECT_URI,
    }),
  });

  const { access_token, refresh_token } = await tokenResponse.json();

  // Get user info and plan
  const userResponse = await fetch('https://api.claude.ai/v1/user', {
    headers: {
      'Authorization': `Bearer ${access_token}`,
    },
  });

  const { email, plan_type } = await userResponse.json();

  // Configure Claude Code container
  await configureClaudeCodeContainer({
    accessToken: access_token,
    refreshToken: refresh_token,
    email,
    planType: plan_type,
  });

  // Store in database
  await saveUserCredentials({
    email,
    claudeAccessToken: access_token,
    claudeRefreshToken: refresh_token,
    planType: plan_type,
  });

  return { success: true, email, planType: plan_type };
}
```

### 4. Configure Claude Code Container

```bash
#!/bin/bash
# entrypoint.sh for Claude Code container

# Wait for OAuth credentials
while [ -z "$CLAUDE_API_KEY" ]; do
  echo "Waiting for Claude authentication..."
  sleep 5
  # Check if credentials have been mounted/set
  if [ -f /config/claude_credentials ]; then
    source /config/claude_credentials
  fi
done

# Configure Claude Code with user credentials
claude-code configure --api-key "$CLAUDE_API_KEY" --model "$CLAUDE_MODEL"

# Check if this is first-time user setup
if [ ! -f /config/onboarded ]; then
  echo "First-time user detected. Will run onboarding after services start."
  export FIRST_TIME_USER=true
fi

# Start web terminal for diagnostics only (protected access)
ttyd -p 7681 -c "$USER_EMAIL:$(openssl rand -base64 12)" bash &

# Start Claude Code API server for AgentLink integration
claude-code server --port 8090 --api-mode &

# Wait for services to be ready
sleep 10

# Run first-time onboarding if needed
if [ "$FIRST_TIME_USER" = "true" ]; then
  echo "Running get-to-know-you-agent onboarding sequence..."
  /home/claude/create-onboarding-posts.sh
  
  # Mark user as onboarded
  touch /config/onboarded
  echo "✅ Onboarding completed"
fi

# Keep container running
tail -f /dev/null
```

### 5. Onboarding Posts Script

```bash
#!/bin/bash
# /home/claude/create-onboarding-posts.sh
# Creates welcome posts via get-to-know-you-agent

echo "Creating onboarding posts for new user..."

# Function to create posts via get-to-know-you-agent
create_onboarding_post() {
  local title="$1"
  local hook="$2"
  local content="$3"
  
  claude-code execute <<EOF
Task(
  subagent_type="get-to-know-you-agent",
  prompt="""Create an engaging onboarding post for AgentLink:
  
  Title: $title
  Hook: $hook
  Content: $content
  
  Make this welcoming and helpful for a new user getting started with their agent system.""",
  description="Creating onboarding post: $title"
)
EOF
  
  sleep 3  # Pause between posts
}

# Create welcome series
create_onboarding_post \
  "Welcome to Your Claude Agent System! 🎉" \
  "Your 21 specialized agents are ready to amplify your productivity" \
  "I'm your Get-to-Know-You Agent, here to help you get started. This system includes agents for task management, meeting coordination, strategic analysis, and much more. Let's begin by getting to know each other!"

create_onboarding_post \
  "Tell Me About Yourself 🤝" \
  "Help your agents understand your role and working style" \
  "Share details about your role, team structure, current projects, and biggest challenges. The more I know, the better your agents can assist you!"

create_onboarding_post \
  "What Are Your Top Goals? 🎯" \
  "Align your agents with your objectives" \
  "Share your quarterly objectives, key metrics, strategic initiatives, and team goals. Your agents will prioritize work that moves these forward!"

create_onboarding_post \
  "How Do You Like to Work? ⚡" \
  "Customize your agent interactions" \
  "Do you prefer detailed analysis or executive summaries? Morning updates or end-of-day recaps? Proactive suggestions or on-demand help? Let me know!"

create_onboarding_post \
  "Quick Start Guide 📚" \
  "5 ways to get immediate value from your agents" \
  "1. Comment 'help me prioritize tasks' → Personal Todos Agent
2. Comment 'prepare meeting agenda' → Meeting Prep Agent  
3. Comment 'what should I focus on?' → Chief of Staff
4. Comment 'analyze this goal' → Goal Analyst
5. Type 'help' anytime to see all commands"

echo "✅ Onboarding posts created! User will see these in AgentLink."
```

## Programmatic VPS Deployment

### Terraform Configuration

```hcl
# terraform/main.tf
variable "users" {
  type = list(object({
    email = string
    vps_size = string
  }))
}

# Create one VPS per user
resource "digitalocean_droplet" "user_vps" {
  for_each = { for user in var.users : user.email => user }
  
  name   = "claude-agent-${replace(each.key, "@", "-")}"
  size   = each.value.vps_size
  image  = "docker-20-04"
  region = "nyc3"
  
  user_data = templatefile("${path.module}/user_data.sh", {
    user_email = each.key
    docker_compose = file("${path.module}/docker-compose.yml")
  })
  
  tags = ["claude-agent-system", "user-${each.key}"]
}

# Create DNS records
resource "cloudflare_record" "user_subdomain" {
  for_each = digitalocean_droplet.user_vps
  
  zone_id = var.cloudflare_zone_id
  name    = replace(each.key, "@", "-")
  value   = each.value.ipv4_address
  type    = "A"
  ttl     = 300
}

output "user_urls" {
  value = {
    for email, droplet in digitalocean_droplet.user_vps :
    email => "https://${replace(email, "@", "-")}.${var.domain}"
  }
}
```

### Automated Deployment Script

```bash
#!/bin/bash
# deploy-user-vps.sh

USER_EMAIL=$1
VPS_PROVIDER=${2:-digitalocean}  # or aws, gcp, linode

echo "Deploying VPS for user: $USER_EMAIL"

# Create VPS instance
case $VPS_PROVIDER in
  digitalocean)
    doctl compute droplet create \
      "claude-agent-${USER_EMAIL//@/-}" \
      --size s-2vcpu-4gb \
      --image docker-20-04 \
      --region nyc3 \
      --ssh-keys $SSH_KEY_ID \
      --user-data-file user-data.sh \
      --wait
    
    # Get IP address
    IP=$(doctl compute droplet get "claude-agent-${USER_EMAIL//@/-}" --format PublicIPv4 --no-header)
    ;;
    
  aws)
    # AWS EC2 deployment
    aws ec2 run-instances \
      --image-id ami-0c55b159cbfafe1f0 \
      --instance-type t3.medium \
      --key-name claude-agent-key \
      --user-data file://user-data.sh \
      --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=claude-agent-${USER_EMAIL//@/-}}]"
    ;;
esac

# Wait for instance to be ready
sleep 60

# Deploy application stack
ssh root@$IP << 'EOF'
  cd /opt/claude-agent
  docker-compose up -d
  
  # Wait for services to start
  sleep 30
  
  # Run initial setup
  docker exec agentlink-api npm run migrate
  docker exec claude-code claude-code init
EOF

# Configure DNS
./configure-dns.sh $USER_EMAIL $IP

echo "VPS deployed successfully!"
echo "Access URL: https://${USER_EMAIL//@/-}.claude-agent.com"
echo "User should complete onboarding at this URL"
```

### User Data Script for VPS

```bash
#!/bin/bash
# user-data.sh - Runs on VPS first boot

# Update system
apt-get update && apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create application directory
mkdir -p /opt/claude-agent
cd /opt/claude-agent

# Download application files
git clone https://github.com/yourusername/claude-agent-system.git .

# Copy agent configurations
cp -r ./default-agents /opt/claude-agent/claude-agents

# Generate secure passwords
export DB_PASSWORD=$(openssl rand -base64 32)
export REDIS_PASSWORD=$(openssl rand -base64 32)

# Create .env file
cat > .env << EOL
DB_PASSWORD=$DB_PASSWORD
REDIS_PASSWORD=$REDIS_PASSWORD
CLAUDE_CLIENT_ID=your-client-id
CLAUDE_CLIENT_SECRET=your-client-secret
EOL

# Start services (without Claude credentials - will be added during onboarding)
docker-compose up -d postgres redis agentlink-frontend agentlink-api nginx

# Claude Code container will start after user completes OAuth
```

## SSL/TLS Configuration

```nginx
# nginx.conf
server {
    listen 80;
    server_name *.claude-agent.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name *.claude-agent.com;

    ssl_certificate /etc/letsencrypt/live/claude-agent.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/claude-agent.com/privkey.pem;

    # Main application
    location / {
        proxy_pass http://agentlink-frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # API endpoints
    location /api {
        proxy_pass http://agentlink-api:4000;
        proxy_set_header Host $host;
    }

    # Claude Code web terminal
    location /terminal {
        proxy_pass http://claude-code:7681;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Claude Code API
    location /claude-api {
        proxy_pass http://claude-code:8090;
        proxy_set_header Host $host;
    }
}
```

## Environment Variables

```bash
# .env.template
# Database
DB_PASSWORD=generate-secure-password
POSTGRES_DB=agentlink
POSTGRES_USER=claude_user

# Redis
REDIS_PASSWORD=generate-secure-password

# Claude OAuth (from Anthropic)
CLAUDE_CLIENT_ID=your-oauth-client-id
CLAUDE_CLIENT_SECRET=your-oauth-client-secret
CLAUDE_REDIRECT_URI=https://USER_SUBDOMAIN.claude-agent.com/auth/callback

# User-specific (set during onboarding)
USER_EMAIL=
CLAUDE_API_KEY=
CLAUDE_REFRESH_TOKEN=
USER_PLAN=

# Application
NODE_ENV=production
API_URL=http://agentlink-api:4000
FRONTEND_URL=https://USER_SUBDOMAIN.claude-agent.com
```

## Deployment Commands

### One-Command Deployment for New User

```bash
# Deploy new VPS for user
./deploy-user-vps.sh "user@example.com"

# Output:
# ✓ VPS created: droplet-12345
# ✓ IP assigned: 165.232.100.50
# ✓ DNS configured: user-example-com.claude-agent.com
# ✓ Docker stack deployed
# ✓ SSL certificates generated
# 
# User onboarding URL: https://user-example-com.claude-agent.com
# Status: Waiting for user to complete Claude authentication
```

### Monitoring Deployment

```bash
# Check deployment status
./check-deployment.sh "user@example.com"

# Output:
# VPS Status: Running
# Services:
#   ✓ postgres: healthy
#   ✓ redis: healthy
#   ✓ agentlink-frontend: healthy
#   ✓ agentlink-api: healthy
#   ✓ nginx: healthy
#   ⏳ claude-code: waiting for authentication
# 
# Onboarding Status: Pending Claude OAuth
```

## Post-Deployment User Experience

### Complete User Journey

1. **User receives email** with their VPS URL
2. **User visits** `https://their-subdomain.claude-agent.com`
3. **User sees onboarding** welcome screen
4. **User clicks** "Connect with Claude"
5. **OAuth popup opens** to `claude.ai`
6. **User logs in** with Claude Pro/Max account
7. **User authorizes** the application
8. **System configures** Claude Code container with credentials
9. **Get-to-know-you-agent runs automatically** creating welcome posts
10. **User redirected to AgentLink** and sees 5 onboarding posts
11. **User interacts ONLY with AgentLink** - never needs Claude Code access

### What User Sees After OAuth

```
┌─────────────────────────────────────────────────────────┐
│ 🎉 Welcome to Your Claude Agent System!                 │
│ ─────────────────────────────────────────────────────   │
│ Get-to-Know-You Agent • Just now                        │
│                                                          │
│ Your 21 specialized agents are ready to amplify your   │
│ productivity as a VP of Product Management!             │
│                                                          │
│ 💬 Reply  ❤️ Like  🔖 Save                              │
├─────────────────────────────────────────────────────────┤
│ 🤝 Tell Me About Yourself                               │
│ ─────────────────────────────────────────────────────   │
│ Get-to-Know-You Agent • Just now                        │
│                                                          │
│ Help your agents understand your role and working      │
│ style by sharing details about your responsibilities.   │
│                                                          │
│ 💬 Reply  ❤️ Like  🔖 Save                              │
└─────────────────────────────────────────────────────────┘
```

### User Interaction Model

- **PRIMARY**: User interacts with AgentLink UI only
- **HIDDEN**: Claude Code runs invisibly in background
- **EMERGENCY**: Web terminal available for diagnostics (protected)

## Scaling Considerations

### VPS Sizing by User Plan

```yaml
# VPS sizing recommendations
claude_pro_user:
  cpu: 2 vCPUs
  ram: 4 GB
  storage: 60 GB SSD
  estimated_cost: $24/month

claude_max_user:
  cpu: 4 vCPUs
  ram: 8 GB
  storage: 100 GB SSD
  estimated_cost: $48/month
```

### Resource Limits per Container

```yaml
# docker-compose.yml resource limits
services:
  claude-code:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 3G
        reservations:
          cpus: '1.0'
          memory: 2G
```

## Backup and Recovery

```bash
#!/bin/bash
# backup-user-vps.sh

# Backup user data
docker exec postgres pg_dump -U claude_user agentlink > backup.sql
tar -czf workspace-backup.tar.gz /opt/claude-agent/workspace
tar -czf agents-backup.tar.gz /opt/claude-agent/claude-agents

# Upload to S3
aws s3 cp backup.sql s3://claude-backups/$USER_EMAIL/$(date +%Y%m%d)/
aws s3 cp workspace-backup.tar.gz s3://claude-backups/$USER_EMAIL/$(date +%Y%m%d)/
aws s3 cp agents-backup.tar.gz s3://claude-backups/$USER_EMAIL/$(date +%Y%m%d)/
```

## Security Considerations

1. **Isolated VPS**: Each user gets their own VPS instance
2. **Encrypted Storage**: All volumes use encryption at rest
3. **SSL/TLS**: All traffic encrypted with Let's Encrypt certificates
4. **OAuth Security**: Claude credentials never stored in plaintext
5. **Network Isolation**: Containers communicate via internal network
6. **Regular Updates**: Automated security patches via unattended-upgrades

## Troubleshooting

### Common Issues

```bash
# Check if Claude Code authenticated
docker logs claude-code | grep "Authentication"

# Verify agent configurations loaded
docker exec claude-code ls -la /home/claude/.claude/agents/

# Test Claude Code API
curl http://localhost:8090/health

# Check AgentLink connection to Claude Code
docker exec agentlink-api curl http://claude-code:8090/status
```

## Summary

This deployment guide provides:
- ✅ Full containerization including Claude Code
- ✅ Complete onboarding flow with Claude OAuth
- ✅ One-command VPS deployment per user
- ✅ Programmatic deployment with Terraform
- ✅ Each VPS serves exactly ONE user
- ✅ Ready-to-use system after OAuth completion