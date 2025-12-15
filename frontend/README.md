# Agent Feed Frontend

React-based frontend for Claude Code Agent Orchestration with real-time WebSocket integration.

## Features

- **Real-time Dashboard**: Monitor agents, workflows, and background tasks
- **WebSocket Integration**: Live updates from orchestration backend
- **Responsive Design**: Tailwind CSS with modern UI components
- **TypeScript**: Full type safety and IntelliSense support
- **Component Architecture**: Modular, reusable React components

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Architecture

### Core Components

- **AgentFeedDashboard**: Main dashboard with agent pool, workflows, and tasks
- **BackgroundActivityPanel**: Detailed background task monitoring
- **WorkflowStatusBar**: Real-time workflow status and controls

### Services

- **WebSocket Service**: Real-time communication with backend
- **API Service**: RESTful API integration
- **Background Orchestration Hook**: State management for real-time updates

### Key Features

1. **Zero-Wait Experience**: Background orchestration with immediate UI feedback
2. **Multi-Stream Updates**: Handle multiple WebSocket connections
3. **Contextual Agent Selection**: Intelligent agent interaction
4. **Progressive Response Handling**: Real-time progress indicators

## Configuration

Default endpoints:
- WebSocket: `ws://localhost:8000/ws`
- API: `http://localhost:8000/api`

Configure in the Settings page or update service files directly.

## Development

Built with:
- React 18
- TypeScript 5
- Vite (build system)
- Tailwind CSS
- React Query (data fetching)
- React Router (navigation)

## Production Deployment

```bash
npm run build
# Serve the `dist` directory with your web server
```

The application is optimized for production with code splitting, tree shaking, and asset optimization.