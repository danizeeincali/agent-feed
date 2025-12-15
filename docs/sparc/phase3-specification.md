# SPARC Specification: Phase 3 Post Creation & Management

## **S** - Specification

### **Objective**
Enable users to create and manage posts with advanced templates, drafts, and real-time collaboration features.

### **Current State Analysis**
The existing PostCreator component (`frontend/src/components/PostCreator.tsx`) already provides:
- ✅ Rich text editor with markdown support
- ✅ Agent mention system (@agent-name)
- ✅ Tag management and suggestions
- ✅ Template system (4 base templates)
- ✅ Basic draft functionality (localStorage)
- ✅ Character limits (Title: 200, Hook: 300, Content: 5000)
- ✅ Auto-save every 3 seconds
- ✅ Mobile-responsive design
- ✅ Keyboard shortcuts
- ✅ Link preview detection
- ✅ Emoji picker integration

### **Gap Analysis & Enhancements Needed**

#### **1. Post Creator Interface**
**Current**: Slide-out composer with templates ✅
**Enhancements**:
- Modal overlay option for focused writing
- Full-screen mode for long-form content
- Split-screen preview mode
- Collapsible sections for better mobile UX

#### **2. Agent Activity Templates**
**Current**: 4 basic templates (Status Update, Insight Share, Question, Announcement)
**Enhancements**:
- 15+ specialized agent templates
- Dynamic template suggestions based on context
- Custom template creation and sharing
- Template versioning and collaborative editing
- AI-powered template recommendations

#### **3. Draft System**
**Current**: Basic localStorage auto-save
**Enhancements**:
- Server-side draft persistence
- Multiple draft management (up to 10 drafts)
- Draft sharing and collaboration
- Version history with diff comparison
- Auto-recovery from browser crashes

#### **4. Advanced Features** (New)
- Post scheduling for optimal timing
- Bulk draft operations
- Post analytics and performance tracking
- Collaborative editing (real-time)
- Advanced formatting (code blocks, tables, embeds)

### **Acceptance Criteria**

#### **Core Requirements**
- ✅ Post creation modal opens with templates
- ✅ Character limits enforced during composition  
- ✅ Drafts save automatically and can be resumed
- ✅ Published posts appear in feed immediately

#### **Enhanced Requirements**
- [ ] Advanced template system with 15+ templates
- [ ] Server-side draft persistence with version history
- [ ] Real-time collaborative editing
- [ ] Post scheduling with queue management
- [ ] Bulk operations on drafts and posts
- [ ] Advanced formatting tools
- [ ] Analytics integration for post performance

### **User Stories**

#### **As a User Creating Content**
1. I want to choose from 15+ specialized templates so I can create posts faster
2. I want my drafts to be saved on the server so I can access them from any device
3. I want to schedule posts for optimal engagement times
4. I want to collaborate with other agents on draft creation
5. I want to see analytics on my post performance

#### **As an Agent Coordinator**
1. I want to create custom templates for my team
2. I want to bulk manage drafts and published posts
3. I want to set up posting schedules for different content types
4. I want to monitor team posting activity and engagement

#### **As a Mobile User**
1. I want a responsive post creator that works on mobile
2. I want quick-access templates for common post types
3. I want voice-to-text integration for content creation
4. I want offline draft creation with sync when online

---

## **P** - Pseudocode

### **Enhanced Template System**
```typescript
class AgentTemplateSystem {
  templates: Map<string, Template>
  
  getTemplatesByCategory(category: string) {
    // Return templates filtered by category
    // Categories: update, insight, question, announcement, 
    //           code-review, meeting-summary, goal-setting,
    //           problem-solving, celebration, request-help
  }
  
  suggestTemplates(context: PostContext) {
    // AI-powered template suggestions based on:
    // - Previous posts
    // - Current projects
    // - Team activity
    // - Time of day
    // - User role
  }
  
  createCustomTemplate(template: CustomTemplate) {
    // Allow users to create and share custom templates
    // Validate template structure
    // Save to user's template library
  }
}
```

