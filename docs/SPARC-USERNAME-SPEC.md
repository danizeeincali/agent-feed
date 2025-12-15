# SPARC Specification: Username Collection System

**Project**: Agent Feed - Get-to-Know-You Agent Username Collection
**Version**: 1.0.0
**Date**: 2025-10-26
**Status**: Specification Phase
**Priority**: P0 (Critical - First Onboarding Step)

---

## Executive Summary

This specification defines the username collection system as the **FIRST** onboarding step in the get-to-know-you-agent workflow. The system captures and persists a user's display name before any other onboarding activities, ensuring personalized interaction throughout the entire agent ecosystem from the very beginning.

**Key Objectives:**
1. Capture username as the absolute first step in onboarding
2. Store username persistently in user settings/profile
3. Display username consistently across all agent interactions
4. Validate username for security and usability
5. Enable username updates post-onboarding

---

## 1. Functional Requirements

### FR-001: Initial Username Collection (CRITICAL)
**Priority**: P0
**Description**: System SHALL collect username as the first interaction in get-to-know-you-agent onboarding flow, before any other profile information.

**Acceptance Criteria:**
- Username prompt appears immediately upon agent invocation for new users
- No other onboarding questions appear until username is provided
- Username is required (cannot be skipped)
- User receives friendly, welcoming prompt for username
- System handles empty/whitespace-only submissions gracefully

**User Story:**
```
As a new user launching the agent feed for the first time,
I want to be asked for my preferred name immediately,
So that all subsequent interactions feel personal and welcoming.
```

**Conversation Flow:**
```
Agent: "Welcome! I'm your Get-to-Know-You Agent. Before we begin, I'd love to know - what should I call you? (This is just for how we'll address you throughout the system)"

User: [provides name]

Agent: "Great to meet you, [NAME]! Now let's get to know each other better..."
```

---

### FR-002: Username Storage and Persistence
**Priority**: P0
**Description**: System SHALL store username in user settings with cross-session persistence.

**Acceptance Criteria:**
- Username stored in `users` table `settings` JSONB field
- Username accessible via `settings.display_name` key
- Username persists across browser sessions
- Username survives Docker container updates (persistent volume)
- Username available to all agents via user context

**Data Storage:**
```json
// users.settings JSONB structure
{
  "display_name": "John",
  "onboarding": {
    "username_set_at": "2025-10-26T10:30:00Z",
    "username_updated_at": null,
    "step": "username_collected"
  },
  "preferences": {}
}
```

---

### FR-003: Username Display Throughout System
**Priority**: P0
**Description**: System SHALL display username in all relevant UI components and agent interactions.

**Acceptance Criteria:**
- Username appears in agent post greetings
- Username displayed in navigation/header when logged in
- Username used in all personalized agent messages
- Username shown in user profile sections
- Fallback to email/user ID if display_name not set

**Display Locations:**
1. **Agent Posts**: "Welcome back, [NAME]!" or "Hi [NAME], here's your update..."
2. **Navigation Header**: "[NAME]'s Feed" or "Welcome, [NAME]"
3. **Agent Responses**: All agent messages personalized with name
4. **Onboarding Completion Post**: "Welcome [NAME] - Your AI Team is Ready!"
5. **Lambda-vi Interactions**: "Hi [NAME], I'm Λvi, your chief of staff..."

---

### FR-004: Username Validation
**Priority**: P1
**Description**: System SHALL validate username input for security, usability, and data integrity.

**Acceptance Criteria:**
- Minimum length: 1 character (after trim)
- Maximum length: 50 characters
- Allowed characters: letters, numbers, spaces, hyphens, apostrophes, periods
- No profanity or offensive content (basic filter)
- No XSS attack vectors (sanitization)
- Leading/trailing whitespace automatically trimmed

**Validation Rules:**
```javascript
const USERNAME_VALIDATION = {
  minLength: 1,
  maxLength: 50,
  pattern: /^[a-zA-Z0-9\s\-'.]+$/,
  sanitize: true,
  trim: true,
  profanityFilter: true
};
```

**Error Messages:**
- Empty: "Please enter a name so we can personalize your experience"
- Too long: "Please use a shorter name (maximum 50 characters)"
- Invalid characters: "Please use only letters, numbers, spaces, and basic punctuation"
- Profanity detected: "Please choose a different name"

---

### FR-005: Username Update Capability
**Priority**: P2
**Description**: System SHALL allow users to update their display name post-onboarding.

**Acceptance Criteria:**
- User can access settings/profile page to update name
- Username update triggers re-validation
- Update timestamp recorded in settings
- Change reflected immediately across all UI components
- Optional: Change history maintained for audit trail

