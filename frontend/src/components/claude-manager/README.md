# Claude Instance Manager - Modern UI Components

This directory contains the modernized UI components for the Claude Instance Manager, featuring professional styling, chat-style interface, and enhanced user experience.

## Components Overview

### 1. ClaudeInstanceButtons.tsx
**Professional instance launch buttons**
- 4 button variants: prod/claude, skip-permissions, skip-permissions -c, skip-permissions --resume
- Professional gradient styling with hover effects and animations
- Connection status indicators and loading states
- Responsive grid layout
- Icons and descriptive text for each launch option

**Features:**
- Hover animations with scale and shadow effects
- Connection status badges
- Loading indicators with bouncing dots
- Professional color schemes matching Claudable design
- Disabled states with proper visual feedback

### 2. ChatInterface.tsx
**Main chat container component**
- Modern chat-style interface replacing terminal output
- Instance selection and status display
- Connection status monitoring
- Error handling and display
- Responsive layout with proper spacing

**Features:**
- Instance header with status indicators
- Connection status badges (SSE/Polling/Error)
- Empty state with helpful messaging
- Integration with MessageList and MessageInput
- Real-time instance status updates

### 3. MessageList.tsx
**Chat bubble message display**
- Parses terminal output into structured messages
- Chat bubble styling for different message types
- Auto-scroll functionality
- Typing indicators and animations
- System message handling

**Features:**
- User/Assistant/System message types
- Professional chat bubble styling
- Smooth animations on message appearance
- Auto-scroll to new messages
- Error message highlighting
- Timestamps and message grouping

### 4. MessageInput.tsx
**Professional input field with auto-resize**
- Auto-resizing textarea (1-6 lines)
- Keyboard shortcuts (Enter to send, Shift+Enter for new line)
- Character count and limits
- Loading states and disabled handling
- Professional styling matching Claudable

**Features:**
- Auto-resize based on content
- Keyboard shortcut indicators
- Character limit warnings
- Send button with loading states
- Comprehensive disabled states
- Help text and usage hints

## Updated Main Component

### ClaudeInstanceManagerModern.tsx
**Complete modernized manager**
- Integrates all new components
- Preserves ALL existing functionality
- Enhanced error handling and user feedback
- Professional layout with proper spacing
- Responsive design patterns

## Integration

### Preserved Functionality
✅ All 4 button types and their onClick handlers
✅ SSE streaming integration with useHTTPSSE hook
✅ Instance creation, selection, and termination
✅ Real-time output streaming and display
✅ Connection status monitoring
✅ Error handling and display
✅ Input validation and sending
✅ Instance status updates
✅ Auto-scroll and message handling

### Enhanced Features
✨ Professional chat-style interface
✨ Modern component architecture
✨ Improved accessibility and responsive design
✨ Better error states and loading indicators
✨ Smooth animations and micro-interactions
✨ Professional color schemes and typography
✨ Connection status badges and indicators
✨ Auto-resizing input fields
✨ Keyboard shortcuts and usability improvements

## Usage Example

```tsx
import React from 'react';
import ClaudeInstanceManagerModern from './components/ClaudeInstanceManagerModern';

function App() {
  return (
    <div className="App">
      <ClaudeInstanceManagerModern 
        apiUrl="http://localhost:3000" 
      />
    </div>
  );
}
```

### Individual Component Usage

```tsx
import { 
  ClaudeInstanceButtons, 
  ChatInterface, 
  MessageList, 
  MessageInput 
} from './components/claude-manager';

// Use components individually
<ClaudeInstanceButtons 
  onCreateInstance={handleCreate} 
  loading={false}
  connectionStatuses={{ 'prod': 'connected' }}
/>

<ChatInterface
  selectedInstance={instance}
  output={output}
  connectionType="SSE Connected"
  isConnected={true}
  onSendInput={handleInput}
  onInstanceSelect={handleSelect}
  instances={instances}
/>
```

## Styling

Components use Tailwind CSS with:
- Professional color palettes
- Smooth transitions and animations
- Responsive breakpoints
- Dark mode support
- Accessibility-compliant contrast ratios
- Modern design patterns matching Claudable

## API Compatibility

All components maintain 100% API compatibility with the existing:
- `useHTTPSSE` hook
- Backend SSE endpoints
- Instance creation/management APIs
- Terminal input/output handling
- Connection status events

## Testing

Run the integration test component:
```tsx
import IntegrationTest from './components/claude-manager/IntegrationTest';
```

This component provides a comprehensive test of all components working together with sample data and interactions.