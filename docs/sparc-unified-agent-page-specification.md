# SPARC Specification: Unified Agent Page

## Specification Phase

### 1. Project Overview

**Objective**: Create a single, comprehensive agent page that unifies the current Home and Details functionality into one cohesive experience that displays everything a user needs to know about a specific agent without redundancy or mock data.

**Current State Analysis**:
- `/agents/:agentId/home` - Comprehensive home page with metrics, activities, quick actions
- `/agents/:agentId` - Details page (currently using AgentDetail component)
- Both pages contain overlapping information and some mock data
- Navigation between pages creates UX friction

**Target State**: One unified page at `/agents/:agentId` that combines the best of both experiences.

---

### 2. User Stories

#### Epic: Unified Agent Experience
**As a user, I want to view all agent information in one comprehensive page so that I can understand and interact with my agents efficiently.**

#### User Story 1: Agent Overview
```gherkin
Feature: Agent Overview Display

  Scenario: User views agent overview
    Given I navigate to "/agents/{agentId}"
    When the page loads
    Then I should see the agent's profile header with:
      - Avatar with custom color/image
      - Agent name and display name
      - Status indicator (active/inactive/busy/error)
      - Agent description and specialization
      - Key performance metrics at a glance
    And I should see real-time status updates
    And I should see navigation breadcrumbs
```

#### User Story 2: Comprehensive Metrics Dashboard
```gherkin
Feature: Agent Performance Metrics

  Scenario: User views agent performance data
    Given I am on the unified agent page
    When I scroll to the metrics section
    Then I should see:
      - Real-time performance statistics
      - Success rate with historical trends
      - Response time metrics
      - Uptime percentage
      - Task completion counts (today/weekly/total)
      - User satisfaction ratings
    And all metrics should reflect real production data
    And metrics should update automatically
```

#### User Story 3: Activity Timeline
```gherkin
Feature: Agent Activity History

  Scenario: User views recent agent activities
    Given I am on the unified agent page
    When I view the activity section
    Then I should see:
      - Chronological list of recent activities
      - Activity types (task_completed, task_started, error, milestone)
      - Timestamps with relative time display
      - Activity details and metadata
      - Pagination for historical activities
    And activities should be from real database data
    And new activities should appear in real-time
```

#### User Story 4: Agent Capabilities Management
```gherkin
Feature: Agent Capabilities Display

  Scenario: User views agent capabilities
    Given I am on the unified agent page
    When I view the capabilities section
    Then I should see:
      - List of all agent capabilities
      - Proficiency indicators for each capability
      - Usage statistics for capabilities
      - Configuration options for modifying capabilities
    And capabilities should be editable if I have permissions
```

#### User Story 5: Quick Actions and Controls
```gherkin
Feature: Agent Control Interface

  Scenario: User performs quick actions on agent
    Given I am on the unified agent page
    When I view the action controls
    Then I should see:
      - Start/Stop/Restart agent controls
      - Task creation interface
      - Configuration access
      - Log viewing options
      - Performance analysis tools
    And all actions should work with real agent instances
    And I should receive confirmation for destructive actions
```

#### User Story 6: Customization and Settings
```gherkin
Feature: Agent Customization

  Scenario: User customizes agent appearance and behavior
    Given I am on the unified agent page
    And I have edit permissions
    When I access customization options
    Then I should be able to:
      - Modify agent name and description
      - Change avatar and theme colors
      - Configure dashboard widgets
      - Set privacy and visibility preferences
      - Customize welcome messages
    And changes should persist to the database
    And I should see changes reflected immediately
```

---

### 3. Technical Requirements

#### 3.1 Functional Requirements

**FR-001: Real Data Integration**
- **Priority**: Critical
- **Description**: All displayed data must come from real production database, no mock data
- **Acceptance Criteria**:
  - Agent information retrieved from `/api/agents/{agentId}`
  - Performance metrics from real monitoring data
  - Activities from database event logs
  - Real-time updates via WebSocket connections
  - Fallback handling for data loading failures

**FR-002: Unified Page Structure**
- **Priority**: High
- **Description**: Single page route `/agents/{agentId}` replacing separate home and details pages
- **Acceptance Criteria**:
  - Route consolidation from `/agents/{agentId}/home` and `/agents/{agentId}` to single `/agents/{agentId}`
  - Backward compatibility redirects for existing links
  - Consistent URL structure across the application
  - Deep linking support for specific sections