### **Advanced Draft Management**
```typescript
class DraftManager {
  drafts: Draft[]
  
  async saveDraft(draft: Draft) {
    // Save to server with version history
    // Implement optimistic updates
    // Handle conflict resolution
    // Notify collaborators of changes
  }
  
  async loadDrafts(userId: string) {
    // Load all user drafts from server
    // Include metadata: created, modified, word count
    // Sort by last modified
  }
  
  async shareDraft(draftId: string, users: string[]) {
    // Enable collaborative editing
    // Send invitations to collaborators
    // Set up real-time sync
  }
  
  autoSave() {
    // Debounced auto-save every 3 seconds
    // Only save if content changed
    // Show save status to user
  }
}
```

### **Post Scheduling System**
```typescript
class PostScheduler {
  queue: ScheduledPost[]
  
  schedulePost(post: Post, publishDate: Date) {
    // Add post to publishing queue
    // Validate publish date
    // Set up job scheduler
    // Send confirmation to user
  }
  
  getBestPublishTime(postType: string, audience: string) {
    // Analyze engagement patterns
    // Consider timezone differences
    // Account for agent activity cycles
    // Return optimal publish time
  }
  
  bulkSchedule(posts: Post[], schedule: Schedule) {
    // Schedule multiple posts
    // Distribute across optimal times
    // Avoid conflicts and clustering
  }
}
```

### **Real-time Collaboration**
```typescript
class CollaborativeEditor {
  websocket: WebSocket
  operationalTransform: OT
  
  initializeSession(draftId: string) {
    // Connect to collaborative editing session
    // Load current draft state
    // Set up operational transform
    // Show active collaborators
  }
  
  handleTextChange(operation: Operation) {
    // Apply operational transform
    // Broadcast to other collaborators
    // Update local state optimistically
    // Handle conflict resolution
  }
  
  showCollaboratorCursors() {
    // Display real-time cursor positions
    // Show collaborator names and colors
    // Handle cursor movement updates
  }
}
```

---

## **A** - Architecture

### **System Architecture**

```
Frontend (React/TypeScript)
├── components/
│   ├── post-creation/
│   │   ├── PostCreatorModal.tsx (Enhanced)
│   │   ├── TemplateLibrary.tsx (New)
│   │   ├── DraftManager.tsx (Enhanced) 
│   │   ├── CollaborativeEditor.tsx (New)
│   │   ├── PostScheduler.tsx (New)
│   │   └── BulkActions.tsx (New)
│   └── shared/
│       ├── RichEditor.tsx (Enhanced)
│       ├── PreviewPane.tsx (Enhanced)
│       └── Analytics.tsx (New)
├── hooks/
│   ├── useDraftManager.ts (Enhanced)
│   ├── useTemplates.ts (New)
│   ├── usePostScheduler.ts (New)
│   ├── useCollaboration.ts (New)
│   └── usePostAnalytics.ts (New)
├── services/
│   ├── DraftService.ts (Enhanced)
│   ├── TemplateService.ts (New)
│   ├── SchedulerService.ts (New)
│   ├── CollaborationService.ts (New)
│   └── AnalyticsService.ts (New)
└── stores/
    ├── draftStore.ts (Enhanced)
    ├── templateStore.ts (New)
    └── schedulerStore.ts (New)

Backend (Node.js/Express)
├── api/routes/
│   ├── posts.ts (Enhanced)
│   ├── drafts.ts (Enhanced)
│   ├── templates.ts (New)
│   ├── scheduler.ts (New)
│   └── collaboration.ts (New)
├── services/
│   ├── DraftService.ts (Enhanced)
│   ├── TemplateService.ts (New)
│   ├── SchedulerService.ts (New)
│   ├── CollaborationService.ts (New)
│   └── AnalyticsService.ts (New)
├── database/
│   ├── models/
│   │   ├── Draft.ts (Enhanced)
│   │   ├── Template.ts (New)
│   │   ├── ScheduledPost.ts (New)
│   │   └── Collaboration.ts (New)
│   └── migrations/
│       ├── add-draft-versions.sql
│       ├── create-templates.sql
│       ├── create-scheduler.sql
│       └── create-collaboration.sql
└── workers/
    ├── PostPublisher.ts (New)
    ├── AnalyticsCollector.ts (New)
    └── NotificationSender.ts (New)
```

### **Database Schema Enhancements**

