# Clean Agent Pages Architecture

## Core Principles
- Simple static routing
- Data persistence separation  
- Clear agent responsibilities
- Meta agent coordination

## Architecture Components

### 1. Simple Static Routes
```
/agents/personal-todos-agent
/agents/task-manager-agent
/agents/productivity-agent
```

### 2. Page Structure vs User Data
- Page Structure: UI layout only (from page-builder)
- User Data: Agent-owned, persists separately

### 3. Coordination Flow
1. Page Builder → creates UI layout
2. Avi → coordinates update
3. Meta Agent Update → modifies agent configs
4. Individual Agent → adapts to new structure
5. User data persists throughout

## Implementation Plan
- Remove complex versioning
- Implement static page components
- Create agent config watchers
- Build coordination system