**FR-003: Responsive Design**
- **Priority**: High
- **Description**: Optimal viewing experience across all device sizes
- **Acceptance Criteria**:
  - Mobile-first responsive design
  - Tablet-optimized layout with collapsible sections
  - Desktop layout with multi-column arrangement
  - Touch-friendly controls on mobile devices
  - Accessibility compliance (WCAG 2.1 AA)

**FR-004: Real-time Updates**
- **Priority**: High
- **Description**: Live data updates without page refresh
- **Acceptance Criteria**:
  - WebSocket integration for real-time metrics
  - Status changes reflected immediately
  - New activities appear automatically
  - Connection status indicator
  - Graceful handling of connection losses

**FR-005: Agent Control Integration**
- **Priority**: Medium
- **Description**: Direct agent management capabilities
- **Acceptance Criteria**:
  - Start/stop/restart agent functionality
  - Task spawning interface
  - Configuration access
  - Log viewing integration
  - Permission-based action visibility

#### 3.2 Non-Functional Requirements

**NFR-001: Performance**
- **Response Time**: Initial page load < 2 seconds
- **Real-time Updates**: < 500ms latency for status updates
- **Memory Usage**: < 100MB browser memory footprint
- **Bundle Size**: Core page components < 500KB gzipped

**NFR-002: Reliability**
- **Uptime**: 99.9% page availability
- **Error Handling**: Graceful degradation for API failures
- **Data Consistency**: Real-time sync with backend state
- **Offline Support**: Basic caching for offline viewing

**NFR-003: Security**
- **Authentication**: JWT token-based authentication
- **Authorization**: Role-based action permissions
- **Data Privacy**: Sensitive agent data protection
- **Input Validation**: All user inputs sanitized

**NFR-004: Scalability**
- **Concurrent Users**: Support 100+ concurrent viewers per agent
- **Data Volume**: Handle agents with 10,000+ activities
- **Real-time Connections**: 500+ WebSocket connections
- **Caching Strategy**: Redis-based caching for frequently accessed data

---

### 4. UI/UX Design Specification

#### 4.1 Layout Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Header Navigation                                           │
│ ← Back | Agent Name | Share | Refresh | Actions           │
├─────────────────────────────────────────────────────────────┤
│ Agent Hero Section                                         │
│ [Avatar] Agent Name & Status | Key Metrics Row            │
│ Description & Specialization | Quick Stats                │
├─────────────────────────────────────────────────────────────┤
│ Tabbed Content Area                                        │
│ [Dashboard] [Activities] [Capabilities] [Settings]        │
│                                                           │
│ ┌─ Dashboard Tab ─────────────────────────────────────────┐│
│ │ ┌── Quick Actions ──┐ ┌── Performance Metrics ──┐     ││
│ │ │ • Start Task      │ │ Success Rate: 97.8%     │     ││
│ │ │ • View Logs      │ │ Avg Response: 1.2s       │     ││
│ │ │ • Configure      │ │ Uptime: 99.5%           │     ││
│ │ └───────────────────┘ └──────────────────────────┘     ││
│ │                                                        ││
│ │ ┌── Activity Timeline ──────────────────────────────────┐│
│ │ │ ● Task completed: Data analysis (2m ago)            ││
│ │ │ ● Task started: Report generation (5m ago)          ││
│ │ │ ● Milestone: 1000 tasks completed (2h ago)          ││
│ │ └─────────────────────────────────────────────────────┘││
│ └────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

#### 4.2 Component Hierarchy

```
UnifiedAgentPage
├── AgentHeader
│   ├── BackNavigation
│   ├── AgentAvatar
│   ├── AgentInfo
│   │   ├── NameAndStatus
│   │   ├── Description
│   │   └── StatusBadge
│   └── ActionToolbar
│       ├── ShareButton
│       ├── RefreshButton
│       └── SettingsButton
├── AgentHeroSection
│   ├── AgentProfile
│   └── QuickMetrics
│       ├── TaskCount
│       ├── SuccessRate
│       ├── ResponseTime
│       └── Uptime
├── ContentTabs
│   ├── DashboardTab
│   │   ├── QuickActions
│   │   ├── PerformanceCharts
│   │   ├── ActivityTimeline
│   │   └── SystemHealth
│   ├── ActivitiesTab
│   │   ├── ActivityFilter
│   │   ├── ActivityList
│   │   └── ActivityPagination
│   ├── CapabilitiesTab
│   │   ├── CapabilityList
│   │   ├── UsageStats
│   │   └── ConfigurationPanel
│   └── SettingsTab
│       ├── ProfileSettings
│       ├── BehaviorSettings
│       ├── PrivacySettings
│       └── CustomizationPanel
└── RealTimeUpdates
    ├── WebSocketManager
    ├── NotificationSystem
    └── DataSyncManager
```