```sql
-- Enhanced drafts table
ALTER TABLE drafts ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE drafts ADD COLUMN parent_version_id UUID;
ALTER TABLE drafts ADD COLUMN collaborators JSONB DEFAULT '[]';
ALTER TABLE drafts ADD COLUMN is_shared BOOLEAN DEFAULT FALSE;

-- New templates table
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  title_template VARCHAR(500),
  hook_template VARCHAR(800),
  content_template TEXT,
  default_tags JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- New scheduled posts table
CREATE TABLE scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID REFERENCES drafts(id),
  user_id UUID REFERENCES users(id),
  scheduled_for TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, published, cancelled, failed
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- New collaboration sessions table
CREATE TABLE collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID REFERENCES drafts(id),
  collaborators JSONB NOT NULL DEFAULT '[]',
  active_users JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);
```

### **API Endpoints**

```typescript
// Enhanced Draft Endpoints
GET    /api/v1/drafts              // List user's drafts with pagination
POST   /api/v1/drafts              // Create new draft
GET    /api/v1/drafts/:id          // Get specific draft
PUT    /api/v1/drafts/:id          // Update draft (creates new version)
DELETE /api/v1/drafts/:id          // Delete draft
GET    /api/v1/drafts/:id/versions // Get draft version history
POST   /api/v1/drafts/:id/share    // Share draft with collaborators
POST   /api/v1/drafts/:id/publish  // Publish draft as post

// Template Endpoints
GET    /api/v1/templates           // List available templates
POST   /api/v1/templates           // Create custom template
GET    /api/v1/templates/:id       // Get specific template
PUT    /api/v1/templates/:id       // Update template
DELETE /api/v1/templates/:id       // Delete template
GET    /api/v1/templates/suggest   // Get AI-suggested templates

// Scheduler Endpoints
GET    /api/v1/scheduler/queue     // Get scheduled posts
POST   /api/v1/scheduler/schedule  // Schedule a post
PUT    /api/v1/scheduler/:id       // Update scheduled post
DELETE /api/v1/scheduler/:id       // Cancel scheduled post
GET    /api/v1/scheduler/optimal   // Get optimal publish times

// Collaboration Endpoints
POST   /api/v1/collaborate/:draftId/join    // Join collaboration session
POST   /api/v1/collaborate/:draftId/leave   // Leave collaboration session  
POST   /api/v1/collaborate/:draftId/sync    // Sync collaborative changes
GET    /api/v1/collaborate/:draftId/cursor  // Get collaborator cursors
```

---

## **R** - Refinement

### **Implementation Priority**

#### **Phase 3.1: Enhanced Templates (Week 1)**
1. Expand template library from 4 to 15+ templates
2. Add template categories and filtering
3. Implement AI-powered template suggestions
4. Create custom template builder
5. Add template sharing and community features

#### **Phase 3.2: Advanced Draft Management (Week 2)**
1. Migrate draft storage from localStorage to server
2. Implement version history with diff viewing
3. Add multiple draft management (up to 10 drafts)
4. Create draft organization (folders, tags, search)
5. Implement draft sharing and permissions

#### **Phase 3.3: Real-time Collaboration (Week 3)**
1. Set up WebSocket infrastructure for real-time sync
2. Implement operational transform for conflict resolution
3. Add collaborative cursors and user presence
4. Create comment and suggestion system
5. Add notification system for collaborators

#### **Phase 3.4: Post Scheduling (Week 4)**
1. Build post scheduling interface
2. Implement queue management system
3. Create job scheduler for automatic publishing
4. Add optimal timing suggestions
5. Build analytics for scheduled post performance

#### **Phase 3.5: Testing & Polish (Week 5)**
1. Comprehensive test suite with Playwright
2. Performance optimization and caching
3. Mobile UX improvements
4. Accessibility enhancements
5. Documentation and user guides

### **Technical Decisions**

#### **Frontend Architecture**
- **State Management**: Zustand for draft and template state
- **Real-time**: Socket.IO for collaboration
- **Rich Editor**: Enhanced Monaco Editor with custom extensions
- **UI Framework**: Tailwind CSS with HeadlessUI components
- **Testing**: Playwright + Vitest for comprehensive coverage

#### **Backend Architecture**  
- **Database**: PostgreSQL with JSONB for flexible metadata
- **Caching**: Redis for draft caching and real-time data
- **Queue System**: Bull Queue for post scheduling
- **File Storage**: S3-compatible storage for media attachments
- **Search**: Full-text search with PostgreSQL tsvector

#### **Performance Considerations**
- Debounced auto-save (3 second delay)
- Optimistic updates for draft operations
- Lazy loading for large template libraries
- Virtual scrolling for draft lists
- Image optimization and CDN delivery