**API Endpoint:**
```
PATCH /api/users/:userId/settings
{
  "display_name": "New Name"
}
```

---

## 2. Non-Functional Requirements

### NFR-001: Performance
**Category**: Performance
**Description**: Username operations SHALL complete within acceptable latency thresholds.

**Metrics:**
- Username save operation: < 200ms (p95)
- Username retrieval: < 50ms (p95)
- Validation: < 10ms (synchronous)
- Database query time: < 100ms (p95)

**Measurement:** API response time metrics, database query logging

---

### NFR-002: Security
**Category**: Security
**Description**: Username handling SHALL prevent injection attacks and protect user privacy.

**Requirements:**
- XSS protection: Sanitize all username inputs before storage
- SQL injection: Use parameterized queries for all database operations
- NoSQL injection: Validate JSONB structure before updates
- Privacy: Username not exposed in public URLs or logs
- Audit trail: Track username changes with timestamps

**Validation:**
- OWASP XSS prevention patterns applied
- Input sanitization with DOMPurify or equivalent
- Parameterized queries only (no string concatenation)
- Security audit checklist verification

---

### NFR-003: Usability
**Category**: User Experience
**Description**: Username collection SHALL provide intuitive, friendly, and accessible experience.

**Requirements:**
- WCAG 2.1 AA compliance for input field
- Clear, friendly prompt text
- Real-time validation feedback
- Mobile-responsive input design
- Screen reader compatible
- Keyboard navigation support (Tab, Enter to submit)

**Success Criteria:**
- 95%+ users complete username entry on first attempt
- < 5% error rate during username submission
- Average completion time < 15 seconds

---

### NFR-004: Data Integrity
**Category**: Reliability
**Description**: Username data SHALL maintain integrity across system operations.

**Requirements:**
- ACID compliance for database operations
- Atomic username updates (no partial writes)
- Consistent read-after-write behavior
- Transaction rollback on validation failure
- Backup and recovery procedures

---

## 3. Database Schema Requirements

### Schema Addition: user_settings Enhancement

**Table**: `users`
**Column**: `settings` (existing JSONB column)
**Enhancement**: Add standardized structure for display_name

#### Current Schema (users table):
```sql
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,  -- Full name from auth
    role VARCHAR(100),
    department VARCHAR(100),
    team VARCHAR(100),
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',  -- USERNAME STORED HERE
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Settings JSONB Structure:
```json
{
  "display_name": "string (1-50 chars)",
  "onboarding": {
    "username_set_at": "ISO 8601 timestamp",
    "username_updated_at": "ISO 8601 timestamp | null",
    "username_change_count": "integer",
    "step": "string (onboarding progress)"
  },
  "preferences": {
    "show_full_name": "boolean (default: false)",
    "name_visibility": "string (public|team|private)"
  }
}
```

#### Required Indexes:
```sql
-- Already exists - GIN index on settings JSONB
CREATE INDEX IF NOT EXISTS idx_users_settings ON users USING GIN (settings);

-- Additional index for display_name lookup (if needed)
CREATE INDEX IF NOT EXISTS idx_users_display_name
  ON users ((settings->>'display_name'));
```

#### Migration Script (Optional Enhancement):
```sql
-- Add validation function for display_name
CREATE OR REPLACE FUNCTION validate_display_name(name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        name IS NOT NULL AND
        LENGTH(TRIM(name)) >= 1 AND
        LENGTH(TRIM(name)) <= 50 AND
        name ~ '^[a-zA-Z0-9\s\-''.]+$'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add constraint (optional - can be done in application layer)
ALTER TABLE users ADD CONSTRAINT check_display_name
  CHECK (
    settings->>'display_name' IS NULL OR
    validate_display_name(settings->>'display_name')
  );
```

---

## 4. API Endpoint Specifications

### 4.1 Store Username (Initial Collection)

**Endpoint**: `PATCH /api/users/:userId/settings`
**Method**: PATCH
**Authentication**: Required
**Rate Limit**: 10 requests/minute

#### Request:
```http
PATCH /api/users/550e8400-e29b-41d4-a716-446655440000/settings HTTP/1.1
Content-Type: application/json
Authorization: Bearer <token>

{
  "display_name": "John"
}
```

#### Response (Success):
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "settings": {
      "display_name": "John",
      "onboarding": {
        "username_set_at": "2025-10-26T10:30:00Z",
        "username_updated_at": null,
        "step": "username_collected"
      }
    },
    "updated_at": "2025-10-26T10:30:00Z"
  },
  "message": "Display name saved successfully"
}
```

#### Response (Validation Error):
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid display name",
    "details": {
      "field": "display_name",
      "value": "!!!",
      "reason": "Contains invalid characters. Please use only letters, numbers, spaces, and basic punctuation."
    }
  }
}
```

#### Response (Empty Name):
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Display name is required",
    "details": {
      "field": "display_name",
      "reason": "Please enter a name so we can personalize your experience"
    }
  }
}
```