#### 4.3 Design System

**Color Scheme**:
```css
/* Primary Colors */
--primary-blue: #3B82F6;
--primary-purple: #8B5CF6;
--success-green: #10B981;
--warning-yellow: #F59E0B;
--error-red: #EF4444;

/* Status Colors */
--status-active: #10B981;
--status-inactive: #6B7280;
--status-busy: #3B82F6;
--status-error: #EF4444;

/* Background Colors */
--bg-primary: #FFFFFF;
--bg-secondary: #F8FAFC;
--bg-accent: #F1F5F9;
```

**Typography**:
```css
/* Font Families */
--font-primary: 'Inter', sans-serif;
--font-mono: 'JetBrains Mono', monospace;

/* Font Sizes */
--text-xs: 0.75rem;   /* 12px */
--text-sm: 0.875rem;  /* 14px */
--text-base: 1rem;    /* 16px */
--text-lg: 1.125rem;  /* 18px */
--text-xl: 1.25rem;   /* 20px */
--text-2xl: 1.5rem;   /* 24px */
--text-3xl: 1.875rem; /* 30px */
```

**Spacing System**:
```css
/* Spacing Scale */
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-12: 3rem;    /* 48px */
--space-16: 4rem;    /* 64px */
```

#### 4.4 Responsive Breakpoints

```css
/* Mobile First Approach */
--breakpoint-sm: 640px;   /* Tablet */
--breakpoint-md: 768px;   /* Small Desktop */
--breakpoint-lg: 1024px;  /* Desktop */
--breakpoint-xl: 1280px;  /* Large Desktop */
--breakpoint-2xl: 1536px; /* Ultra Wide */
```

**Layout Adaptations**:
- **Mobile (< 640px)**: Single column, collapsible sections, bottom sheet actions
- **Tablet (640px - 1024px)**: Two-column grid, side panels, touch-optimized controls
- **Desktop (> 1024px)**: Multi-column layout, sidebar navigation, hover states

---

### 5. Data Requirements

#### 5.1 Agent Data Model

```typescript
interface UnifiedAgentData {
  // Core Identity
  id: string;
  name: string;
  display_name?: string;
  description: string;
  specialization: string;
  
  // Visual Identity
  avatar: string;
  avatar_color: string;
  cover_image?: string;
  theme_colors: {
    primary: string;
    accent: string;
  };
  
  // Status & Health
  status: 'active' | 'inactive' | 'busy' | 'error' | 'maintenance';
  last_heartbeat: string;
  uptime_seconds: number;
  health_score: number; // 0-100
  
  // Performance Metrics
  metrics: {
    total_tasks: number;
    today_tasks: number;
    weekly_tasks: number;
    monthly_tasks: number;
    success_rate: number; // 0-100
    average_response_time: number; // seconds
    current_uptime: number; // percentage
    user_satisfaction: number; // 1-5 rating
    peak_performance: {
      date: string;
      value: number;
    };
  };
  
  // Capabilities & Skills
  capabilities: AgentCapability[];
  skill_proficiency: {
    [skill: string]: number; // 0-100 proficiency
  };
  
  // Recent Activities
  recent_activities: AgentActivity[];
  activity_summary: {
    last_24h: number;
    last_7d: number;
    last_30d: number;
  };
  
  // Configuration
  settings: {
    auto_start: boolean;
    max_concurrent_tasks: number;
    timeout_seconds: number;
    retry_attempts: number;
    priority_level: 'low' | 'normal' | 'high' | 'urgent';
  };
  
  // Permissions & Ownership
  created_by: string;
  permissions: {
    can_edit: boolean;
    can_delete: boolean;
    can_execute: boolean;
    can_configure: boolean;
  };
  
  // Timestamps
  created_at: string;
  updated_at: string;
  last_used: string;
}

interface AgentCapability {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'specialized' | 'experimental';
  proficiency: number; // 0-100
  usage_count: number;
  last_used: string;
}

interface AgentActivity {
  id: string;
  type: 'task_started' | 'task_completed' | 'task_failed' | 'milestone' | 'error' | 'configuration_changed';
  title: string;
  description: string;
  timestamp: string;
  duration?: number; // seconds
  metadata: {
    task_id?: string;
    success?: boolean;
    error_message?: string;
    performance_impact?: number;
    user_id?: string;
  };
  severity: 'info' | 'warning' | 'error' | 'success';
}
```

