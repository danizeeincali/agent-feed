# PSEUDOCODE: Agent Protection Validation System

**Document Version**: 1.0.0
**Date**: 2025-10-19
**Phase**: Pseudocode (SPARC Methodology)
**Author**: SPARC Pseudocode Specialist
**Status**: Ready for Implementation

---

## Executive Summary

This document provides complete algorithmic specifications for implementing multi-layer protection validation for the Agent Tier System. The system prevents modification of critical system agents (Tier 2 protected agents) while maintaining a seamless user experience.

**Protection Scope**:
- 6 Phase 4.2 specialist agents (T2, protected visibility)
- System-critical agents in `.system` directory (filesystem read-only)
- Meta-coordination agents (protected from user modification)

**Protection Layers**:
1. **Frontend (UX)**: Visual indicators, disabled controls, read-only views
2. **API (Security)**: Request validation, 403 responses, audit logging
3. **Database (Integrity)**: Triggers, constraints, immutability enforcement

---

## Table of Contents

1. [Data Structures](#1-data-structures)
2. [Protection Status Determination](#2-protection-status-determination)
3. [Frontend Protection Indicators](#3-frontend-protection-indicators)
4. [API Protection Validation](#4-api-protection-validation)
5. [Database Protection Enforcement](#5-database-protection-enforcement)
6. [Protected Agent Registry](#6-protected-agent-registry)
7. [Error Handling](#7-error-handling)
8. [Audit Logging](#8-audit-logging)
9. [Test Cases](#9-test-cases)
10. [Complexity Analysis](#10-complexity-analysis)

---

## 1. Data Structures

### 1.1 Core Data Types

```typescript
/**
 * Agent Tier Classification
 */
ENUM AgentTier {
  USER_FACING = 1,
  SYSTEM = 2
}

/**
 * Agent Visibility Status
 */
ENUM AgentVisibility {
  PUBLIC = 'public',
  PROTECTED = 'protected'
}

/**
 * Protection Reason Categories
 */
ENUM ProtectionReason {
  TIER2_PROTECTED = 'tier2_protected',     // T2 agent with protected visibility
  SYSTEM_CRITICAL = 'system_critical',     // Phase 4.2 specialist agents
  FILESYSTEM_READONLY = 'filesystem_readonly', // .system directory agents
  META_COORDINATION = 'meta_coordination'  // Meta-agent and meta-update-agent
}

/**
 * Protection Level Hierarchy
 */
ENUM ProtectionLevel {
  PUBLIC = 'public',           // Fully editable by users
  PROTECTED = 'protected',     // Read-only in UI, API blocks modifications
  SYSTEM = 'system',           // Filesystem read-only, absolute protection
  ADMIN_ONLY = 'admin_only'    // Future: Requires admin privileges
}

/**
 * Agent Protection Metadata
 */
INTERFACE AgentProtection {
  isProtected: BOOLEAN;                    // Is agent protected from modification?
  protectionReason: ProtectionReason;      // Why is this agent protected?
  protectionLevel: ProtectionLevel;        // Level of protection applied
  canEdit: BOOLEAN;                        // Can current user edit agent?
  canDelete: BOOLEAN;                      // Can current user delete agent?
  canViewSource: BOOLEAN;                  // Can user view agent source code?
  warningMessage: STRING;                  // User-friendly warning message
}

/**
 * Complete Agent Interface (Extended)
 */
INTERFACE Agent {
  // Core fields
  id: STRING;
  slug: STRING;
  name: STRING;
  description: STRING;
  tools: ARRAY<STRING>;
  color: STRING;
  status: STRING;
  model: STRING;

  // Tier system fields
  tier: AgentTier;
  visibility: AgentVisibility;
  icon_type: STRING;
  icon_emoji: STRING;
  posts_as_self: BOOLEAN;
  show_in_default_feed: BOOLEAN;

  // Protection metadata (computed)
  protection: AgentProtection;

  // File metadata
  filePath: STRING;
  lastModified: STRING;
  hash: STRING;
}

/**
 * User Context (for authorization)
 */
INTERFACE UserContext {
  userId: STRING;
  isAuthenticated: BOOLEAN;
  isAdmin: BOOLEAN;
  permissions: ARRAY<STRING>;
}

/**
 * Protection Check Result
 */
INTERFACE ProtectionCheckResult {
  allowed: BOOLEAN;
  reason: STRING;
  errorCode: STRING;
  httpStatus: INTEGER;
  logEvent: OBJECT;
}
```

### 1.2 Protected Agent Registry

```typescript
/**
 * Static registry of protected agents
 * Phase 4.2 Specialist Agents (T2, visibility=protected)
 */
CONST PHASE_4_2_SPECIALISTS = SET {
  'agent-architect-agent',
  'agent-maintenance-agent',
  'skills-architect-agent',
  'skills-maintenance-agent',
  'learning-optimizer-agent',
  'system-architect-agent'
}

/**
 * Meta-coordination agents (T1, visibility=protected)
 */
CONST META_COORDINATION_AGENTS = SET {
  'meta-agent',
  'meta-update-agent'
}

/**
 * System directory pattern (filesystem read-only)
 */
CONST SYSTEM_DIRECTORY_PATTERN = REGEX {
  /^\.system\//
}

/**
 * Combined protected agents set
 */
CONST ALL_PROTECTED_AGENTS = UNION(
  PHASE_4_2_SPECIALISTS,
  META_COORDINATION_AGENTS
)
```

---

## 2. Protection Status Determination

### 2.1 Main Protection Algorithm

```
ALGORITHM: DetermineProtectionStatus
INPUT: agent (Agent object), user (UserContext)
OUTPUT: protection (AgentProtection object)

BEGIN
  // Initialize default protection (not protected)
  protection ← {
    isProtected: FALSE,
    protectionReason: NULL,
    protectionLevel: ProtectionLevel.PUBLIC,
    canEdit: TRUE,
    canDelete: TRUE,
    canViewSource: TRUE,
    warningMessage: NULL
  }

  // Check 1: Filesystem protection (.system directory)
  IF IsSystemDirectoryAgent(agent) THEN
    protection.isProtected ← TRUE
    protection.protectionReason ← ProtectionReason.FILESYSTEM_READONLY
    protection.protectionLevel ← ProtectionLevel.SYSTEM
    protection.canEdit ← FALSE
    protection.canDelete ← FALSE
    protection.canViewSource ← TRUE
    protection.warningMessage ← "System directory agents are read-only"
    RETURN protection
  END IF

  // Check 2: Tier 2 with protected visibility
  IF agent.tier = AgentTier.SYSTEM AND agent.visibility = AgentVisibility.PROTECTED THEN
    protection.isProtected ← TRUE
    protection.protectionReason ← ProtectionReason.TIER2_PROTECTED
    protection.protectionLevel ← ProtectionLevel.PROTECTED
    protection.canEdit ← user.isAdmin
    protection.canDelete ← FALSE
    protection.canViewSource ← TRUE
    protection.warningMessage ← "Protected system agent - modifications restricted"
    RETURN protection
  END IF

  // Check 3: Phase 4.2 specialist agents
  IF agent.slug IN PHASE_4_2_SPECIALISTS THEN
    protection.isProtected ← TRUE
    protection.protectionReason ← ProtectionReason.SYSTEM_CRITICAL
    protection.protectionLevel ← ProtectionLevel.PROTECTED
    protection.canEdit ← user.isAdmin
    protection.canDelete ← FALSE
    protection.canViewSource ← TRUE
    protection.warningMessage ← "System specialist agent - critical for platform operations"
    RETURN protection
  END IF

  // Check 4: Meta-coordination agents
  IF agent.slug IN META_COORDINATION_AGENTS THEN
    protection.isProtected ← TRUE
    protection.protectionReason ← ProtectionReason.META_COORDINATION
    protection.protectionLevel ← ProtectionLevel.PROTECTED
    protection.canEdit ← user.isAdmin
    protection.canDelete ← FALSE
    protection.canViewSource ← TRUE
    protection.warningMessage ← "Meta-agent - manages agent lifecycle"
    RETURN protection
  END IF

  // Default: Not protected (Tier 1, public visibility)
  RETURN protection
END

COMPLEXITY ANALYSIS:
  Time: O(1) - Constant time checks (set membership is O(1) with hash set)
  Space: O(1) - Fixed size protection object
```

### 2.2 Helper Functions

```
ALGORITHM: IsSystemDirectoryAgent
INPUT: agent (Agent object)
OUTPUT: isSystem (BOOLEAN)

BEGIN
  IF agent.filePath IS NULL THEN
    RETURN FALSE
  END IF

  // Extract directory path
  directoryPath ← GetDirectoryPath(agent.filePath)

  // Check if in .system directory
  IF REGEX_MATCH(directoryPath, SYSTEM_DIRECTORY_PATTERN) THEN
    RETURN TRUE
  END IF

  RETURN FALSE
END

COMPLEXITY: O(1) - Regex match on fixed-length path


ALGORITHM: CanUserModifyAgent
INPUT: agent (Agent object), user (UserContext)
OUTPUT: canModify (BOOLEAN)

BEGIN
  protection ← DetermineProtectionStatus(agent, user)

  // Admin override: Admins can modify protected agents
  IF user.isAdmin = TRUE THEN
    RETURN TRUE
  END IF

  // Non-protected agents: All users can modify
  IF protection.isProtected = FALSE THEN
    RETURN TRUE
  END IF

  // Protected agents: Only admins can modify
  RETURN FALSE
END

COMPLEXITY: O(1) - Delegate to DetermineProtectionStatus


ALGORITHM: GetProtectionBadgeConfig
INPUT: protection (AgentProtection)
OUTPUT: badgeConfig (OBJECT)

BEGIN
  SWITCH protection.protectionLevel
    CASE ProtectionLevel.SYSTEM:
      RETURN {
        text: "System Protected",
        color: "#DC2626",  // Red
        icon: "Lock",
        tooltip: "Filesystem read-only - cannot be modified"
      }

    CASE ProtectionLevel.PROTECTED:
      RETURN {
        text: "Protected",
        color: "#F59E0B",  // Amber
        icon: "ShieldAlert",
        tooltip: protection.warningMessage
      }

    CASE ProtectionLevel.ADMIN_ONLY:
      RETURN {
        text: "Admin Only",
        color: "#8B5CF6",  // Purple
        icon: "Key",
        tooltip: "Requires administrator privileges"
      }

    DEFAULT:
      RETURN NULL
  END SWITCH
END

COMPLEXITY: O(1) - Simple switch statement
```

---

## 3. Frontend Protection Indicators

### 3.1 Protection Badge Component

```typescript
ALGORITHM: RenderProtectionBadge
INPUT: agent (Agent), user (UserContext)
OUTPUT: ReactElement (Badge component)

BEGIN
  // Determine protection status
  protection ← DetermineProtectionStatus(agent, user)

  // If not protected, render nothing
  IF protection.isProtected = FALSE THEN
    RETURN NULL
  END IF

  // Get badge configuration
  badgeConfig ← GetProtectionBadgeConfig(protection)

  // Render badge with icon and tooltip
  badge ← CREATE_ELEMENT("span", {
    className: "protection-badge",
    style: {
      backgroundColor: badgeConfig.color,
      color: "white",
      padding: "4px 8px",
      borderRadius: "4px",
      fontSize: "12px",
      fontWeight: "600",
      display: "inline-flex",
      alignItems: "center",
      gap: "4px"
    }
  })

  // Add icon
  icon ← CREATE_ICON(badgeConfig.icon, {
    size: 14,
    color: "white"
  })

  // Add text
  text ← CREATE_TEXT(badgeConfig.text)

  // Add tooltip
  tooltip ← CREATE_TOOLTIP({
    content: badgeConfig.tooltip,
    position: "top"
  })

  // Assemble badge
  badge.appendChild(icon)
  badge.appendChild(text)
  tooltip.appendChild(badge)

  RETURN tooltip
END

COMPLEXITY: O(1) - Fixed number of DOM operations
```

### 3.2 Edit Button State Logic

```typescript
ALGORITHM: GetEditButtonState
INPUT: agent (Agent), user (UserContext)
OUTPUT: buttonState (OBJECT)

BEGIN
  protection ← DetermineProtectionStatus(agent, user)

  // Determine if button should be disabled
  isDisabled ← NOT protection.canEdit

  // Determine button text
  IF isDisabled THEN
    buttonText ← "Protected"
  ELSE
    buttonText ← "Edit Agent"
  END IF

  // Determine button style
  IF isDisabled THEN
    buttonStyle ← {
      backgroundColor: "#E5E7EB",  // Gray-200
      color: "#9CA3AF",            // Gray-400
      cursor: "not-allowed",
      opacity: 0.6
    }
  ELSE
    buttonStyle ← {
      backgroundColor: "#3B82F6",  // Blue-500
      color: "white",
      cursor: "pointer",
      opacity: 1
    }
  END IF

  // Determine click handler
  IF isDisabled THEN
    onClick ← ShowProtectionWarning(protection.warningMessage)
  ELSE
    onClick ← OpenEditDialog(agent)
  END IF

  RETURN {
    disabled: isDisabled,
    text: buttonText,
    style: buttonStyle,
    onClick: onClick,
    tooltip: isDisabled ? protection.warningMessage : NULL
  }
END

COMPLEXITY: O(1) - Simple conditional logic
```

### 3.3 Agent Card Styling

```typescript
ALGORITHM: GetAgentCardClassName
INPUT: agent (Agent), user (UserContext)
OUTPUT: className (STRING)

BEGIN
  protection ← DetermineProtectionStatus(agent, user)

  // Base classes
  classNames ← ["agent-card"]

  // Add tier class
  IF agent.tier = AgentTier.USER_FACING THEN
    classNames.push("tier-1")
  ELSE
    classNames.push("tier-2")
  END IF

  // Add protection class
  IF protection.isProtected THEN
    classNames.push("protected-agent")
    classNames.push("opacity-70")
    classNames.push("bg-gray-50")
  ELSE
    classNames.push("bg-white")
  END IF

  // Add protection level class
  SWITCH protection.protectionLevel
    CASE ProtectionLevel.SYSTEM:
      classNames.push("system-protected")
      classNames.push("border-red-500")
    CASE ProtectionLevel.PROTECTED:
      classNames.push("user-protected")
      classNames.push("border-amber-500")
  END SWITCH

  RETURN classNames.join(" ")
END

COMPLEXITY: O(1) - Fixed number of class additions
```

### 3.4 Read-Only Form Fields

```typescript
ALGORITHM: RenderAgentForm
INPUT: agent (Agent), user (UserContext), mode (STRING)
OUTPUT: FormElement

BEGIN
  protection ← DetermineProtectionStatus(agent, user)

  // Determine if form should be read-only
  isReadOnly ← (mode = "edit") AND (NOT protection.canEdit)

  // Create form fields
  formFields ← []

  FOR EACH field IN AGENT_SCHEMA DO
    fieldConfig ← {
      name: field.name,
      label: field.label,
      value: agent[field.name],
      type: field.type,
      disabled: isReadOnly,
      placeholder: isReadOnly ? "Read-only" : field.placeholder
    }

    // Add visual indicator for read-only fields
    IF isReadOnly THEN
      fieldConfig.className ← "read-only-field bg-gray-100 cursor-not-allowed"
      fieldConfig.icon ← "Lock"
    END IF

    formFields.push(CREATE_FORM_FIELD(fieldConfig))
  END FOR

  // Add protection warning banner
  IF isReadOnly THEN
    warningBanner ← CREATE_ALERT({
      type: "warning",
      icon: "AlertTriangle",
      title: "Protected Agent",
      message: protection.warningMessage,
      dismissible: FALSE
    })

    formFields.unshift(warningBanner)
  END IF

  RETURN CREATE_FORM({
    fields: formFields,
    readOnly: isReadOnly,
    onSubmit: isReadOnly ? NULL : HandleFormSubmit
  })
END

COMPLEXITY: O(n) - Where n is number of form fields (typically ~10)
```

---

## 4. API Protection Validation

### 4.1 API Middleware Protection

```javascript
ALGORITHM: ProtectionMiddleware
INPUT: request (HTTP Request), response (HTTP Response), next (Function)
OUTPUT: void (calls next() or sends error response)

BEGIN
  // Extract agent identifier from URL
  agentSlug ← request.params.slug OR request.params.id

  // Skip protection check for GET requests (read-only)
  IF request.method = "GET" THEN
    CALL next()
    RETURN
  END IF

  // Load agent from repository
  agent ← AWAIT GetAgentBySlug(agentSlug)

  IF agent IS NULL THEN
    SEND_RESPONSE(response, {
      status: 404,
      body: {
        success: FALSE,
        error: "Agent not found",
        code: "AGENT_NOT_FOUND"
      }
    })
    RETURN
  END IF

  // Get user context (default to non-admin)
  user ← {
    userId: request.user?.id OR "anonymous",
    isAuthenticated: request.user IS NOT NULL,
    isAdmin: request.user?.isAdmin OR FALSE,
    permissions: request.user?.permissions OR []
  }

  // Determine protection status
  protection ← DetermineProtectionStatus(agent, user)

  // Check if modification is allowed
  IF protection.isProtected AND NOT protection.canEdit THEN
    // Log security event
    CALL LogSecurityEvent({
      event: "PROTECTED_AGENT_MODIFICATION_ATTEMPT",
      agentSlug: agentSlug,
      userId: user.userId,
      method: request.method,
      path: request.path,
      protectionReason: protection.protectionReason,
      timestamp: NOW(),
      ip: request.ip,
      userAgent: request.headers["user-agent"]
    })

    // Return 403 Forbidden
    SEND_RESPONSE(response, {
      status: 403,
      body: {
        success: FALSE,
        error: "Cannot modify protected system agent",
        code: "AGENT_PROTECTED",
        details: {
          agent: agentSlug,
          protectionReason: protection.protectionReason,
          protectionLevel: protection.protectionLevel,
          message: protection.warningMessage
        }
      }
    })
    RETURN
  END IF

  // Attach protection metadata to request
  request.agentProtection ← protection

  // Allow request to proceed
  CALL next()
END

COMPLEXITY: O(1) - Constant time checks (agent lookup is O(1) with cache)
```

### 4.2 API Endpoint Protection

```javascript
ALGORITHM: UpdateAgentEndpoint
INPUT: request (HTTP Request), response (HTTP Response)
OUTPUT: void (sends HTTP response)

ENDPOINT: PATCH /api/agents/:slug

BEGIN
  TRY
    // Get agent slug from URL
    slug ← request.params.slug

    // Get update payload
    updates ← request.body

    // Get agent from repository
    agent ← AWAIT GetAgentBySlug(slug)

    IF agent IS NULL THEN
      SEND_RESPONSE(response, {
        status: 404,
        body: { error: "Agent not found" }
      })
      RETURN
    END IF

    // Get user context
    user ← ExtractUserContext(request)

    // Validate protection status
    protectionResult ← ValidateProtection(agent, user, "UPDATE")

    IF NOT protectionResult.allowed THEN
      // Log failed attempt
      CALL LogSecurityEvent(protectionResult.logEvent)

      // Return error response
      SEND_RESPONSE(response, {
        status: protectionResult.httpStatus,
        body: {
          success: FALSE,
          error: protectionResult.reason,
          code: protectionResult.errorCode
        }
      })
      RETURN
    END IF

    // Validate tier immutability
    IF updates.tier IS NOT NULL AND updates.tier != agent.tier THEN
      IF NOT user.isAdmin THEN
        SEND_RESPONSE(response, {
          status: 403,
          body: {
            success: FALSE,
            error: "Agent tier classification is immutable",
            code: "TIER_IMMUTABLE"
          }
        })
        RETURN
      END IF
    END IF

    // Proceed with update
    updatedAgent ← AWAIT UpdateAgent(slug, updates, user)

    // Return success response
    SEND_RESPONSE(response, {
      status: 200,
      body: {
        success: TRUE,
        data: updatedAgent,
        timestamp: NOW()
      }
    })

  CATCH error
    SEND_RESPONSE(response, {
      status: 500,
      body: {
        success: FALSE,
        error: error.message,
        code: "INTERNAL_ERROR"
      }
    })
  END TRY
END

COMPLEXITY: O(1) - All operations are constant time
```

### 4.3 Delete Endpoint Protection

```javascript
ALGORITHM: DeleteAgentEndpoint
INPUT: request (HTTP Request), response (HTTP Response)
OUTPUT: void (sends HTTP response)

ENDPOINT: DELETE /api/agents/:slug

BEGIN
  TRY
    slug ← request.params.slug
    agent ← AWAIT GetAgentBySlug(slug)

    IF agent IS NULL THEN
      SEND_RESPONSE(response, {
        status: 404,
        body: { error: "Agent not found" }
      })
      RETURN
    END IF

    user ← ExtractUserContext(request)
    protection ← DetermineProtectionStatus(agent, user)

    // Protected agents cannot be deleted (even by admins)
    IF protection.isProtected THEN
      CALL LogSecurityEvent({
        event: "PROTECTED_AGENT_DELETE_ATTEMPT",
        agentSlug: slug,
        userId: user.userId,
        protectionReason: protection.protectionReason,
        timestamp: NOW()
      })

      SEND_RESPONSE(response, {
        status: 403,
        body: {
          success: FALSE,
          error: "Protected agents cannot be deleted",
          code: "AGENT_DELETE_FORBIDDEN",
          details: {
            reason: "System stability - protected agents are critical infrastructure"
          }
        }
      })
      RETURN
    END IF

    // Proceed with deletion (Tier 1, public agents only)
    AWAIT DeleteAgent(slug, user)

    SEND_RESPONSE(response, {
      status: 200,
      body: {
        success: TRUE,
        message: "Agent deleted successfully"
      }
    })

  CATCH error
    SEND_RESPONSE(response, {
      status: 500,
      body: { error: error.message }
    })
  END TRY
END

COMPLEXITY: O(1) - Constant time operations
```

### 4.4 Protection Validation Helper

```javascript
ALGORITHM: ValidateProtection
INPUT: agent (Agent), user (UserContext), operation (STRING)
OUTPUT: result (ProtectionCheckResult)

BEGIN
  protection ← DetermineProtectionStatus(agent, user)

  // Initialize result
  result ← {
    allowed: TRUE,
    reason: NULL,
    errorCode: NULL,
    httpStatus: 200,
    logEvent: NULL
  }

  // Check operation permission
  SWITCH operation
    CASE "UPDATE":
      IF protection.isProtected AND NOT protection.canEdit THEN
        result.allowed ← FALSE
        result.reason ← "Cannot modify protected system agent"
        result.errorCode ← "AGENT_UPDATE_FORBIDDEN"
        result.httpStatus ← 403
      END IF

    CASE "DELETE":
      IF protection.isProtected AND NOT protection.canDelete THEN
        result.allowed ← FALSE
        result.reason ← "Cannot delete protected system agent"
        result.errorCode ← "AGENT_DELETE_FORBIDDEN"
        result.httpStatus ← 403
      END IF

    CASE "READ":
      // Reading is always allowed
      result.allowed ← TRUE
  END SWITCH

  // Build log event if operation blocked
  IF NOT result.allowed THEN
    result.logEvent ← {
      event: "PROTECTED_AGENT_" + operation + "_ATTEMPT",
      agentSlug: agent.slug,
      agentTier: agent.tier,
      agentVisibility: agent.visibility,
      userId: user.userId,
      isAdmin: user.isAdmin,
      operation: operation,
      protectionReason: protection.protectionReason,
      protectionLevel: protection.protectionLevel,
      timestamp: NOW()
    }
  END IF

  RETURN result
END

COMPLEXITY: O(1) - Simple switch and conditionals
```

---

## 5. Database Protection Enforcement

### 5.1 PostgreSQL Trigger (Immutability)

```sql
ALGORITHM: PreventProtectedAgentModification
TRIGGER: BEFORE UPDATE OR DELETE ON system_agent_templates
INPUT: NEW (modified row), OLD (original row)
OUTPUT: RAISE EXCEPTION or RETURN NEW

BEGIN
  -- Check if agent is protected (Tier 2 + visibility = protected)
  IF OLD.tier = 2 AND OLD.visibility = 'protected' THEN

    -- Check if DELETE operation
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Cannot delete protected system agent: %', OLD.name
        USING HINT = 'Protected agents are critical system infrastructure',
              ERRCODE = '23503';  -- Foreign key violation code (semantic fit)
      RETURN NULL;
    END IF

    -- Check if UPDATE operation modifying critical fields
    IF TG_OP = 'UPDATE' THEN

      -- Prevent tier changes
      IF NEW.tier != OLD.tier THEN
        RAISE EXCEPTION 'Cannot change tier of protected agent: %', OLD.name
          USING HINT = 'Agent tier classification is immutable',
                ERRCODE = '23503';
      END IF

      -- Prevent visibility changes
      IF NEW.visibility != OLD.visibility THEN
        RAISE EXCEPTION 'Cannot change visibility of protected agent: %', OLD.name
          USING HINT = 'Agent visibility status is immutable for protected agents',
                ERRCODE = '23503';
      END IF

      -- Log modification attempt
      INSERT INTO agent_audit_log (
        agent_name,
        operation,
        user_id,
        timestamp,
        old_values,
        new_values,
        blocked
      ) VALUES (
        OLD.name,
        'UPDATE_PROTECTED',
        CURRENT_USER,
        NOW(),
        row_to_json(OLD),
        row_to_json(NEW),
        FALSE
      );

    END IF
  END IF

  -- Allow modification
  RETURN NEW;
END;

COMPLEXITY: O(1) - Constant time checks
```

### 5.2 Database Constraint (Tier Immutability)

```sql
-- Create immutable tier constraint for protected agents
ALTER TABLE system_agent_templates
  ADD CONSTRAINT tier_immutable_for_protected
  CHECK (
    -- If agent was protected, tier cannot change
    (tier = 2 AND visibility = 'protected')
    IMPLIES
    (tier = tier)  -- This prevents updates via constraint
  );

-- Alternative: Use trigger for more flexible logic
CREATE TRIGGER enforce_tier_immutability
  BEFORE UPDATE ON system_agent_templates
  FOR EACH ROW
  WHEN (OLD.tier = 2 AND OLD.visibility = 'protected')
  EXECUTE FUNCTION prevent_tier_modification();
```

### 5.3 Audit Log Table

```sql
-- Create audit log for protection events
CREATE TABLE agent_protection_audit (
  id SERIAL PRIMARY KEY,
  agent_name VARCHAR(100) NOT NULL,
  operation VARCHAR(50) NOT NULL,  -- UPDATE, DELETE, READ
  user_id VARCHAR(100),
  user_role VARCHAR(50),
  blocked BOOLEAN DEFAULT TRUE,
  protection_reason VARCHAR(100),
  timestamp TIMESTAMP DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  request_payload JSONB,

  -- Index for querying
  INDEX idx_agent_protection_audit_timestamp (timestamp DESC),
  INDEX idx_agent_protection_audit_agent (agent_name),
  INDEX idx_agent_protection_audit_blocked (blocked, timestamp DESC)
);

COMMENT ON TABLE agent_protection_audit IS
  'Audit log for all protection-related events on agents';
```

### 5.4 Function: Check Agent Protection

```sql
FUNCTION: is_agent_protected
INPUT: p_agent_name VARCHAR
OUTPUT: BOOLEAN

BEGIN
  DECLARE
    v_tier INTEGER;
    v_visibility VARCHAR;
    v_is_protected BOOLEAN;
  BEGIN
    -- Get agent tier and visibility
    SELECT tier, visibility
    INTO v_tier, v_visibility
    FROM system_agent_templates
    WHERE name = p_agent_name;

    -- Check if not found
    IF NOT FOUND THEN
      RETURN FALSE;
    END IF

    -- Check protection criteria
    v_is_protected := (
      (v_tier = 2 AND v_visibility = 'protected') OR
      p_agent_name IN (
        'agent-architect-agent',
        'agent-maintenance-agent',
        'skills-architect-agent',
        'skills-maintenance-agent',
        'learning-optimizer-agent',
        'system-architect-agent',
        'meta-agent',
        'meta-update-agent'
      )
    );

    RETURN v_is_protected;
  END;
END;

COMPLEXITY: O(1) - Single row lookup with primary key
```

---

## 6. Protected Agent Registry

### 6.1 Protected Agent List

```typescript
/**
 * Complete registry of protected agents
 * Generated from specification analysis
 */
CONST PROTECTED_AGENTS = {

  // Phase 4.2 Specialist Agents (T2, protected)
  PHASE_4_2_SPECIALISTS: [
    {
      slug: 'agent-architect-agent',
      tier: 2,
      visibility: 'protected',
      reason: 'Creates new agent configurations',
      criticality: 'HIGH',
      canDelete: FALSE
    },
    {
      slug: 'agent-maintenance-agent',
      tier: 2,
      visibility: 'protected',
      reason: 'Updates existing agent configurations',
      criticality: 'HIGH',
      canDelete: FALSE
    },
    {
      slug: 'skills-architect-agent',
      tier: 2,
      visibility: 'protected',
      reason: 'Creates new skill definitions',
      criticality: 'HIGH',
      canDelete: FALSE
    },
    {
      slug: 'skills-maintenance-agent',
      tier: 2,
      visibility: 'protected',
      reason: 'Updates existing skill definitions',
      criticality: 'HIGH',
      canDelete: FALSE
    },
    {
      slug: 'learning-optimizer-agent',
      tier: 2,
      visibility: 'protected',
      reason: 'Manages autonomous learning system',
      criticality: 'HIGH',
      canDelete: FALSE
    },
    {
      slug: 'system-architect-agent',
      tier: 2,
      visibility: 'protected',
      reason: 'Manages system-wide architecture',
      criticality: 'CRITICAL',
      canDelete: FALSE
    }
  ],

  // Meta-Coordination Agents (T1, protected)
  META_AGENTS: [
    {
      slug: 'meta-agent',
      tier: 1,
      visibility: 'protected',
      reason: 'Generates new agents - core platform capability',
      criticality: 'CRITICAL',
      canDelete: FALSE
    },
    {
      slug: 'meta-update-agent',
      tier: 1,
      visibility: 'protected',
      reason: 'Updates agents - core platform capability',
      criticality: 'CRITICAL',
      canDelete: FALSE
    }
  ],

  // System Directory Agents (filesystem read-only)
  SYSTEM_DIRECTORY: {
    pattern: '^\.system/',
    description: 'All agents in .system directory are read-only',
    protectionLevel: ProtectionLevel.SYSTEM,
    canEdit: FALSE,
    canDelete: FALSE
  }
}

/**
 * Quick lookup set for O(1) protection checks
 */
CONST PROTECTED_AGENT_SLUGS = SET {
  'agent-architect-agent',
  'agent-maintenance-agent',
  'skills-architect-agent',
  'skills-maintenance-agent',
  'learning-optimizer-agent',
  'system-architect-agent',
  'meta-agent',
  'meta-update-agent'
}
```

### 6.2 Protection Reason Messages

```typescript
CONST PROTECTION_MESSAGES = {

  // User-facing warning messages
  WARNINGS: {
    TIER2_PROTECTED: {
      title: "Protected System Agent",
      message: "This agent is part of the core system infrastructure and cannot be modified through the UI.",
      suggestion: "Contact an administrator if changes are required."
    },

    SYSTEM_CRITICAL: {
      title: "System Critical Agent",
      message: "This specialist agent is essential for platform operations and is protected from modification.",
      suggestion: "Changes to system agents require administrator approval and testing."
    },

    FILESYSTEM_READONLY: {
      title: "System Protected",
      message: "This agent is stored in a read-only system directory and cannot be modified.",
      suggestion: "System directory agents are managed by platform administrators."
    },

    META_COORDINATION: {
      title: "Meta-Agent Protection",
      message: "This agent manages the agent lifecycle and must not be modified to prevent system instability.",
      suggestion: "Meta-agents are core platform infrastructure."
    }
  },

  // API error messages
  API_ERRORS: {
    AGENT_PROTECTED: "Cannot modify protected system agent",
    TIER_IMMUTABLE: "Agent tier classification is immutable",
    DELETE_FORBIDDEN: "Protected agents cannot be deleted",
    ADMIN_REQUIRED: "Administrator privileges required to modify this agent"
  },

  // Audit log messages
  AUDIT_MESSAGES: {
    BLOCKED_UPDATE: "Blocked modification attempt on protected agent",
    BLOCKED_DELETE: "Blocked deletion attempt on protected agent",
    ADMIN_OVERRIDE: "Administrator modified protected agent",
    PROTECTION_BYPASS: "Protection bypass attempted (security alert)"
  }
}
```

---

## 7. Error Handling

### 7.1 Error Response Structure

```typescript
INTERFACE ProtectionError {
  success: BOOLEAN;                // Always FALSE for errors
  error: STRING;                   // User-friendly error message
  code: STRING;                    // Machine-readable error code
  httpStatus: INTEGER;             // HTTP status code
  details: OBJECT;                 // Additional error details
  timestamp: STRING;               // ISO-8601 timestamp
  requestId: STRING;               // Request correlation ID
}

ALGORITHM: CreateProtectionError
INPUT: agent (Agent), reason (ProtectionReason), user (UserContext)
OUTPUT: error (ProtectionError)

BEGIN
  // Get appropriate warning message
  warning ← PROTECTION_MESSAGES.WARNINGS[reason]

  // Build error response
  error ← {
    success: FALSE,
    error: warning.message,
    code: "AGENT_" + reason.toUpperCase(),
    httpStatus: 403,
    details: {
      agent: {
        slug: agent.slug,
        name: agent.name,
        tier: agent.tier,
        visibility: agent.visibility
      },
      protection: {
        reason: reason,
        level: DetermineProtectionStatus(agent, user).protectionLevel,
        message: warning.message
      },
      suggestion: warning.suggestion,
      userId: user.userId,
      isAdmin: user.isAdmin
    },
    timestamp: NOW(),
    requestId: GENERATE_UUID()
  }

  RETURN error
END
```

### 7.2 Error Handling Middleware

```javascript
ALGORITHM: ErrorHandlingMiddleware
INPUT: error (Error), request (Request), response (Response), next (Function)
OUTPUT: void (sends error response)

BEGIN
  // Log error
  CALL LogError({
    error: error,
    request: {
      method: request.method,
      path: request.path,
      params: request.params,
      userId: request.user?.id
    },
    timestamp: NOW()
  })

  // Determine if protection-related error
  IF error.code STARTS_WITH "AGENT_" THEN
    // Send structured protection error
    SEND_RESPONSE(response, {
      status: error.httpStatus OR 403,
      body: error
    })
    RETURN
  END IF

  // Generic error handling
  SEND_RESPONSE(response, {
    status: 500,
    body: {
      success: FALSE,
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      requestId: GENERATE_UUID()
    }
  })
END
```

### 7.3 User-Friendly Error Display

```typescript
ALGORITHM: DisplayProtectionError
INPUT: error (ProtectionError)
OUTPUT: ReactElement (Error dialog)

BEGIN
  dialog ← CREATE_DIALOG({
    title: error.details.protection.message,
    icon: "ShieldAlert",
    variant: "warning",
    dismissible: TRUE
  })

  // Add error explanation
  explanation ← CREATE_ELEMENT("p", {
    text: error.error,
    className: "text-gray-700"
  })

  // Add agent details
  agentInfo ← CREATE_INFO_BOX({
    title: "Agent Information",
    items: [
      { label: "Name", value: error.details.agent.name },
      { label: "Tier", value: "Tier " + error.details.agent.tier },
      { label: "Visibility", value: error.details.agent.visibility },
      { label: "Protection", value: error.details.protection.reason }
    ]
  })

  // Add suggestion
  suggestion ← CREATE_ELEMENT("div", {
    className: "mt-4 p-3 bg-blue-50 border border-blue-200 rounded",
    children: [
      CREATE_ICON("Info", { color: "blue", size: 16 }),
      CREATE_TEXT(error.details.suggestion, {
        className: "ml-2 text-sm text-blue-800"
      })
    ]
  })

  // Assemble dialog
  dialog.appendChild(explanation)
  dialog.appendChild(agentInfo)
  dialog.appendChild(suggestion)

  RETURN dialog
END
```

---

## 8. Audit Logging

### 8.1 Security Event Logger

```typescript
ALGORITHM: LogSecurityEvent
INPUT: event (OBJECT)
OUTPUT: void (writes to audit log)

BEGIN
  // Enrich event with metadata
  enrichedEvent ← {
    ...event,
    environment: ENVIRONMENT,
    hostname: HOSTNAME,
    processId: PROCESS_ID,
    severity: DetermineSeverity(event),
    category: "AGENT_PROTECTION"
  }

  // Write to database audit log
  CALL InsertAuditLog(enrichedEvent)

  // Write to application log
  CALL Logger.warn({
    message: "Agent protection event",
    event: enrichedEvent
  })

  // Send alert if high severity
  IF enrichedEvent.severity >= "HIGH" THEN
    CALL SendSecurityAlert({
      type: "PROTECTED_AGENT_MODIFICATION_ATTEMPT",
      event: enrichedEvent,
      recipients: SECURITY_ADMINS
    })
  END IF
END

COMPLEXITY: O(1) - Fixed database writes and log operations
```

### 8.2 Audit Log Query Functions

```sql
FUNCTION: get_protection_attempts
INPUT: p_agent_slug VARCHAR, p_start_date TIMESTAMP, p_end_date TIMESTAMP
OUTPUT: TABLE (event_details)

BEGIN
  RETURN QUERY
  SELECT
    id,
    agent_name,
    operation,
    user_id,
    blocked,
    protection_reason,
    timestamp,
    ip_address,
    user_agent
  FROM agent_protection_audit
  WHERE agent_name = p_agent_slug
    AND timestamp BETWEEN p_start_date AND p_end_date
    AND blocked = TRUE
  ORDER BY timestamp DESC;
END;

COMPLEXITY: O(log n) - Indexed query on timestamp


FUNCTION: get_security_summary
INPUT: p_days INTEGER
OUTPUT: TABLE (summary_stats)

BEGIN
  RETURN QUERY
  SELECT
    agent_name,
    operation,
    COUNT(*) as attempt_count,
    COUNT(DISTINCT user_id) as unique_users,
    MAX(timestamp) as last_attempt
  FROM agent_protection_audit
  WHERE blocked = TRUE
    AND timestamp >= NOW() - INTERVAL '1 day' * p_days
  GROUP BY agent_name, operation
  ORDER BY attempt_count DESC;
END;

COMPLEXITY: O(n) - Full table scan with grouping (acceptable for audit logs)
```

---

## 9. Test Cases

### 9.1 Protection Detection Tests

```typescript
TEST SUITE: ProtectionDetection

TEST CASE: "Should detect Tier 2 protected agent"
  INPUT:
    agent = {
      slug: "agent-architect-agent",
      tier: 2,
      visibility: "protected"
    }
    user = { isAdmin: FALSE }

  ALGORITHM:
    protection ← DetermineProtectionStatus(agent, user)

  ASSERTIONS:
    ASSERT protection.isProtected = TRUE
    ASSERT protection.protectionReason = ProtectionReason.TIER2_PROTECTED
    ASSERT protection.canEdit = FALSE
    ASSERT protection.canDelete = FALSE
  END
END TEST

TEST CASE: "Should allow admin to edit protected agent"
  INPUT:
    agent = {
      slug: "skills-architect-agent",
      tier: 2,
      visibility: "protected"
    }
    user = { isAdmin: TRUE }

  ALGORITHM:
    protection ← DetermineProtectionStatus(agent, user)

  ASSERTIONS:
    ASSERT protection.isProtected = TRUE
    ASSERT protection.canEdit = TRUE
    ASSERT protection.canDelete = FALSE  // Still cannot delete
  END
END TEST

TEST CASE: "Should detect system directory agent"
  INPUT:
    agent = {
      slug: "test-integrity-checker",
      filePath: "/workspaces/agent-feed/prod/.claude/agents/.system/test-integrity-checker.protected.yaml"
    }
    user = { isAdmin: FALSE }

  ALGORITHM:
    protection ← DetermineProtectionStatus(agent, user)

  ASSERTIONS:
    ASSERT protection.isProtected = TRUE
    ASSERT protection.protectionReason = ProtectionReason.FILESYSTEM_READONLY
    ASSERT protection.protectionLevel = ProtectionLevel.SYSTEM
    ASSERT protection.canEdit = FALSE
  END
END TEST

TEST CASE: "Should allow modification of Tier 1 public agent"
  INPUT:
    agent = {
      slug: "personal-todos-agent",
      tier: 1,
      visibility: "public"
    }
    user = { isAdmin: FALSE }

  ALGORITHM:
    protection ← DetermineProtectionStatus(agent, user)

  ASSERTIONS:
    ASSERT protection.isProtected = FALSE
    ASSERT protection.canEdit = TRUE
    ASSERT protection.canDelete = TRUE
  END
END TEST
```

### 9.2 API Protection Tests

```typescript
TEST SUITE: APIProtection

TEST CASE: "Should block PATCH request on protected agent"
  INPUT:
    request = {
      method: "PATCH",
      path: "/api/agents/meta-agent",
      body: { description: "Updated description" },
      user: { isAdmin: FALSE }
    }

  ALGORITHM:
    response ← CALL UpdateAgentEndpoint(request)

  ASSERTIONS:
    ASSERT response.status = 403
    ASSERT response.body.success = FALSE
    ASSERT response.body.code = "AGENT_PROTECTED"
  END
END TEST

TEST CASE: "Should block DELETE request on protected agent"
  INPUT:
    request = {
      method: "DELETE",
      path: "/api/agents/learning-optimizer-agent",
      user: { isAdmin: TRUE }  // Even admins cannot delete
    }

  ALGORITHM:
    response ← CALL DeleteAgentEndpoint(request)

  ASSERTIONS:
    ASSERT response.status = 403
    ASSERT response.body.code = "AGENT_DELETE_FORBIDDEN"
  END
END TEST

TEST CASE: "Should allow GET request on protected agent"
  INPUT:
    request = {
      method: "GET",
      path: "/api/agents/system-architect-agent",
      user: { isAdmin: FALSE }
    }

  ALGORITHM:
    response ← CALL GetAgentEndpoint(request)

  ASSERTIONS:
    ASSERT response.status = 200
    ASSERT response.body.success = TRUE
    ASSERT response.body.data IS NOT NULL
  END
END TEST

TEST CASE: "Should log protection violation attempt"
  INPUT:
    request = {
      method: "PATCH",
      path: "/api/agents/agent-architect-agent",
      user: { userId: "user123", isAdmin: FALSE }
    }

  ALGORITHM:
    response ← CALL UpdateAgentEndpoint(request)
    auditLog ← QUERY SELECT * FROM agent_protection_audit
                     WHERE user_id = "user123"
                     ORDER BY timestamp DESC LIMIT 1

  ASSERTIONS:
    ASSERT response.status = 403
    ASSERT auditLog.agent_name = "agent-architect-agent"
    ASSERT auditLog.operation = "UPDATE"
    ASSERT auditLog.blocked = TRUE
  END
END TEST
```

### 9.3 UI Protection Tests

```typescript
TEST SUITE: UIProtection

TEST CASE: "Should render protection badge for protected agent"
  INPUT:
    agent = {
      slug: "skills-maintenance-agent",
      tier: 2,
      visibility: "protected"
    }

  ALGORITHM:
    badge ← RenderProtectionBadge(agent, { isAdmin: FALSE })

  ASSERTIONS:
    ASSERT badge IS NOT NULL
    ASSERT badge.text = "Protected"
    ASSERT badge.color = "#F59E0B"  // Amber
  END
END TEST

TEST CASE: "Should disable edit button for protected agent"
  INPUT:
    agent = {
      slug: "meta-agent",
      tier: 1,
      visibility: "protected"
    }

  ALGORITHM:
    buttonState ← GetEditButtonState(agent, { isAdmin: FALSE })

  ASSERTIONS:
    ASSERT buttonState.disabled = TRUE
    ASSERT buttonState.text = "Protected"
    ASSERT buttonState.tooltip CONTAINS "Meta-agent"
  END
END TEST

TEST CASE: "Should render read-only form for protected agent"
  INPUT:
    agent = {
      slug: "learning-optimizer-agent",
      tier: 2,
      visibility: "protected"
    }
    mode = "edit"

  ALGORITHM:
    form ← RenderAgentForm(agent, { isAdmin: FALSE }, mode)

  ASSERTIONS:
    ASSERT form.readOnly = TRUE
    ASSERT form.fields[0].type = "alert"  // Warning banner
    ASSERT form.onSubmit = NULL
  END
END TEST
```

### 9.4 Bypass Attempt Tests

```typescript
TEST SUITE: BypassAttemptTests

TEST CASE: "Should block tier modification via API"
  INPUT:
    request = {
      method: "PATCH",
      path: "/api/agents/personal-todos-agent",
      body: { tier: 2 },  // Attempt to change from 1 to 2
      user: { isAdmin: FALSE }
    }

  ALGORITHM:
    response ← CALL UpdateAgentEndpoint(request)

  ASSERTIONS:
    ASSERT response.status = 403
    ASSERT response.body.code = "TIER_IMMUTABLE"
  END
END TEST

TEST CASE: "Should block visibility change on protected agent"
  INPUT:
    request = {
      method: "PATCH",
      path: "/api/agents/meta-agent",
      body: { visibility: "public" },  // Attempt to make public
      user: { isAdmin: TRUE }
    }

  ALGORITHM:
    response ← CALL UpdateAgentEndpoint(request)

  ASSERTIONS:
    ASSERT response.status = 403
    ASSERT response.body.error CONTAINS "immutable"
  END
END TEST

TEST CASE: "Should block direct database update on protected agent"
  INPUT:
    sql = "UPDATE system_agent_templates
           SET description = 'Hacked'
           WHERE name = 'meta-agent'"

  ALGORITHM:
    TRY
      EXECUTE sql
      result = "SUCCESS"
    CATCH exception
      result = "BLOCKED"
    END TRY

  ASSERTIONS:
    ASSERT result = "BLOCKED"
    ASSERT exception.code = "23503"  // Trigger exception
  END
END TEST
```

---

## 10. Complexity Analysis

### 10.1 Algorithm Complexity Summary

| Algorithm | Time Complexity | Space Complexity | Notes |
|-----------|----------------|------------------|-------|
| `DetermineProtectionStatus` | O(1) | O(1) | Hash set lookups are O(1) |
| `IsSystemDirectoryAgent` | O(1) | O(1) | Regex match on fixed path |
| `CanUserModifyAgent` | O(1) | O(1) | Delegates to O(1) function |
| `RenderProtectionBadge` | O(1) | O(1) | Fixed DOM operations |
| `GetEditButtonState` | O(1) | O(1) | Simple conditionals |
| `ProtectionMiddleware` | O(1) | O(1) | Agent lookup O(1) with cache |
| `ValidateProtection` | O(1) | O(1) | Switch statement |
| `UpdateAgentEndpoint` | O(1) | O(1) | All sub-operations O(1) |
| `DeleteAgentEndpoint` | O(1) | O(1) | Protection check + delete |
| `LogSecurityEvent` | O(1) | O(1) | Fixed database write |
| `Database Trigger` | O(1) | O(1) | Row-level trigger |
| `RenderAgentForm` | O(n) | O(n) | n = number of fields (~10) |

### 10.2 Performance Considerations

**Frontend Performance**:
- Protection badge rendering: <1ms per agent
- Form field disabling: <5ms for typical form (10 fields)
- Total UI overhead: <10ms per agent card

**API Performance**:
- Protection validation: <1ms per request
- Database trigger execution: <2ms per UPDATE/DELETE
- Audit log insertion: <3ms per event
- Total API overhead: <5ms per protected request

**Database Performance**:
- Protection status query: O(1) with primary key lookup
- Audit log query: O(log n) with timestamp index
- Protection trigger: O(1) per row modification

**Scalability**:
- Protected agent count: 8 agents (constant, scales to O(1))
- Cache invalidation: Not required (static protection list)
- Concurrent requests: No locking, pure read operations

### 10.3 Optimization Opportunities

**Current Implementation**:
```typescript
// Naive approach: Check each condition separately
IF agent.tier = 2 AND agent.visibility = "protected" THEN ...
IF agent.slug IN PHASE_4_2_SPECIALISTS THEN ...
IF IsSystemDirectoryAgent(agent) THEN ...
```

**Optimized Implementation**:
```typescript
// Use hash set for O(1) lookup
IF agent.slug IN PROTECTED_AGENT_SLUGS THEN
  // Single lookup, return cached protection object
  RETURN PROTECTION_CACHE[agent.slug]
END IF
```

**Cache Strategy**:
```typescript
// Initialize protection cache at startup
CONST PROTECTION_CACHE = MAP()

FOR EACH slug IN PROTECTED_AGENT_SLUGS DO
  PROTECTION_CACHE[slug] ← {
    isProtected: TRUE,
    protectionReason: GetReasonForSlug(slug),
    protectionLevel: ProtectionLevel.PROTECTED,
    canEdit: FALSE,
    canDelete: FALSE,
    canViewSource: TRUE,
    warningMessage: GetWarningForSlug(slug)
  }
END FOR

// O(1) lookup during runtime
FUNCTION DetermineProtectionStatus(agent, user)
  IF agent.slug IN PROTECTION_CACHE THEN
    protection ← CLONE(PROTECTION_CACHE[agent.slug])

    // Apply admin override
    IF user.isAdmin THEN
      protection.canEdit ← TRUE
    END IF

    RETURN protection
  END IF

  // Default: Not protected
  RETURN DEFAULT_PROTECTION
END FUNCTION
```

---

## 11. Implementation Checklist

### 11.1 Backend Implementation

- [ ] Add `tier` and `visibility` fields to agent frontmatter parser
- [ ] Implement `DetermineProtectionStatus` function
- [ ] Create protection validation middleware
- [ ] Update API endpoints (PATCH, DELETE) with protection checks
- [ ] Add audit logging for protection events
- [ ] Create database triggers for immutability
- [ ] Implement protection helper functions
- [ ] Add unit tests for protection logic
- [ ] Add integration tests for API protection

### 11.2 Frontend Implementation

- [ ] Create `ProtectionBadge` component
- [ ] Create `ProtectedAgentIndicator` component
- [ ] Update `AgentCard` with protection styling
- [ ] Update `EditButton` with disabled state logic
- [ ] Create read-only form view
- [ ] Add protection warning dialogs
- [ ] Update agent list filtering (show/hide protected)
- [ ] Add protection status to agent detail page
- [ ] Implement error display for protection violations
- [ ] Add unit tests for UI components
- [ ] Add E2E tests for protection UX

### 11.3 Database Implementation

- [ ] Run migration to add tier/visibility columns
- [ ] Create `agent_protection_audit` table
- [ ] Create protection validation triggers
- [ ] Create audit query functions
- [ ] Add indexes for protection queries
- [ ] Backfill protected agent data
- [ ] Validate constraint enforcement
- [ ] Test rollback script

### 11.4 Testing & Validation

- [ ] Unit tests for protection detection (10 test cases)
- [ ] API integration tests (5 endpoints)
- [ ] Database trigger tests (3 scenarios)
- [ ] UI component tests (5 components)
- [ ] E2E protection workflow tests (3 scenarios)
- [ ] Security bypass attempt tests (5 scenarios)
- [ ] Performance benchmarks (all algorithms)
- [ ] Load testing (concurrent protection checks)

### 11.5 Documentation

- [ ] API documentation (protection endpoints)
- [ ] User guide (protected agent explanation)
- [ ] Admin guide (protection override procedures)
- [ ] Security documentation (audit log usage)
- [ ] Developer guide (adding new protected agents)

---

## 12. Security Considerations

### 12.1 Attack Vectors

**1. Direct Database Modification**
- **Threat**: Attacker with database access bypasses API protection
- **Mitigation**: Database triggers enforce protection at storage layer
- **Severity**: HIGH

**2. Session Hijacking**
- **Threat**: Attacker steals admin session to modify protected agents
- **Mitigation**: Audit logging tracks all modifications with IP/user agent
- **Severity**: MEDIUM

**3. API Bypass**
- **Threat**: Attacker finds unprotected API endpoint
- **Mitigation**: Middleware on ALL modification endpoints
- **Severity**: HIGH

**4. Client-Side Tampering**
- **Threat**: User modifies JavaScript to enable edit buttons
- **Mitigation**: Server-side validation is source of truth
- **Severity**: LOW (cosmetic only)

### 12.2 Security Best Practices

1. **Defense in Depth**: Three layers (UI, API, Database)
2. **Audit Everything**: Log all attempts (successful and blocked)
3. **Fail Secure**: Default to protected if detection fails
4. **Immutability**: Tier and visibility cannot change once set
5. **No Deletion**: Protected agents cannot be deleted (even by admins)

---

## Appendix A: Example Scenarios

### Scenario 1: User Attempts to Edit Protected Agent

```
USER ACTION: Click "Edit" button on agent-architect-agent card

FRONTEND:
  1. GetEditButtonState() determines button should be disabled
  2. Button shows "Protected" text with amber styling
  3. Tooltip displays: "System specialist agent - critical for platform operations"
  4. onClick handler shows warning dialog instead of edit form

BACKEND: No API call made (prevented by UI)

OUTCOME: User sees clear explanation, no error, graceful UX
```

### Scenario 2: Admin Modifies Protected Agent

```
USER ACTION: Admin user edits learning-optimizer-agent description

FRONTEND:
  1. DetermineProtectionStatus() recognizes admin user
  2. Edit button is enabled (protection.canEdit = TRUE)
  3. Form loads with all fields editable
  4. Warning banner shows: "Editing protected agent - changes affect system behavior"

BACKEND:
  1. PATCH /api/agents/learning-optimizer-agent received
  2. ProtectionMiddleware allows request (user.isAdmin = TRUE)
  3. Agent updated successfully
  4. Audit log records: { event: "ADMIN_MODIFIED_PROTECTED", blocked: FALSE }

OUTCOME: Admin can modify, full audit trail maintained
```

### Scenario 3: Malicious User Attempts Direct Database Update

```
USER ACTION: Execute SQL: UPDATE system_agent_templates SET tier = 1 WHERE name = 'meta-agent'

DATABASE:
  1. BEFORE UPDATE trigger fires
  2. enforce_tier_immutability function executes
  3. Detects tier change on protected agent
  4. RAISE EXCEPTION: "Cannot change tier of protected agent: meta-agent"
  5. Transaction rolled back

AUDIT LOG:
  1. Trigger inserts event into agent_protection_audit
  2. Event marked as blocked: TRUE
  3. Alert sent to security team

OUTCOME: Modification blocked at database layer, security team alerted
```

---

## Appendix B: Reference Implementation

### Frontend Component (React)

```typescript
// /frontend/src/components/agents/ProtectionBadge.tsx
import React from 'react';
import { ShieldAlert, Lock, Key } from 'lucide-react';

interface ProtectionBadgeProps {
  agent: Agent;
  user: UserContext;
}

export const ProtectionBadge: React.FC<ProtectionBadgeProps> = ({ agent, user }) => {
  const protection = determineProtectionStatus(agent, user);

  if (!protection.isProtected) return null;

  const config = {
    [ProtectionLevel.SYSTEM]: {
      icon: Lock,
      color: '#DC2626',
      text: 'System Protected'
    },
    [ProtectionLevel.PROTECTED]: {
      icon: ShieldAlert,
      color: '#F59E0B',
      text: 'Protected'
    },
    [ProtectionLevel.ADMIN_ONLY]: {
      icon: Key,
      color: '#8B5CF6',
      text: 'Admin Only'
    }
  }[protection.protectionLevel];

  const Icon = config.icon;

  return (
    <div
      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold"
      style={{ backgroundColor: config.color, color: 'white' }}
      title={protection.warningMessage}
    >
      <Icon size={12} />
      <span>{config.text}</span>
    </div>
  );
};
```

### Backend Middleware (Node.js)

```javascript
// /api-server/middleware/protection.middleware.js
export const protectionMiddleware = async (req, res, next) => {
  // Skip for GET requests
  if (req.method === 'GET') return next();

  const agentSlug = req.params.slug || req.params.id;
  const agent = await getAgentBySlug(agentSlug);

  if (!agent) {
    return res.status(404).json({
      success: false,
      error: 'Agent not found'
    });
  }

  const user = {
    userId: req.user?.id || 'anonymous',
    isAdmin: req.user?.isAdmin || false
  };

  const protection = determineProtectionStatus(agent, user);

  if (protection.isProtected && !protection.canEdit) {
    logSecurityEvent({
      event: 'PROTECTED_AGENT_MODIFICATION_ATTEMPT',
      agentSlug,
      userId: user.userId,
      method: req.method,
      ip: req.ip
    });

    return res.status(403).json({
      success: false,
      error: 'Cannot modify protected system agent',
      code: 'AGENT_PROTECTED',
      details: {
        protectionReason: protection.protectionReason,
        message: protection.warningMessage
      }
    });
  }

  req.agentProtection = protection;
  next();
};
```

---

**END OF PSEUDOCODE DOCUMENT**

**Document Control**:
- **Status**: Ready for Implementation
- **Review Required**: Security Team, Tech Lead, Product Owner
- **Next Phase**: Code Implementation (SPARC Completion)
- **Estimated Implementation Time**: 2 weeks (6 specialist agents, 3 layers)

**Approvals**:
- [ ] Security Review (Protection mechanisms)
- [ ] Tech Lead (Architecture and complexity)
- [ ] Product Owner (UX and error messaging)
- [ ] Database Admin (Trigger and constraint validation)