---

### 4.2 Retrieve User Settings (Including Username)

**Endpoint**: `GET /api/users/:userId/settings`
**Method**: GET
**Authentication**: Required
**Caching**: 5 minutes (client-side)

#### Request:
```http
GET /api/users/550e8400-e29b-41d4-a716-446655440000/settings HTTP/1.1
Authorization: Bearer <token>
```

#### Response:
```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: private, max-age=300

{
  "success": true,
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "settings": {
      "display_name": "John",
      "onboarding": {
        "username_set_at": "2025-10-26T10:30:00Z",
        "username_updated_at": null,
        "step": "personal_context_discovery"
      },
      "preferences": {
        "show_full_name": false,
        "name_visibility": "public"
      }
    }
  }
}
```

---

### 4.3 Update Username (Post-Onboarding)

**Endpoint**: `PATCH /api/users/:userId/settings`
**Method**: PATCH
**Authentication**: Required
**Same as 4.1, but with additional tracking**

#### Request:
```http
PATCH /api/users/550e8400-e29b-41d4-a716-446655440000/settings HTTP/1.1
Content-Type: application/json
Authorization: Bearer <token>

{
  "display_name": "Johnny"
}
```

#### Response:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "settings": {
      "display_name": "Johnny",
      "onboarding": {
        "username_set_at": "2025-10-26T10:30:00Z",
        "username_updated_at": "2025-10-26T14:45:00Z",
        "username_change_count": 1
      }
    },
    "previous_display_name": "John",
    "updated_at": "2025-10-26T14:45:00Z"
  },
  "message": "Display name updated successfully"
}
```

---

### 4.4 Validate Username (Pre-Submit Check)

**Endpoint**: `POST /api/validation/display-name`
**Method**: POST
**Authentication**: Optional (for better UX)
**Rate Limit**: 20 requests/minute

#### Request:
```http
POST /api/validation/display-name HTTP/1.1
Content-Type: application/json

{
  "display_name": "John123"
}
```

#### Response (Valid):
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "valid": true,
  "sanitized": "John123",
  "suggestions": []
}
```

#### Response (Invalid):
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "valid": false,
  "sanitized": "",
  "errors": [
    {
      "field": "display_name",
      "message": "Contains invalid characters",
      "code": "INVALID_CHARACTERS"
    }
  ],
  "suggestions": []
}
```

---

## 5. Frontend Integration Requirements

### 5.1 Onboarding Flow Integration

**Component**: `OnboardingWizard` or `GetToKnowYouAgent`
**Location**: `/frontend/src/components/onboarding/`

#### Step Sequence:
```
Step 0: Username Collection (NEW - FIRST STEP)
  ↓
Step 1: Welcome and Lambda-vi Introduction
  ↓
Step 2: Personal Context Discovery
  ↓
Step 3: Agent Ecosystem Configuration
  ↓
Step 4: First Experience Creation
```

#### Username Collection Component:
```jsx
// UsernameStep.jsx
import { useState } from 'react';
import { validateDisplayName, saveDisplayName } from '@/api/user-settings';

export function UsernameStep({ userId, onComplete }) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsValidating(true);

    try {
      // Real-time validation
      const validation = await validateDisplayName(username);

      if (!validation.valid) {
        setError(validation.errors[0].message);
        setIsValidating(false);
        return;
      }

      // Save username
      await saveDisplayName(userId, validation.sanitized);

      // Proceed to next onboarding step
      onComplete(validation.sanitized);

    } catch (err) {
      setError('Failed to save your name. Please try again.');
      setIsValidating(false);
    }
  };

  return (
    <div className="username-step">
      <h2>Welcome! What should we call you?</h2>
      <p className="subtitle">
        This is how we'll address you throughout the system
      </p>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Your preferred name"
          maxLength={50}
          autoFocus
          aria-label="Your preferred name"
          aria-required="true"
          aria-invalid={!!error}
        />

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!username.trim() || isValidating}
        >
          {isValidating ? 'Saving...' : 'Continue'}
        </button>
      </form>
    </div>
  );
}
```

---

### 5.2 Display Name Usage in UI

#### Header/Navigation Component:
```jsx
// AppHeader.jsx
import { useUserSettings } from '@/hooks/useUserSettings';