#### 5.2 API Endpoints

**Core Agent Data**:
```
GET /api/agents/{agentId}
Response: UnifiedAgentData

GET /api/agents/{agentId}/metrics
Response: Real-time performance metrics with historical data

GET /api/agents/{agentId}/activities
Query Parameters: ?limit=50&offset=0&type=all&from=timestamp&to=timestamp
Response: Paginated activity list

POST /api/agents/{agentId}/actions
Body: { action: 'start' | 'stop' | 'restart' | 'configure', parameters?: any }
Response: Action confirmation and status

PUT /api/agents/{agentId}/settings
Body: Partial agent settings update
Response: Updated agent data

GET /api/agents/{agentId}/logs
Query Parameters: ?level=all&limit=100&from=timestamp
Response: Agent execution logs
```

**Real-time Data**:
```
WebSocket: /ws/agents/{agentId}
Events:
- agent_status_change
- metrics_update
- new_activity
- configuration_changed
- health_check_update
```

#### 5.3 Caching Strategy

**Client-Side Caching**:
```typescript
// React Query cache configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      cacheTime: 300000, // 5 minutes
    }
  }
});

// Cache keys structure
const CACHE_KEYS = {
  agent: (id: string) => ['agent', id],
  agentMetrics: (id: string) => ['agent', id, 'metrics'],
  agentActivities: (id: string, params: any) => ['agent', id, 'activities', params],
  agentLogs: (id: string, params: any) => ['agent', id, 'logs', params],
};
```

**Server-Side Caching**:
- Redis cache for frequently accessed agent data (TTL: 5 minutes)
- Database query optimization with indexed columns
- CDN caching for static assets and avatars
- Edge caching for public agent profiles

---

### 6. Performance Requirements

#### 6.1 Loading Performance

**Initial Load Targets**:
- **First Contentful Paint**: < 1.2 seconds
- **Largest Contentful Paint**: < 2.0 seconds
- **Cumulative Layout Shift**: < 0.1
- **First Input Delay**: < 100ms

**Progressive Loading Strategy**:
1. **Critical Path** (0-500ms): Agent header and basic info
2. **Important Content** (500ms-1s): Quick metrics and status
3. **Extended Content** (1s-2s): Activities and detailed metrics
4. **Background Content** (2s+): Historical data and advanced features

**Code Splitting**:
```typescript
// Lazy load non-critical components
const SettingsTab = lazy(() => import('./components/SettingsTab'));
const AdvancedMetrics = lazy(() => import('./components/AdvancedMetrics'));
const LogViewer = lazy(() => import('./components/LogViewer'));

// Critical components loaded immediately
import AgentHeader from './components/AgentHeader';
import QuickMetrics from './components/QuickMetrics';
import ActivityTimeline from './components/ActivityTimeline';
```

#### 6.2 Runtime Performance

**Memory Management**:
- Implement virtual scrolling for long activity lists
- Cleanup WebSocket connections on component unmount
- Use React.memo for expensive components
- Implement proper dependency arrays in hooks

**Real-time Update Optimization**:
- Debounce rapid status updates (100ms)
- Batch multiple metric updates
- Use incremental activity loading
- Implement connection pooling for WebSockets

**Bundle Optimization**:
- Tree shaking for unused code
- Code splitting by route and feature
- Optimize images and assets
- Use modern build tools (Vite/Webpack 5)

#### 6.3 Scalability Targets

**User Load**:
- **Concurrent Page Views**: 500+ users per agent page
- **Real-time Connections**: 1000+ WebSocket connections
- **API Request Rate**: 10,000 requests/minute
- **Database Queries**: < 50ms average response time

