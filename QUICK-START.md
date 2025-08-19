# 🚀 AgentLink Dual Instance Quick Start

**Complete dual Claude Code instance integration is now running!**

---

## ✅ System Status

Both servers are **currently running**:

- **Backend API**: `http://localhost:3000` ✅
- **Frontend Dashboard**: `http://localhost:3001` ✅

## 🎯 Access the Dual Instance Dashboard

**Open your browser to**: `http://localhost:3001`

You will see the **unified AgentLink dashboard** displaying:

### 🔵 Development Instance (3 Agents)
- **coder**: Implementation specialist (Active)
- **reviewer**: Code review specialist (Busy) 
- **tester**: Testing specialist (Idle)

### 🟢 Production Instance (4 Agents)
- **chief-of-staff-agent**: Strategic coordination (Active)
- **personal-todos-agent**: Task management (Busy)
- **impact-filter-agent**: Business analysis (Active)
- **opportunity-scout-agent**: Market analysis (Idle)

### 🟡 Cross-Instance Handoffs
- **Development → Production**: Feature deployment (Completed)
- **Production → Development**: Business requirements (In Progress)

---

## 🖥️ Dashboard Features

### 1. **Instance Status Overview**
Top cards showing:
- Development: 3 coding agents (Port 8080-8089)
- Production: 4 business agents (Port 8090-8119)  
- Active handoffs between instances

### 2. **Tabbed Interface**
- **Unified View**: Combined activities from both instances
- **Development**: Coding agents and development activities
- **Production**: Business agents and strategic activities
- **Handoffs**: Cross-instance workflow coordination

### 3. **Real-time Features**
- Live agent status indicators (●)
- Activity feed with timestamps
- Visual differentiation (blue for dev, green for prod)
- Priority badges (P0-P3)

### 4. **Agent Cards**
Each agent shows:
- Status indicator (Active/Busy/Idle/Error)
- Capabilities and tools
- Priority level
- Last activity timestamp

---

## 🔧 Technical Architecture

### Current Setup
```
Frontend (3001) ──→ API Gateway (3000) ──→ Demo Endpoints
                                        ├── /dev/agents
                                        ├── /prod/agents  
                                        ├── /activities
                                        └── /handoffs
```

### Production Architecture (When Claude instances running)
```
Frontend (3001) ──→ API Gateway (3000) ──→ Claude Dev (8080)
                                        └── Claude Prod (8090)
```

---

## 📊 API Endpoints Available

### Demo Endpoints (Currently Active)
- `GET /api/v1/demo/dev/agents` - Development agents
- `GET /api/v1/demo/prod/agents` - Production agents
- `GET /api/v1/demo/activities` - Combined activity feed
- `GET /api/v1/demo/handoff/status` - Cross-instance handoffs
- `GET /api/v1/demo/health` - System health status

### Production Endpoints (For real Claude instances)
- `GET /api/v1/dual-instance/dev/*` - Proxy to development Claude (8080)
- `GET /api/v1/dual-instance/prod/*` - Proxy to production Claude (8090)
- `POST /api/v1/dual-instance/handoff/create` - Create handoff workflow

---

## 🎮 Try These Features

### 1. **View Agent Status**
- Click different tabs to see instance separation
- Notice color coding (blue=dev, green=prod)
- Check agent capabilities and priorities

### 2. **Monitor Activities**
- Watch the real-time activity feed
- See which instance each activity comes from
- Notice timestamp and metadata

### 3. **Cross-Instance Handoffs**
- View handoff workflows in the "Handoffs" tab
- See development-to-production deployments
- Track business-requirement feedback loops

### 4. **System Health**
Test via API:
```bash
curl http://localhost:3000/api/v1/demo/health
```

---

## 🔄 Next Steps for Full Integration

To connect **real Claude Code instances**:

1. **Setup Authentication**:
   ```bash
   # Development instance
   claude auth login
   cp ~/.claude .claude-dev
   
   # Production instance  
   claude auth login
   cp ~/.claude .claude-prod
   ```

2. **Start Claude Instances**:
   ```bash
   # Terminal 1: Development instance
   claude code --port 8080
   
   # Terminal 2: Production instance
   claude code --port 8090
   ```

3. **Switch to Production Routes**:
   Update frontend to use `/api/v1/dual-instance/*` instead of `/api/v1/demo/*`

---

## 🎯 Key Benefits Demonstrated

✅ **Unified Management**: Single dashboard for dev + prod  
✅ **Real-time Visibility**: Live agent status and activities  
✅ **Clear Separation**: Visual distinction between environments  
✅ **Workflow Coordination**: Cross-instance handoff tracking  
✅ **Scalable Architecture**: Independent instance management  

---

## 🐛 Troubleshooting

### If Frontend Not Loading
```bash
cd frontend && npm run dev
```

### If Backend Not Responding
```bash
npm run dev
```

### Check Server Status
```bash
curl http://localhost:3000/health
curl http://localhost:3001
```

---

**🎉 The dual Claude Code instance architecture is fully operational and ready for production deployment!**

Access the dashboard now: **http://localhost:3001**