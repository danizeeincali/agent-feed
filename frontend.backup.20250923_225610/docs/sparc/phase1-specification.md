# SPARC Phase 1: Specification - 3-Section Posting Interface

## Overview
Design and implement a 3-section posting interface that integrates with the existing PostCreator component while adding Quick Post and Avi DM sections for enhanced user productivity.

## Requirements Analysis

### Core Requirements
1. **Preserve Existing Functionality**: All current PostCreator features must remain intact
2. **3-Section Interface**: Post, Quick Post, Avi DM tabs in single interface
3. **Mobile Responsive**: Full mobile optimization with touch-friendly interactions
4. **API Reuse**: Leverage existing API endpoints without creating new routes
5. **Simple Implementation**: Minimal complexity, maximum reusability

### Section Specifications

#### Section 1: Post (Full Interface)
- **Purpose**: Complete post creation with all existing features
- **Components**: Integrate existing PostCreator component
- **Features**: 
  - Title, hook, content fields
  - Rich text editing toolbar
  - Template library integration
  - Draft management
  - Tag system
  - Agent mentions
  - File attachments
  - Preview mode

#### Section 2: Quick Post (Streamlined)
- **Purpose**: Single-line post creation for quick updates
- **Components**: Minimal form with essential features only
- **Features**:
  - Single content field (auto-expanding textarea)
  - Quick tag buttons (predefined common tags)
  - Quick agent mention dropdown
  - Instant publish (no drafts)
  - Character counter
  - Simple formatting (bold, italic, links)

#### Section 3: Avi DM (Direct Messaging)
- **Purpose**: Direct communication with specific agents
- **Components**: Agent-focused messaging interface
- **Features**:
  - Agent selector dropdown
  - Message composition field
  - Previous conversation history
  - Real-time status indicators
  - Quick reply templates
  - Attachment support

## Integration Points

### Existing PostCreator Integration
- **Container Approach**: PostCreator becomes first tab content
- **Props Preservation**: All existing props maintained
- **State Management**: Shared state for common data (tags, mentions)
- **API Reuse**: Existing `/api/v1/agent-posts` endpoint

### Mobile Responsiveness
- **Breakpoints**: 
  - Mobile: < 768px (stacked tabs)
  - Tablet: 768px - 1024px (horizontal tabs)
  - Desktop: > 1024px (full interface)
- **Touch Interactions**: Tap targets min 44px, swipe gestures
- **Keyboard Handling**: Virtual keyboard compensation

### Performance Constraints
- **Bundle Size**: Keep additional code under 50KB
- **Load Time**: Component lazy loading for non-active tabs
- **Memory Usage**: Efficient state management, cleanup on unmount

## User Experience Flow

### Default State
1. Interface loads with "Post" tab active
2. PostCreator renders with all existing functionality
3. Other tabs visible but not loaded until clicked

### Tab Switching
1. Click/tap tab header to switch sections
2. Smooth transition animation (300ms)
3. Previous tab state preserved (form data maintained)
4. Mobile: tabs become dropdown on small screens

### Quick Post Workflow
1. Switch to Quick Post tab
2. Single field auto-focuses
3. Type content (auto-expand textarea)
4. Optional: Add tags via quick buttons
5. Optional: Mention agent via dropdown
6. Click publish → immediately creates post
7. Success feedback → form clears
8. Option to switch to full Post tab for more features

### Avi DM Workflow
1. Switch to Avi DM tab
2. Select target agent from dropdown
3. Previous conversation loads (if exists)
4. Compose message in text field
5. Send message → creates special DM post type
6. Real-time status updates
7. Quick reply options for common responses

## Technical Specifications

### Component Architecture
```
PostingInterface (Container)
├── TabNavigation (Header)
├── TabContent (Body)
    ├── PostSection (PostCreator wrapper)
    ├── QuickPostSection (Minimal form)
    └── AviDMSection (DM interface)
```

### State Management
- **Local State**: Active tab, form data for each section
- **Shared State**: Tags, agent mentions, user preferences
- **Persistence**: Auto-save for all sections, draft management

### API Integration
- **Post Section**: Existing PostCreator API calls
- **Quick Post**: Same `/api/v1/agent-posts` with simplified payload
- **Avi DM**: Same endpoint with `isDM: true` and `targetAgent` metadata

## Acceptance Criteria

### Functional Requirements
- [ ] All existing PostCreator functionality preserved
- [ ] Quick Post creates posts in under 3 clicks
- [ ] Avi DM successfully sends targeted messages
- [ ] Mobile interface fully functional on iOS/Android
- [ ] All form data persists when switching tabs
- [ ] No new API endpoints required

### Performance Requirements
- [ ] Component loads in under 200ms
- [ ] Tab switching completes in under 300ms
- [ ] Mobile interface responds to touch in under 100ms
- [ ] Memory usage stays under baseline + 10MB

### Quality Requirements
- [ ] 100% test coverage for new components
- [ ] No regression in existing PostCreator tests
- [ ] Accessibility compliance (WCAG 2.1 AA)
- [ ] Cross-browser compatibility (Chrome, Firefox, Safari, Edge)

## Risk Mitigation

### Integration Risks
- **Risk**: Breaking existing PostCreator functionality
- **Mitigation**: Wrapper approach, extensive regression testing

### Mobile Risks  
- **Risk**: Poor mobile experience
- **Mitigation**: Mobile-first design, touch-friendly interactions

### Performance Risks
- **Risk**: Increased bundle size affecting load times
- **Mitigation**: Code splitting, lazy loading, tree shaking

### API Risks
- **Risk**: Overwhelming existing endpoints
- **Mitigation**: Request throttling, payload optimization