**Data Volume**:
- **Activities per Agent**: 100,000+ historical activities
- **Metrics Data Points**: 1M+ data points per agent
- **Real-time Updates**: 1000+ updates/minute during peak

---

### 7. Caching Strategy

#### 7.1 Multi-Level Caching Architecture

```
Client Browser
├── Memory Cache (React Query)
├── Local Storage (Settings/Preferences)
└── Service Worker Cache (Static Assets)
                ↓
CDN Layer (CloudFlare/AWS CloudFront)
├── Static Assets (24h TTL)
├── API Responses (5min TTL)
└── Images/Media (7d TTL)
                ↓
Application Server
├── Redis Cache (Hot Data)
├── Memory Cache (Frequently Accessed)
└── Database Connection Pool
                ↓
Database Layer
├── Query Result Cache
├── Connection Pool
└── Read Replicas
```

#### 7.2 Cache Implementation Strategy

**React Query Configuration**:
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      cacheTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// Selective cache invalidation
const invalidateAgentData = (agentId: string) => {
  queryClient.invalidateQueries(['agent', agentId]);
  queryClient.invalidateQueries(['agent', agentId, 'metrics']);
  queryClient.refetchQueries(['agent', agentId, 'activities'], { active: true });
};
```

**Redis Caching Strategy**:
```typescript
// Server-side cache configuration
const CACHE_CONFIG = {
  agent_data: { ttl: 300 }, // 5 minutes
  agent_metrics: { ttl: 60 }, // 1 minute
  agent_activities: { ttl: 120 }, // 2 minutes
  agent_logs: { ttl: 300 }, // 5 minutes
  user_preferences: { ttl: 3600 }, // 1 hour
};

// Cache warming strategy
const warmCache = async (agentId: string) => {
  await Promise.all([
    cacheAgentData(agentId),
    cacheAgentMetrics(agentId),
    cacheRecentActivities(agentId),
  ]);
};
```

#### 7.3 Cache Invalidation Strategy

**Event-Driven Invalidation**:
- Agent status changes → Invalidate agent data and metrics
- New activities → Invalidate activity cache and update counters
- Configuration updates → Invalidate settings and related data
- Performance metric updates → Invalidate metrics cache selectively

**Time-Based Invalidation**:
- Critical data (status, health): 30 seconds
- Important data (metrics, activities): 2 minutes
- Static data (configuration, capabilities): 5 minutes
- Historical data (logs, trends): 10 minutes

---

### 8. Responsive Design Specifications

#### 8.1 Mobile-First Design (320px - 639px)

**Layout Structure**:
```scss
.unified-agent-page {
  // Full-width single column
  display: flex;
  flex-direction: column;
  padding: var(--space-4);
  gap: var(--space-6);
  
  .agent-header {
    position: sticky;
    top: 0;
    background: var(--bg-primary);
    z-index: 10;
    padding: var(--space-3);
    border-bottom: 1px solid var(--border-gray-200);
  }
  
  .agent-profile {
    text-align: center;
    .avatar { width: 80px; height: 80px; }
    .name { font-size: var(--text-2xl); }
    .description { 
      font-size: var(--text-sm);
      line-height: 1.4;
      margin-top: var(--space-2);
    }
  }
  
  .quick-metrics {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-3);
    
    .metric-card {
      padding: var(--space-4);
      text-align: center;
      border-radius: var(--radius-lg);
      background: var(--bg-secondary);
    }
  }
  
  .content-tabs {
    .tab-list {
      display: flex;
      overflow-x: auto;
      scrollbar-width: none;
      gap: var(--space-2);
      padding-bottom: var(--space-2);
      border-bottom: 2px solid var(--border-gray-200);
    }
    
    .tab-content {
      padding: var(--space-4) 0;
      min-height: 60vh;
    }
  }
}
```

**Touch-Optimized Controls**:
- Minimum touch target size: 44px × 44px
- Comfortable spacing between interactive elements
- Swipe gestures for tab navigation
- Pull-to-refresh functionality
- Bottom sheet for action menus

**Mobile-Specific Features**:
- Collapsible header on scroll
- Sticky tab navigation
- Bottom action bar for primary controls
- Haptic feedback for interactions
- Optimized loading states

#### 8.2 Tablet Design (640px - 1023px)

**Layout Adaptations**:
```scss
@media (min-width: 640px) {
  .unified-agent-page {
    padding: var(--space-6);
    
    .agent-header {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
    
    .quick-metrics {
      grid-template-columns: repeat(4, 1fr);
      gap: var(--space-4);
    }
    
    .content-area {
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: var(--space-6);
      
      .sidebar {
        position: sticky;
        top: var(--space-6);
        height: fit-content;
      }
      
      .main-content {
        min-height: 0;
      }
    }
  }
}
```

**Tablet-Specific Features**:
- Side navigation panel
- Multi-column content layout
- Picture-in-picture for charts
- Split-view capabilities
- Enhanced gesture support

#### 8.3 Desktop Design (1024px+)

**Advanced Layout**:
```scss
@media (min-width: 1024px) {
  .unified-agent-page {
    max-width: 1400px;
    margin: 0 auto;
    padding: var(--space-8);
    
    .agent-hero {
      background: linear-gradient(135deg, var(--primary-blue), var(--primary-purple));
      border-radius: var(--radius-xl);
      padding: var(--space-8);
      color: white;
      margin-bottom: var(--space-8);
      
      .hero-content {
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: var(--space-6);
      }
    }
    
    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr 350px;
      gap: var(--space-8);
      
      .main-dashboard {
        display: grid;
        grid-template-rows: auto auto 1fr;
        gap: var(--space-6);
      }
      
      .sidebar-widgets {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
        position: sticky;
        top: var(--space-6);
        height: fit-content;
      }
    }
  }
}
```

**Desktop-Specific Features**:
- Multi-pane layout with resizable sections
- Advanced keyboard navigation
- Context menus and tooltips
- Drag-and-drop functionality
- Multiple window support
- Advanced filtering and search

#### 8.4 Accessibility Compliance

**WCAG 2.1 AA Requirements**:
- **Keyboard Navigation**: Full keyboard accessibility with visible focus indicators
- **Screen Reader Support**: Semantic HTML, ARIA labels, live regions for updates
- **Color Contrast**: Minimum 4.5:1 ratio for normal text, 3:1 for large text
- **Responsive Text**: Support for 200% zoom without horizontal scrolling
- **Alternative Text**: Descriptive alt text for images and icons

**Implementation Features**:
```typescript
// Accessibility hooks and components
const useA11yAnnouncements = () => {
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
  };
  return { announce };
};

