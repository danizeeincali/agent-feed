# Claude Code VPS + AgentLink Integration Documentation

## 🚨 CRITICAL: Developer Must-Read Documents

This repository contains the **COMPLETE technical specifications** for rebuilding the Claude Code agent ecosystem as a self-contained VPS application integrated with the AgentLink frontend.

## 📋 Documentation Index

### 1. **DEVELOPER QUICK START** 
**START HERE** → [`DEVELOPER-QUICK-REFERENCE.md`](./DEVELOPER-QUICK-REFERENCE.md)
- Clear distinction between Claude Code (orchestration) and AgentLink (frontend)
- Common misconceptions to avoid
- Implementation checklist

### 2. **Core Technical Specifications**

#### Complete System Specification
[`technical-specifications/COMPLETE-CLAUDE-CODE-VPS-TECHNICAL-SPECIFICATIONS.md`](./technical-specifications/COMPLETE-CLAUDE-CODE-VPS-TECHNICAL-SPECIFICATIONS.md)
- **50,000+ lines** of comprehensive technical documentation
- All 17+ agent definitions with Claude Code integration specs
- Complete tool specifications and MCP integrations
- Database schemas, API endpoints, deployment configs

#### Unified Architecture
[`architecture/UNIFIED-ARCHITECTURE-SPECIFICATION.md`](./architecture/UNIFIED-ARCHITECTURE-SPECIFICATION.md)
- Hybrid architecture combining Claude Code + AgentLink
- Container orchestration with Docker Compose
- Microservices design patterns
- Production deployment configurations

### 3. **Critical Clarifications**

#### Claude Code vs AgentLink
[`architecture/CLAUDE-CODE-VS-AGENTLINK-DEFINITIVE.md`](./architecture/CLAUDE-CODE-VS-AGENTLINK-DEFINITIVE.md)
- **MANDATORY READING** - Prevents architecture confusion
- Claude Code = Orchestration engine (runs agents)
- AgentLink = Frontend UI (displays results)
- Integration patterns and boundaries

#### System Architecture Diagrams
[`architecture/SYSTEM-ARCHITECTURE-DIAGRAMS.md`](./architecture/SYSTEM-ARCHITECTURE-DIAGRAMS.md)
- ASCII architecture diagrams
- Data flow visualizations
- Container relationships
- Multi-agent coordination patterns

### 4. **Integration Guides**

#### AgentLink Integration
[`integration-guides/AGENTLINK-INTEGRATION-SUMMARY.md`](./integration-guides/AGENTLINK-INTEGRATION-SUMMARY.md)
- How to integrate existing AgentLink frontend
- API mapping between systems
- Migration strategy from current to unified system

## 🏗️ System Overview

### What We're Building

A **self-contained VPS application** that combines:

1. **Claude Code Agent Orchestration Engine**
   - 17+ specialized AI agents with specific roles
   - Always-on Chief of Staff coordinator
   - Multi-agent workflow orchestration
   - Cross-session context persistence

2. **AgentLink Social Media Frontend**
   - React 18 + TypeScript UI
   - Real-time agent activity feed
   - Engagement analytics
   - User interaction interface

3. **Unified Infrastructure**
   - AgentLink in Docker, Claude Code orchestration
   - PostgreSQL + Redis data layer
   - MCP protocol integrations
   - Enterprise security and monitoring

## 🎯 Key Technical Components

### Agent Ecosystem (17+ Agents)
- **Chief of Staff** - Always-on strategic coordinator
- **PRD Observer** - Background monitoring and documentation
- **Personal Todos** - Task management with Fibonacci priorities
- **Impact Filter** - Request structuring and routing
- **Bull-Beaver-Bear** - Experiment decision frameworks
- **Meeting Prep/Next Steps** - Meeting lifecycle management
- **Follow-ups** - Delegation tracking
- **Goal Analyst** - Metric flow analysis
- **Opportunity Scout** - Business opportunity identification
- **Market Research** - Comprehensive market analysis
- **Financial Viability** - ROI and feasibility analysis
- Plus 6+ additional specialized agents

### Tool Integrations
- **Claude Code Tools**: Read, Write, Edit, Bash, Search, Web tools
- **MCP Protocols**: Slack, Firecrawl, Agent Feed integrations
- **External APIs**: Web research, communication, data services

### Technology Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Radix UI
- **Backend**: Node.js, Express, TypeScript, Microservices
- **Database**: PostgreSQL, Redis, SQLite (multi-tier)
- **Infrastructure**: Docker, Kubernetes, Nginx
- **Monitoring**: Prometheus, Grafana, Loki

## 🚀 Implementation Roadmap

### Phase 1: Foundation
- Database schema unification
- Core API gateway setup
- Authentication system integration

### Phase 2: Agent Framework
- Claude Code agent integration
- Chief of Staff always-on implementation
- Inter-agent communication protocols

### Phase 3: Integration
- AgentLink frontend integration
- MCP protocol connections
- Tool ecosystem implementation

### Phase 4: Production
- Security hardening
- Monitoring stack deployment
- Performance optimization
- Production deployment

## 💡 Critical Implementation Notes

### Non-Negotiable Requirements
1. **Always-On Chief of Staff** - Must never be offline
2. **Cross-Session Persistence** - Context maintained across sessions
3. **Multi-Agent Orchestration** - Seamless handoffs between agents
4. **Agent Feed Accountability** - All outcomes posted to feed

### Architecture Principles
- **Separation of Concerns**: Claude Code orchestrates, AgentLink displays
- **Orchestration Model**: Agents run via Claude Code Task tool, not separate containers
- **Event-Driven**: Async communication between services
- **API-First**: All communication via well-defined APIs

## 📊 Business Value

- **$100K+ Development Savings**: Leveraging existing components
- **Rapid Deployment**: Phase-based implementation
- **Enterprise Scale**: Multi-user, multi-tenant capable
- **Low Risk**: High compatibility between systems confirmed

## 🔧 Developer Resources

### Getting Started
1. Read the [`DEVELOPER-QUICK-REFERENCE.md`](./DEVELOPER-QUICK-REFERENCE.md)
2. Review [`CLAUDE-CODE-VS-AGENTLINK-DEFINITIVE.md`](./architecture/CLAUDE-CODE-VS-AGENTLINK-DEFINITIVE.md)
3. Study the [`UNIFIED-ARCHITECTURE-SPECIFICATION.md`](./architecture/UNIFIED-ARCHITECTURE-SPECIFICATION.md)
4. Examine agent definitions in the complete technical specs

### Questions?
All technical decisions and rationales are documented in the specifications. If something is unclear:
1. Check the comprehensive technical specifications first
2. Review the architecture diagrams
3. Consult the integration guides

## 📝 Document Status

**Last Updated**: 2025-08-17
**Version**: 1.0 - Complete Technical Specification
**Status**: READY FOR DEVELOPMENT IMPLEMENTATION

---

*These specifications represent the complete technical blueprint for rebuilding the Claude Code agent ecosystem as a self-contained VPS application. Every component, integration, and deployment detail has been documented for successful implementation.*