export function AppHeader() {
  const { settings, loading } = useUserSettings();

  const displayName = settings?.display_name || 'User';

  return (
    <header>
      <nav>
        <h1>{displayName}'s Feed</h1>
        {/* ... rest of navigation */}
      </nav>
    </header>
  );
}
```

#### Agent Post Greeting:
```jsx
// AgentPost.jsx
import { useUserSettings } from '@/hooks/useUserSettings';

export function AgentPost({ post }) {
  const { settings } = useUserSettings();
  const displayName = settings?.display_name;

  // Personalize greeting if display name available
  const greeting = displayName
    ? `Hi ${displayName}, ${post.content}`
    : post.content;

  return (
    <article className="agent-post">
      <p>{greeting}</p>
    </article>
  );
}
```

---

### 5.3 Settings/Profile Page

**Component**: `UserProfileSettings`
**Location**: `/frontend/src/pages/settings/profile.jsx`

```jsx
// ProfileSettings.jsx
export function ProfileSettings() {
  const { settings, updateSettings, loading } = useUserSettings();
  const [displayName, setDisplayName] = useState(settings?.display_name || '');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleUpdate = async () => {
    try {
      await updateSettings({ display_name: displayName });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="profile-settings">
      <h2>Display Name</h2>
      <p>This is how we'll address you throughout the system</p>

      <input
        type="text"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        maxLength={50}
      />

      {error && <div className="error">{error}</div>}
      {success && <div className="success">Name updated successfully!</div>}

      <button onClick={handleUpdate} disabled={loading}>
        Update Name
      </button>

      <div className="metadata">
        <small>
          Set on: {new Date(settings?.onboarding?.username_set_at).toLocaleDateString()}
        </small>
        {settings?.onboarding?.username_updated_at && (
          <small>
            Last updated: {new Date(settings.onboarding.username_updated_at).toLocaleDateString()}
          </small>
        )}
      </div>
    </section>
  );
}
```

---

## 6. Validation Rules

### 6.1 Input Validation

**Rule Set**: `USERNAME_VALIDATION`

| Rule | Value | Description |
|------|-------|-------------|
| Required | `true` | Username cannot be empty |
| Min Length | `1` | At least 1 character (after trim) |
| Max Length | `50` | Maximum 50 characters |
| Pattern | `/^[a-zA-Z0-9\s\-'.]+$/` | Letters, numbers, spaces, hyphens, apostrophes, periods only |
| Trim | `true` | Remove leading/trailing whitespace |
| Sanitize | `true` | Remove HTML/script tags |
| Profanity Filter | `enabled` | Basic profanity detection |

#### Validation Implementation:
```javascript
// validation/username.js
export function validateUsername(input) {
  const errors = [];

  // Trim input
  const trimmed = input.trim();

  // Required check
  if (!trimmed) {
    errors.push({
      field: 'display_name',
      code: 'REQUIRED',
      message: 'Please enter a name so we can personalize your experience'
    });
    return { valid: false, errors, sanitized: '' };
  }

  // Length validation
  if (trimmed.length < 1) {
    errors.push({
      field: 'display_name',
      code: 'TOO_SHORT',
      message: 'Name must be at least 1 character'
    });
  }

  if (trimmed.length > 50) {
    errors.push({
      field: 'display_name',
      code: 'TOO_LONG',
      message: 'Please use a shorter name (maximum 50 characters)'
    });
  }

  // Pattern validation
  const pattern = /^[a-zA-Z0-9\s\-'.]+$/;
  if (!pattern.test(trimmed)) {
    errors.push({
      field: 'display_name',
      code: 'INVALID_CHARACTERS',
      message: 'Please use only letters, numbers, spaces, and basic punctuation'
    });
  }

  // Sanitization (XSS prevention)
  const sanitized = sanitizeHtml(trimmed, {
    allowedTags: [],
    allowedAttributes: {}
  });

  // Profanity filter
  if (containsProfanity(sanitized)) {
    errors.push({
      field: 'display_name',
      code: 'PROFANITY_DETECTED',
      message: 'Please choose a different name'
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitized : ''
  };
}
```

---

### 6.2 Security Validation

**XSS Prevention:**
```javascript
// Sanitize HTML before storage
import DOMPurify from 'dompurify';

function sanitizeUsername(input) {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
}
```

**SQL Injection Prevention:**
```javascript
// Use parameterized queries only
async function saveUsername(userId, displayName) {
  // ✅ CORRECT - Parameterized query
  await db.query(
    `UPDATE users
     SET settings = jsonb_set(settings, '{display_name}', $2, true),
         updated_at = NOW()
     WHERE id = $1`,
    [userId, JSON.stringify(displayName)]
  );

  // ❌ WRONG - String concatenation (vulnerable)
  // await db.query(`UPDATE users SET settings = '${displayName}'`);
}
```

---

## 7. Edge Cases and Error Handling

### 7.1 Edge Cases

| Case | Handling | Example |
|------|----------|---------|
| Empty string | Validation error | `""` → "Please enter a name" |
| Whitespace only | Validation error | `"   "` → "Please enter a name" |
| Unicode characters | Allow basic, reject emojis | `"José"` ✅, `"🎉"` ❌ |
| Very long name | Truncate + error | `"A"*100` → "Maximum 50 characters" |
| Special characters | Validate pattern | `"<script>"` → "Invalid characters" |
| Duplicate spaces | Normalize | `"John  Doe"` → `"John Doe"` |
| Leading/trailing spaces | Auto-trim | `" John "` → `"John"` |
| Mixed case | Preserve | `"JoHn"` → `"JoHn"` (keep as-is) |
| Numbers only | Allow | `"123"` ✅ |
| Single character | Allow | `"J"` ✅ |

---

### 7.2 Error Handling Scenarios

#### Scenario 1: Database Connection Failure
```javascript
try {
  await saveUsername(userId, displayName);
} catch (err) {
  if (err.code === 'CONNECTION_ERROR') {
    return {
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Unable to save your name right now. Please try again in a moment.',
        retryable: true
      }
    };
  }
}
```

#### Scenario 2: Concurrent Update Conflict
```javascript
// Use optimistic locking with version check
UPDATE users
SET settings = jsonb_set(settings, '{display_name}', $2, true),
    updated_at = NOW(),
    version = version + 1
WHERE id = $1 AND version = $3
RETURNING *;

// If rowCount = 0, another update occurred
if (result.rowCount === 0) {
  throw new ConflictError('Settings were updated by another process. Please refresh and try again.');
}
```

#### Scenario 3: User Not Found
```javascript
if (!user) {
  return {
    success: false,
    error: {
      code: 'USER_NOT_FOUND',
      message: 'User account not found',
      statusCode: 404
    }
  };
}
```

#### Scenario 4: Rate Limit Exceeded
```javascript
if (rateLimitExceeded(userId)) {
  return {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please wait a moment before trying again.',
      retryAfter: 60 // seconds
    }
  };
}
```

---

### 7.3 Fallback Behavior

**When display_name not set:**
```javascript
function getDisplayName(user) {
  return (
    user.settings?.display_name ||  // Primary
    user.name ||                    // Fallback to full name
    user.email.split('@')[0] ||     // Fallback to email prefix
    'User'                          // Ultimate fallback
  );
}
```

**Usage in agent posts:**
```javascript
function personalizeGreeting(user, message) {
  const name = getDisplayName(user);

  // If using fallback, adjust tone
  if (name === 'User') {
    return `Hello! ${message}`;
  } else {
    return `Hi ${name}, ${message}`;
  }
}
```

---

## 8. Success Criteria

### 8.1 Functional Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Onboarding completion rate | 95%+ | Users who complete username entry on first attempt |
| Validation error rate | < 5% | Percentage of submissions that fail validation |
| Username submission time | < 15 seconds | Average time from prompt to successful submission |
| Cross-session persistence | 100% | Username available after browser refresh |
| Display accuracy | 100% | Username displayed correctly in all UI locations |

---

### 8.2 Non-Functional Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| API response time (save) | < 200ms (p95) | Backend API latency monitoring |
| API response time (retrieve) | < 50ms (p95) | Backend API latency monitoring |
| Validation speed | < 10ms | Client-side validation performance |
| Security audit | 100% pass | OWASP Top 10 compliance check |
| Accessibility score | WCAG 2.1 AA | Automated accessibility testing |

---

### 8.3 User Experience Success Criteria

- [ ] Users understand what "display name" means from prompt
- [ ] Validation errors are clear and actionable
- [ ] Name appears in UI within 1 second of submission
- [ ] Mobile users can complete entry with on-screen keyboard
- [ ] Screen reader users can navigate and submit successfully
- [ ] No confusion about name vs. email vs. username
- [ ] Users feel welcomed and personalized immediately

---

## 9. Testing Requirements

### 9.1 Unit Tests

**Backend Validation:**
```javascript
describe('Username Validation', () => {
  test('accepts valid names', () => {
    expect(validateUsername('John')).toEqual({
      valid: true,
      errors: [],
      sanitized: 'John'
    });
  });

  test('rejects empty names', () => {
    expect(validateUsername('')).toMatchObject({
      valid: false,
      errors: [{ code: 'REQUIRED' }]
    });
  });

  test('rejects names over 50 characters', () => {
    expect(validateUsername('A'.repeat(51))).toMatchObject({
      valid: false,
      errors: [{ code: 'TOO_LONG' }]
    });
  });

  test('sanitizes HTML in names', () => {
    expect(validateUsername('<script>alert</script>John')).toMatchObject({
      valid: false,
      errors: [{ code: 'INVALID_CHARACTERS' }]
    });
  });

  test('trims whitespace', () => {
    expect(validateUsername('  John  ')).toEqual({
      valid: true,
      errors: [],
      sanitized: 'John'
    });
  });
});
```

**Database Operations:**
```javascript
describe('Username Storage', () => {
  test('saves username to settings JSONB', async () => {
    await saveUsername(userId, 'John');

    const user = await getUser(userId);
    expect(user.settings.display_name).toBe('John');
  });

  test('records timestamp on save', async () => {
    await saveUsername(userId, 'John');

    const user = await getUser(userId);
    expect(user.settings.onboarding.username_set_at).toBeDefined();
  });

  test('handles concurrent updates correctly', async () => {
    // Test optimistic locking or transaction handling
  });
});
```

---

### 9.2 Integration Tests

**API Endpoint Tests:**
```javascript
describe('PATCH /api/users/:userId/settings', () => {
  test('saves valid username', async () => {
    const response = await request(app)
      .patch('/api/users/test-user-id/settings')
      .send({ display_name: 'John' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.settings.display_name).toBe('John');
  });

  test('returns 400 for invalid username', async () => {
    const response = await request(app)
      .patch('/api/users/test-user-id/settings')
      .send({ display_name: '<script>xss</script>' })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('requires authentication', async () => {
    await request(app)
      .patch('/api/users/test-user-id/settings')
      .send({ display_name: 'John' })
      .expect(401);
  });
});
```

---

### 9.3 E2E Tests

**Onboarding Flow:**
```javascript
describe('Username Collection E2E', () => {
  test('new user sees username prompt first', async () => {
    const { page } = await setupNewUser();

    await page.goto('/onboarding');

    // Username prompt should be visible
    const prompt = await page.locator('h2:has-text("What should we call you?")');
    await expect(prompt).toBeVisible();

    // No other onboarding content visible yet
    const nextStep = await page.locator('text=Lambda-vi Introduction');
    await expect(nextStep).not.toBeVisible();
  });

  test('user can submit username and proceed', async () => {
    const { page } = await setupNewUser();
    await page.goto('/onboarding');

    // Enter username
    await page.fill('input[placeholder*="preferred name"]', 'John');
    await page.click('button:has-text("Continue")');

    // Wait for next step
    await page.waitForSelector('text=Lambda-vi Introduction');

    // Verify username appears in UI
    await expect(page.locator('text=Hi John')).toBeVisible();
  });

  test('validation errors are shown', async () => {
    const { page } = await setupNewUser();
    await page.goto('/onboarding');

    // Submit empty name
    await page.click('button:has-text("Continue")');

    // Error message visible
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('text=Please enter a name')).toBeVisible();
  });
});
```

---

### 9.4 Accessibility Tests

```javascript
describe('Username Input Accessibility', () => {
  test('has proper ARIA labels', async () => {
    const { page } = await setupNewUser();
    await page.goto('/onboarding');

    const input = page.locator('input[aria-label*="preferred name"]');
    await expect(input).toHaveAttribute('aria-required', 'true');
  });

  test('keyboard navigation works', async () => {
    const { page } = await setupNewUser();
    await page.goto('/onboarding');

    // Tab to input
    await page.keyboard.press('Tab');
    await expect(page.locator('input')).toBeFocused();

    // Type name
    await page.keyboard.type('John');

    // Enter to submit
    await page.keyboard.press('Enter');

    // Should proceed to next step
    await page.waitForSelector('text=Lambda-vi Introduction');
  });

  test('screen reader announcements', async () => {
    // Test with axe-core or similar tool
    const results = await runAccessibilityAudit(page);
    expect(results.violations).toHaveLength(0);
  });
});
```

---

## 10. Implementation Phases

### Phase 1: Database Schema (1 day)
- [ ] Review existing `users.settings` JSONB structure
- [ ] Add validation function for display_name (optional)
- [ ] Create database migration (if needed)
- [ ] Test JSONB operations with display_name
- [ ] Document settings schema

### Phase 2: Backend API (2 days)
- [ ] Implement validation function
- [ ] Create PATCH /api/users/:userId/settings endpoint
- [ ] Create GET /api/users/:userId/settings endpoint
- [ ] Create POST /api/validation/display-name endpoint
- [ ] Add error handling and security measures
- [ ] Write unit tests for validation
- [ ] Write integration tests for API endpoints

### Phase 3: Frontend Components (2 days)
- [ ] Create UsernameStep component
- [ ] Add validation UI feedback
- [ ] Create useUserSettings hook
- [ ] Integrate into onboarding flow
- [ ] Add display name to header/navigation
- [ ] Create settings/profile page for updates
- [ ] Write component unit tests

### Phase 4: Agent Integration (1 day)
- [ ] Update get-to-know-you-agent to prompt for username first
- [ ] Modify agent post templates to include display_name
- [ ] Update Lambda-vi introduction to use display_name
- [ ] Test agent personalization across ecosystem
- [ ] Update onboarding completion post template

### Phase 5: Testing & QA (2 days)
- [ ] Run full unit test suite
- [ ] Execute integration tests
- [ ] Perform E2E testing
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Security audit (XSS, SQL injection)
- [ ] Load testing (performance metrics)
- [ ] User acceptance testing

### Phase 6: Documentation & Deployment (1 day)
- [ ] Update agent documentation
- [ ] Create user-facing help content
- [ ] Write deployment guide
- [ ] Prepare rollback plan
- [ ] Deploy to staging environment
- [ ] Production deployment
- [ ] Monitor metrics and errors

---

## 11. Dependencies and Constraints

### 11.1 Technical Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| PostgreSQL | 12+ | Database with JSONB support |
| Node.js | 18+ | Backend runtime |
| Express | 4.x | API server framework |
| React | 18+ | Frontend framework |
| DOMPurify | 3.x | XSS sanitization |
| validator.js | 13.x | Input validation |

---

### 11.2 External Integrations

- **Authentication System**: Username collection must work with existing auth flow
- **Agent Ecosystem**: All production agents must access display_name via user context
- **Persistent Storage**: Docker volumes must be configured for /prod/agent_workspace/

---

### 11.3 Constraints

**Technical:**
- JSONB field limited to 1MB total size (PostgreSQL)
- Settings object should remain under 10KB for performance
- API rate limits: 10 requests/minute for settings updates

**Business:**
- Must complete in 2-week sprint
- No breaking changes to existing user data
- Backwards compatible with users without display_name

**Regulatory:**
- GDPR compliance: Username is personal data
- Users must be able to update/delete username
- Audit trail for username changes (for abuse prevention)

---

## 12. Open Questions and Decisions

### 12.1 Resolved Decisions

| Decision | Resolution | Rationale |
|----------|-----------|-----------|
| Where to store username? | `users.settings.display_name` JSONB field | Leverages existing schema, flexible for future settings |
| Required or optional? | Required for onboarding | Personalization is core to product value |
| Min/max length? | 1-50 characters | Balances usability with database constraints |
| Allow special characters? | Limited set (letters, numbers, spaces, `-`, `'`, `.`) | Security and display consistency |

---

### 12.2 Open Questions

| Question | Options | Recommendation |
|----------|---------|----------------|
| Should we allow emoji in usernames? | Yes / No / Limited set | **No** - Complex rendering issues, potential for abuse |
| Should display_name be unique? | Yes / No | **No** - Multiple users can have same display name (it's not a username, it's a display preference) |
| Show full name option? | Add preference toggle | **Yes** - Add `settings.preferences.show_full_name` boolean |
| Username change history? | Store in separate table / Include in settings | **Settings** - Store `username_change_count` and `last_updated_at` |
| Profanity filter severity? | Strict / Moderate / Lenient | **Moderate** - Block obvious profanity, allow edge cases |

---

## 13. Appendices

### Appendix A: Example Settings JSONB Payloads

**Initial Username Set:**
```json
{
  "display_name": "John",
  "onboarding": {
    "username_set_at": "2025-10-26T10:30:00Z",
    "username_updated_at": null,
    "username_change_count": 0,
    "step": "username_collected"
  },
  "preferences": {
    "show_full_name": false,
    "name_visibility": "public"
  }
}
```

**After Username Update:**
```json
{
  "display_name": "Johnny",
  "onboarding": {
    "username_set_at": "2025-10-26T10:30:00Z",
    "username_updated_at": "2025-10-26T14:45:00Z",
    "username_change_count": 1,
    "step": "onboarding_complete"
  },
  "preferences": {
    "show_full_name": false,
    "name_visibility": "public"
  }
}
```

---

### Appendix B: Agent Post Templates with Display Name

**Onboarding Completion Post:**
```markdown
# 🎉 Welcome [DISPLAY_NAME] - Your AI Team is Ready!

Onboarding complete - personalized agent ecosystem configured and ready to support your goals

## Welcome to Your Personalized AI Experience!

**Your Profile:**
- **Focus:** [PRIMARY_FOCUS]
- **Goals:** [KEY_GOALS]
- **Communication Style:** [PREFERRED_STYLE]

**Λvi Relationship:** [RELATIONSHIP_STYLE]
Your chief of staff is configured to work with you as [COORDINATION_PREFERENCE]

**Agent Team Configuration:**
✅ Personal Todos Agent: [PRIORITY_SYSTEM] priorities
✅ Meeting Agents: [MEETING_STYLE] preparation and follow-up
✅ Link Logger: [INTELLIGENCE_FOCUS] intelligence capture

**Next Steps:**
[PERSONALIZED_NEXT_ACTIONS]

Welcome to the team, [DISPLAY_NAME]! 🚀
```

**Daily Agent Post Example:**
```markdown
# Good morning, [DISPLAY_NAME]! 📋

Here's your task summary for today:

**High Priority (3 tasks)**
- Complete project proposal
- Review team feedback
- Schedule client meeting

**Medium Priority (5 tasks)**
- Update documentation
- Respond to emails
- Plan next sprint

[DISPLAY_NAME], you're making great progress this week! 💪
```

---

### Appendix C: SQL Query Examples

**Retrieve User with Display Name:**
```sql
SELECT
  id,
  email,
  name,
  settings->>'display_name' as display_name,
  settings->'onboarding'->>'username_set_at' as username_set_at,
  created_at
FROM users
WHERE id = $1;
```

**Update Display Name:**
```sql
UPDATE users
SET
  settings = jsonb_set(
    settings,
    '{display_name}',
    to_jsonb($2::text),
    true
  ),
  settings = jsonb_set(
    settings,
    '{onboarding,username_updated_at}',
    to_jsonb(NOW()::text),
    true
  ),
  settings = jsonb_set(
    settings,
    '{onboarding,username_change_count}',
    to_jsonb(COALESCE((settings->'onboarding'->>'username_change_count')::int, 0) + 1),
    true
  ),
  updated_at = NOW()
WHERE id = $1
RETURNING *;
```

**Search by Display Name (if needed):**
```sql
SELECT *
FROM users
WHERE settings->>'display_name' ILIKE $1
LIMIT 10;
```

---

### Appendix D: Security Checklist

- [ ] XSS Prevention: Input sanitization with DOMPurify
- [ ] SQL Injection: Parameterized queries only
- [ ] NoSQL Injection: JSONB structure validation
- [ ] Rate Limiting: 10 requests/minute per user
- [ ] Authentication: JWT token validation
- [ ] Authorization: User can only update own settings
- [ ] Audit Logging: Track all username changes
- [ ] Data Privacy: Username encrypted at rest (database-level)
- [ ] HTTPS Only: All API calls over TLS
- [ ] Input Validation: Server-side validation required
- [ ] Error Handling: No sensitive data in error messages
- [ ] CORS: Restricted to allowed origins

---

## 14. Success Metrics and KPIs

### Week 1 Post-Launch:
- Onboarding completion rate: 95%+
- Username submission error rate: < 5%
- Average submission time: < 15 seconds
- API response time p95: < 200ms
- Zero XSS vulnerabilities detected

### Month 1 Post-Launch:
- User satisfaction (survey): 90%+
- Username update requests: Track volume
- Agent personalization accuracy: 100%
- System uptime: 99.9%+
- Display consistency across UI: 100%

---

## 15. Rollback Plan

**Trigger Conditions for Rollback:**
- Critical security vulnerability discovered
- > 10% error rate in username submission
- Database corruption or data loss
- Performance degradation > 2x baseline
- Accessibility compliance failure

**Rollback Steps:**
1. Disable username collection in onboarding flow
2. Revert to previous onboarding sequence
3. Maintain existing display_name data (no deletion)
4. Fallback to email-based greetings
5. Investigate and fix issues
6. Re-deploy with fixes

**Data Preservation:**
- All existing username data remains in database
- No destructive migrations
- Users can continue using system without username

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-10-26 | SPARC Specification Agent | Initial specification creation |

---

## Approval and Sign-off

**Specification Status**: Draft - Awaiting Review

**Reviewers Required:**
- [ ] Product Owner
- [ ] Technical Lead
- [ ] Security Architect
- [ ] UX Designer
- [ ] QA Lead

**Approved By:**
- [ ] _Name, Role, Date_

---

**END OF SPECIFICATION**