// Focus management
const useFocusManagement = () => {
  const focusTrapRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        // Implement focus trap logic
      }
    };
    
    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, []);
  
  return { focusTrapRef };
};
```

---

### 9. Success Metrics and Acceptance Criteria

#### 9.1 Performance Metrics

**Core Web Vitals Targets**:
- **First Contentful Paint (FCP)**: < 1.2s
- **Largest Contentful Paint (LCP)**: < 2.0s
- **First Input Delay (FID)**: < 100ms
- **Cumulative Layout Shift (CLS)**: < 0.1

**Custom Performance Metrics**:
- **Time to Interactive**: < 2.5s
- **Real-time Update Latency**: < 500ms
- **Memory Usage**: < 50MB after 10 minutes of usage
- **Bundle Size**: < 400KB gzipped for initial load

#### 9.2 User Experience Metrics

**Usability Benchmarks**:
- **Task Completion Rate**: > 95% for primary tasks
- **Average Task Time**: < 30 seconds for common actions
- **User Satisfaction Score**: > 4.5/5
- **Bounce Rate**: < 10% for returning users

**Accessibility Metrics**:
- **Keyboard Navigation**: 100% feature coverage
- **Screen Reader Compatibility**: Full NVDA/JAWS support
- **Color Contrast**: 100% WCAG AA compliance
- **Focus Management**: Logical tab order throughout

#### 9.3 Technical Success Criteria

**Functional Requirements Validation**:
```gherkin
Feature: Unified Agent Page Functionality

  Scenario: Complete page load with real data
    Given I navigate to "/agents/test-agent-123"
    When the page loads completely
    Then I should see real agent data (not mock data)
    And all metrics should reflect current database values
    And WebSocket connection should be established
    And page should be fully interactive within 2 seconds

  Scenario: Real-time updates work correctly
    Given I am viewing an agent page
    When the agent status changes on the server
    Then the page should update within 500ms
    And the user should be notified of the change
    And no page refresh should be required

  Scenario: Mobile responsive design works
    Given I access the page on a mobile device (320px width)
    When I interact with all major features
    Then all functionality should be accessible
    And the layout should be optimized for touch
    And no horizontal scrolling should be required

  Scenario: Offline graceful degradation
    Given I am viewing an agent page
    When the network connection is lost
    Then the page should show cached data
    And indicate the offline status clearly
    And allow viewing of cached information
