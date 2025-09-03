# Feature Migration Checklist: `/claude-instances` → `/interactive-control`

## Overview
Complete feature list for migrating from the legacy claude-instances page to the new SSE-based interactive-control interface.

## 📋 Complete Feature Migration List

### 🔧 **Core Instance Management**
- [ ] **1. Create Claude Instances** (Interactive & Worker types)
- [ ] **2. Delete/Terminate Instances** 
- [x] **3. Instance List Display** with type badges ✅ **FIXED 2025-09-02**
- [ ] **4. Real-time Status Updates** (running/stopped/error)
- [ ] **5. PID Display** and tracking
- [ ] **6. Instance Filtering** (All/Interactive/Worker/Feed)

### 🔗 **Connection Management**  
- [ ] **7. Connect to Instances** (individual instance connection)
- [ ] **8. Disconnect from Instances** 
- [ ] **9. Single Active Connection** enforcement
- [ ] **10. Connection State Indicators** (connected/disconnected/connecting)
- [ ] **11. WebSocket Connection Health** monitoring
- [ ] **12. Auto-reconnection** on connection loss

### 💬 **Interactive Features**
- [ ] **13. Dual Mode Interface** (Chat + Terminal views)
- [ ] **14. Send Commands/Messages** to Claude instances
- [ ] **15. Real-time Output Streaming** (SSE-based)
- [ ] **16. Terminal Command History**
- [ ] **17. Chat Message History**
- [ ] **18. Copy/Export Output** functionality

### 📸 **Advanced Features**
- [ ] **19. Image Upload Support** (drag & drop)
- [ ] **20. File Attachment** handling
- [ ] **21. Quick Launch Templates** (predefined commands)
- [ ] **22. Performance Metrics** (response time, tokens used)
- [ ] **23. Output Download/Export**
- [ ] **24. Settings/Configuration** panel

### 📊 **Monitoring & Status**
- [ ] **25. Instance Health Monitoring**
- [ ] **26. Real-time Performance Stats**
- [ ] **27. Error Display & Handling**
- [ ] **28. Activity Indicators**
- [ ] **29. Connection Quality Monitoring**
- [ ] **30. Resource Usage Display**

## 🏗️ Architecture Details

### Source Components
- **Legacy**: `/claude-instances` → `SafeClaudeInstanceManager.tsx`
- **Target**: `/interactive-control` → `EnhancedSSEInterface.tsx`

### Key Dependencies
- `useSSEClaudeInstance` hook for SSE connections
- `ClaudeInstanceManager` for WebSocket connections  
- `useSingleConnectionManager` for connection state
- `ClaudeServiceManager` for instance management

### Fixed Issues
- **2025-09-02**: Fixed worker instance type badges not displaying (green pills for worker instances)

## 📝 Testing Protocol

### For Each Feature Group:
1. **Test Current State** - Verify what works vs. what's broken
2. **Identify Gaps** - Compare with legacy implementation  
3. **Fix Implementation** - Update code to match requirements
4. **Verify Integration** - Test end-to-end functionality
5. **Update Checklist** - Mark as completed ✅

### Priority Order (User Directed):
- TBD - User will specify which feature groups to test first

## 🔧 Implementation Notes

### Component Structure
```
/interactive-control
├── EnhancedSSEInterface.tsx (main component)
├── ClaudeInstanceManagerComponent.tsx (instance table)
├── ClaudeServiceManagerComponent.tsx (grid view) ✅ FIXED
└── Supporting UI components (tabs, cards, buttons)
```

### API Endpoints
- `GET /api/claude/instances` - List instances
- `POST /api/claude/instances` - Create instance  
- `DELETE /api/claude/instances/{id}` - Terminate instance
- `POST /api/claude/instances/{id}/terminal/input` - Send input
- `GET /api/claude/instances/{id}/terminal/stream` - SSE stream

### Styling
- `claude-manager.css` - Main component styles
- `instance-table.css` - Table-specific styles ✅ UPDATED

## 🎯 Next Actions
1. User specifies priority feature groups to test
2. Systematic testing and fixing of each feature
3. Integration testing across the full interface
4. Performance optimization and error handling
5. Final migration completion

---
**Last Updated**: 2025-09-02  
**Status**: Ready for user-directed testing phase