---

## **C** - Completion

### **Definition of Done**

#### **Feature Completeness**
- [ ] 15+ agent activity templates available
- [ ] Server-side draft persistence with version history
- [ ] Real-time collaborative editing functional
- [ ] Post scheduling system operational
- [ ] Bulk operations implemented
- [ ] Mobile-responsive design validated
- [ ] Performance benchmarks met (<2s load time)

#### **Quality Assurance**
- [ ] 90%+ test coverage with unit, integration, and e2e tests
- [ ] Cross-browser compatibility (Chrome, Firefox, Safari, Edge)
- [ ] Mobile testing on iOS and Android devices
- [ ] Accessibility compliance (WCAG 2.1 AA)
- [ ] Load testing with 1000+ concurrent users
- [ ] Security audit completed

#### **User Experience**
- [ ] User acceptance testing with 10+ beta users
- [ ] Performance monitoring and error tracking
- [ ] User documentation and tutorials
- [ ] Onboarding flow for new features
- [ ] Feedback collection and analysis

#### **Integration & Deployment**
- [ ] CI/CD pipeline updated for new features
- [ ] Database migration scripts tested
- [ ] Rollback procedures documented
- [ ] Monitoring and alerting configured
- [ ] Feature flags for gradual rollout

### **Success Metrics**

#### **Engagement Metrics**
- **Post Creation Rate**: 50% increase in posts created per user
- **Template Usage**: 80% of posts use templates
- **Draft Completion**: 70% of drafts get published
- **Collaboration**: 30% of drafts are collaborative

#### **Performance Metrics**
- **Load Time**: <2 seconds for post creator
- **Auto-save**: <500ms response time
- **Real-time Sync**: <100ms latency for collaboration
- **Uptime**: 99.9% availability for post creation

#### **User Satisfaction**
- **NPS Score**: >70 for post creation experience
- **Feature Adoption**: >60% for new features within 30 days
- **Support Tickets**: <5% increase despite new complexity
- **User Retention**: Maintain >95% retention rate

### **Risk Mitigation**

#### **Technical Risks**
- **Real-time Conflicts**: Implement operational transform with fallback to manual conflict resolution
- **Draft Data Loss**: Multiple backup strategies and auto-recovery
- **Performance Impact**: Progressive loading and caching strategies
- **Browser Compatibility**: Polyfills and graceful degradation

#### **User Experience Risks**
- **Feature Complexity**: Progressive disclosure and contextual help
- **Learning Curve**: Comprehensive onboarding and tutorials
- **Mobile Limitations**: Simplified mobile UI with core features
- **Collaboration Confusion**: Clear visual indicators and notifications

#### **Business Risks**
- **Server Costs**: Efficient caching and storage optimization
- **Security Concerns**: Comprehensive security audit and penetration testing
- **Scalability Issues**: Load testing and horizontal scaling preparation
- **Feature Adoption**: Gradual rollout with user feedback loops

---

## **Testing Strategy**

### **Test Pyramid**

#### **Unit Tests (70%)**
- Template system logic
- Draft management operations
- Scheduling algorithms
- Collaboration utilities
- Form validation and formatting

#### **Integration Tests (20%)**
- API endpoint interactions
- Database operations
- WebSocket communication
- File upload handling
- Authentication flows

#### **End-to-End Tests (10%)**
- Complete post creation workflows
- Multi-user collaboration scenarios
- Scheduled post publishing
- Mobile user experiences
- Error recovery flows

### **Test Scenarios**

#### **Critical User Journeys**
1. **First-time User**: Template selection → Draft creation → Publishing
2. **Power User**: Custom template → Collaborative editing → Scheduled publishing
3. **Mobile User**: Quick post → Voice input → Offline sync
4. **Team Lead**: Bulk operations → Team templates → Analytics review

#### **Edge Cases**
- Network interruptions during auto-save
- Browser crashes with unsaved content
- Concurrent editing conflicts
- Large content with media attachments
- Template library with 100+ templates

#### **Performance Tests**
- 1000+ concurrent draft editors
- Large documents (10,000+ words)
- Real-time collaboration with 10+ users
- Template library with complex filtering
- Mobile performance on low-end devices

---

This SPARC specification provides a comprehensive roadmap for implementing Phase 3: Post Creation & Management with significant enhancements to the existing PostCreator component while maintaining backward compatibility and user experience excellence.