```

#### 9.4 Quality Assurance Checklist

**Pre-Launch Validation**:
- [ ] All mock data replaced with real database integration
- [ ] WebSocket real-time updates functioning correctly
- [ ] Mobile, tablet, and desktop layouts tested
- [ ] Accessibility audit passed (WCAG 2.1 AA)
- [ ] Performance benchmarks met on various devices
- [ ] Error handling covers all edge cases
- [ ] Security review completed
- [ ] Cross-browser compatibility verified
- [ ] Load testing passed for expected traffic
- [ ] Database queries optimized and indexed

**Post-Launch Monitoring**:
- [ ] Real User Monitoring (RUM) implemented
- [ ] Error tracking and alerting configured
- [ ] Performance monitoring dashboards set up
- [ ] User feedback collection mechanism in place
- [ ] A/B testing framework ready for future improvements

---

### 10. Implementation Priority and Phases

#### Phase 1: Core Unification (Week 1-2)
**High Priority**:
- Consolidate existing AgentHome and AgentDetail components
- Implement unified route structure (`/agents/:agentId`)
- Replace all mock data with real database integration
- Basic responsive layout (mobile + desktop)

**Deliverables**:
- Single functional agent page with real data
- Basic performance metrics display
- Real-time status updates via WebSocket

#### Phase 2: Enhanced UX (Week 3-4)
**Medium Priority**:
- Advanced tabbed interface implementation
- Comprehensive activity timeline
- Agent control integration (start/stop/configure)
- Tablet-optimized responsive design

**Deliverables**:
- Full-featured tabbed interface
- Complete activity history with pagination
- Agent management controls integration

#### Phase 3: Performance & Polish (Week 5-6)
**Medium Priority**:
- Performance optimization and caching
- Accessibility compliance implementation
- Advanced customization features
- Error handling and edge cases

**Deliverables**:
- Performance benchmarks met
- WCAG 2.1 AA compliance achieved
- Comprehensive error handling implemented

#### Phase 4: Advanced Features (Week 7-8)
**Lower Priority**:
- Advanced analytics and reporting
- Agent capability management
- Collaboration features (sharing, comments)
- Advanced customization options

**Deliverables**:
- Advanced dashboard widgets
- Capability configuration interface
- Social features implementation

---

### 11. Risk Assessment and Mitigation

#### 11.1 Technical Risks

**Risk: Database Performance Issues**
- **Probability**: Medium
- **Impact**: High
- **Mitigation**: Implement comprehensive caching strategy, database query optimization, connection pooling

**Risk: WebSocket Connection Reliability**
- **Probability**: Medium
- **Impact**: Medium
- **Mitigation**: Implement reconnection logic, fallback to polling, connection health monitoring

**Risk: Mobile Performance Degradation**
- **Probability**: Medium
- **Impact**: High
- **Mitigation**: Aggressive code splitting, image optimization, progressive loading

#### 11.2 User Experience Risks

**Risk: Information Overload**
- **Probability**: High
- **Impact**: Medium
- **Mitigation**: Progressive disclosure, customizable dashboards, intelligent defaults

**Risk: Navigation Confusion**
- **Probability**: Medium
- **Impact**: Medium
- **Mitigation**: Clear breadcrumbs, consistent navigation patterns, user testing

#### 11.3 Business Risks

**Risk: Development Timeline Delays**
- **Probability**: Medium
- **Impact**: High
- **Mitigation**: Phased delivery approach, MVP first, iterative improvements

**Risk: User Adoption Resistance**
- **Probability**: Low
- **Impact**: Medium
- **Mitigation**: Gradual rollout, user feedback collection, training materials

---

This SPARC specification provides a comprehensive foundation for implementing the unified agent page. The specification emphasizes real data integration, performance optimization, and user experience while maintaining technical feasibility and business value.