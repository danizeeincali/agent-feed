# Pseudocode: Agent Icon Loading System

**Date:** 2025-10-19
**Phase:** PSEUDOCODE
**Project:** Agent Feed - Tier Classification System
**Specification:** `/workspaces/agent-feed/docs/SPARC-AGENT-TIER-SYSTEM-SPEC.md`
**Research:** `/workspaces/agent-feed/docs/SVG-ICON-RESEARCH.md`

---

## Table of Contents

1. [Algorithm Overview](#algorithm-overview)
2. [Data Structures](#data-structures)
3. [Icon Resolution Algorithm](#icon-resolution-algorithm)
4. [SVG Icon Loading](#svg-icon-loading)
5. [Emoji Fallback System](#emoji-fallback-system)
6. [Initials Fallback System](#initials-fallback-system)
7. [Icon Mapping Configuration](#icon-mapping-configuration)
8. [AgentIcon Component](#agenticon-component)
9. [Performance Optimization](#performance-optimization)
10. [Accessibility Implementation](#accessibility-implementation)
11. [Error Handling](#error-handling)
12. [Test Cases](#test-cases)

---

## Algorithm Overview

### Three-Level Fallback Strategy

```
ALGORITHM: ResolveAgentIcon
INPUT: agent (Agent), options (IconOptions)
OUTPUT: IconComponent (renderable React element)

BEGIN
    // Level 1: Try SVG icon
    IF agent.icon EXISTS AND agent.icon_type = 'svg' THEN
        svgIcon ← LoadSVGIcon(agent.icon)
        IF svgIcon.loaded THEN
            RETURN RenderSVGIcon(svgIcon, options)
        END IF
    END IF

    // Level 2: Try emoji fallback
    IF agent.icon_emoji EXISTS AND IsValidEmoji(agent.icon_emoji) THEN
        RETURN RenderEmojiIcon(agent.icon_emoji, options)
    END IF

    // Level 3: Use initials fallback
    initials ← GenerateInitials(agent.name)
    color ← GetTierColor(agent.tier)
    RETURN RenderInitialsIcon(initials, color, options)
END
```

**Complexity Analysis:**
- **Time Complexity**: O(1) - Constant time lookups and renders
- **Space Complexity**: O(1) - Fixed size icon cache per agent
- **Cache Hits**: O(1) - Direct map lookup for cached icons

---

## Data Structures

### TypeScript Interfaces

```typescript
/**
 * Agent Data Model (from specification)
 */
INTERFACE Agent {
    // Core fields
    id: string
    slug: string
    name: string
    description: string

    // Tier system fields
    tier: 1 | 2
    visibility: 'public' | 'protected'

    // Icon configuration
    icon?: string                    // Path to SVG or lucide-react icon name
    icon_type?: 'svg' | 'emoji' | 'lucide'
    icon_emoji?: string              // Single emoji character

    // Display configuration
    color: string                    // Hex color for tier/initials
    avatar_url?: string              // Optional custom avatar
    status: 'active' | 'inactive' | 'error'
}

/**
 * Icon Options Configuration
 */
INTERFACE IconOptions {
    size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
    fallbackMode: 'emoji' | 'initials' | 'auto'
    showStatus: boolean
    className: string
    decorative: boolean
    ariaLabel?: string
}

/**
 * Size Mapping System
 */
CONSTANT ICON_SIZES = {
    xs: { px: 12, class: 'w-3 h-3', fontSize: 'text-xs' },
    sm: { px: 16, class: 'w-4 h-4', fontSize: 'text-sm' },
    md: { px: 20, class: 'w-5 h-5', fontSize: 'text-base' },
    lg: { px: 24, class: 'w-6 h-6', fontSize: 'text-lg' },
    xl: { px: 32, class: 'w-8 h-8', fontSize: 'text-xl' },
    '2xl': { px: 40, class: 'w-10 h-10', fontSize: 'text-2xl' }
}

/**
 * Icon Cache Entry
 */
INTERFACE CachedIcon {
    component: React.ComponentType | null
    timestamp: number
    loadStatus: 'pending' | 'loaded' | 'failed'
    errorCount: number
}

/**
 * Icon Map Entry
 */
INTERFACE IconMapEntry {
    lucideIcon: string              // lucide-react icon name
    emoji: string                   // Fallback emoji
    description: string             // Accessibility description
}

/**
 * Global Icon Cache
 */
DATA_STRUCTURE IconCache {
    storage: Map<string, CachedIcon>
    maxSize: 50                      // Maximum cached icons
    ttl: 300000                      // 5 minutes in milliseconds

    OPERATIONS:
        get(key: string): CachedIcon | null
        set(key: string, icon: CachedIcon): void
        clear(): void
        evict(): void                // LRU eviction when maxSize reached
}
```

---

## Icon Resolution Algorithm

### Main Resolution Logic

```
ALGORITHM: ResolveAgentIcon
INPUT:
    agent: Agent
    options: IconOptions = DEFAULT_OPTIONS
OUTPUT:
    IconComponent: React.ReactElement

CONSTANTS:
    DEFAULT_OPTIONS = {
        size: 'md',
        fallbackMode: 'auto',
        showStatus: false,
        className: '',
        decorative: false
    }

BEGIN
    // Normalize options
    normalizedOptions ← MergeOptions(DEFAULT_OPTIONS, options)

    // Generate cache key
    cacheKey ← GenerateCacheKey(agent.id, normalizedOptions)

    // Check cache first
    cached ← IconCache.get(cacheKey)
    IF cached EXISTS AND cached.loadStatus = 'loaded' THEN
        RETURN RenderCachedIcon(cached, normalizedOptions)
    END IF

    // LEVEL 1: SVG Icon Resolution
    IF agent.icon EXISTS THEN
        iconResult ← TryLoadSVGIcon(agent)
        IF iconResult.success THEN
            IconCache.set(cacheKey, {
                component: iconResult.component,
                loadStatus: 'loaded',
                timestamp: CurrentTime(),
                errorCount: 0
            })
            RETURN RenderSVGIcon(iconResult.component, normalizedOptions)
        END IF

        // Log fallback reason
        LogIconFallback(agent.id, 'svg-failed', iconResult.error)
    END IF

    // LEVEL 2: Emoji Fallback
    IF agent.icon_emoji EXISTS THEN
        IF ValidateEmoji(agent.icon_emoji) THEN
            RETURN RenderEmojiIcon(agent.icon_emoji, normalizedOptions)
        ELSE
            LogIconFallback(agent.id, 'emoji-invalid', agent.icon_emoji)
        END IF
    END IF

    // LEVEL 3: Initials Fallback
    initialsConfig ← GenerateInitialsConfig(agent)
    RETURN RenderInitialsIcon(initialsConfig, normalizedOptions)
END

/**
 * Cache Key Generation
 */
FUNCTION GenerateCacheKey(agentId: string, options: IconOptions): string
BEGIN
    components ← [
        agentId,
        options.size,
        options.fallbackMode,
        options.showStatus ? 'status' : 'no-status'
    ]
    RETURN components.join(':')
END

/**
 * Options Merging
 */
FUNCTION MergeOptions(defaults: IconOptions, overrides: Partial<IconOptions>): IconOptions
BEGIN
    merged ← { ...defaults }
    FOR EACH key IN overrides DO
        IF overrides[key] IS NOT undefined THEN
            merged[key] ← overrides[key]
        END IF
    END FOR
    RETURN merged
END
```

**Complexity:**
- **Time**: O(1) with cache, O(log n) for dynamic import
- **Space**: O(k) where k = number of unique icon configurations

---

## SVG Icon Loading

### Strategy 1: Lucide-React Icon Loading

```
ALGORITHM: LoadLucideIcon
INPUT: iconName: string
OUTPUT: IconComponent | Error

CONSTANTS:
    LUCIDE_ICON_MAP = {
        'Bot': 'Bot',
        'User': 'User',
        'MessageSquare': 'MessageSquare',
        'Calendar': 'Calendar',
        'CheckSquare': 'CheckSquare',
        // ... see Icon Mapping section
    }

BEGIN
    // Validate icon name
    IF iconName NOT IN LUCIDE_ICON_MAP THEN
        RETURN Error('Invalid lucide icon name')
    END IF

    // Check if icon already imported
    IF LucideIconCache.has(iconName) THEN
        RETURN LucideIconCache.get(iconName)
    END IF

    // Dynamic import from lucide-react
    TRY
        module ← IMPORT('lucide-react')
        IconComponent ← module[iconName]

        IF IconComponent IS undefined THEN
            THROW Error('Icon not found in lucide-react')
        END IF

        // Cache the component
        LucideIconCache.set(iconName, IconComponent)

        RETURN IconComponent

    CATCH error
        LogError('Lucide icon load failed', {
            iconName: iconName,
            error: error.message
        })
        RETURN Error(error.message)
    END TRY
END

/**
 * Lucide Icon Component Wrapper
 */
FUNCTION RenderLucideIcon(
    IconComponent: LucideIcon,
    options: IconOptions,
    agent: Agent
): React.ReactElement
BEGIN
    sizeClass ← ICON_SIZES[options.size].class
    color ← GetIconColor(agent.tier, agent.status)

    props ← {
        className: `${sizeClass} ${color} ${options.className}`,
        strokeWidth: 2,
        'aria-hidden': options.decorative,
        'aria-label': options.decorative ? undefined : options.ariaLabel,
        role: options.decorative ? undefined : 'img'
    }

    RETURN <IconComponent {...props} />
END
```

### Strategy 2: Custom SVG File Loading

```
ALGORITHM: LoadCustomSVG
INPUT: svgPath: string
OUTPUT: SVGComponent | Error

CONSTANTS:
    SVG_BASE_PATH = '/icons/agents/'
    ALLOWED_EXTENSIONS = ['.svg']
    MAX_FILE_SIZE = 10240  // 10KB

BEGIN
    // Validate SVG path
    validation ← ValidateSVGPath(svgPath)
    IF NOT validation.valid THEN
        RETURN Error(validation.error)
    END IF

    // Construct full path
    fullPath ← NormalizePath(SVG_BASE_PATH + svgPath)

    // Check cache
    IF SVGCache.has(fullPath) THEN
        cached ← SVGCache.get(fullPath)
        IF CurrentTime() - cached.timestamp < CACHE_TTL THEN
            RETURN cached.component
        END IF
    END IF

    // Load SVG file
    TRY
        svgContent ← FetchSVG(fullPath)

        // Validate SVG content
        IF NOT IsValidSVG(svgContent) THEN
            THROW Error('Invalid SVG content')
        END IF

        // Check file size
        IF svgContent.size > MAX_FILE_SIZE THEN
            THROW Error('SVG file too large')
        END IF

        // Sanitize SVG content
        sanitized ← SanitizeSVG(svgContent)

        // Create React component
        component ← CreateSVGComponent(sanitized)

        // Cache the component
        SVGCache.set(fullPath, {
            component: component,
            timestamp: CurrentTime(),
            loadStatus: 'loaded'
        })

        RETURN component

    CATCH error
        LogError('Custom SVG load failed', {
            path: fullPath,
            error: error.message
        })
        RETURN Error(error.message)
    END TRY
END

/**
 * SVG Path Validation
 */
FUNCTION ValidateSVGPath(path: string): ValidationResult
BEGIN
    // Check for path traversal
    IF path CONTAINS '..' OR path CONTAINS '~' THEN
        RETURN { valid: false, error: 'Path traversal detected' }
    END IF

    // Check file extension
    extension ← GetFileExtension(path)
    IF extension NOT IN ALLOWED_EXTENSIONS THEN
        RETURN { valid: false, error: 'Invalid file extension' }
    END IF

    // Check path pattern
    pattern ← /^[a-z0-9-]+\.svg$/
    IF NOT pattern.test(path) THEN
        RETURN { valid: false, error: 'Invalid path format' }
    END IF

    RETURN { valid: true }
END

/**
 * SVG Sanitization
 */
FUNCTION SanitizeSVG(svgContent: string): string
BEGIN
    // Remove script tags
    sanitized ← svgContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

    // Remove event handlers
    sanitized ← sanitized.replace(/on\w+="[^"]*"/gi, '')

    // Remove javascript: protocol
    sanitized ← sanitized.replace(/javascript:/gi, '')

    // Whitelist safe attributes
    SAFE_ATTRIBUTES ← ['viewBox', 'xmlns', 'fill', 'stroke', 'stroke-width', 'd', 'transform', 'class']

    // Parse and rebuild SVG with safe attributes only
    parsed ← ParseSVG(sanitized)
    cleaned ← RebuildSVG(parsed, SAFE_ATTRIBUTES)

    RETURN cleaned
END
```

**Security Considerations:**
- Path traversal prevention
- XSS attack mitigation
- File size limits
- Content sanitization
- CSP header enforcement

---

## Emoji Fallback System

### Emoji Validation and Rendering

```
ALGORITHM: RenderEmojiIcon
INPUT:
    emoji: string
    options: IconOptions
OUTPUT:
    React.ReactElement

BEGIN
    // Validate emoji
    IF NOT IsValidEmoji(emoji) THEN
        LogWarning('Invalid emoji character', { emoji })
        RETURN RenderInitialsFallback()
    END IF

    // Calculate emoji size based on icon size
    emojiSize ← CalculateEmojiSize(options.size)

    // Create container with consistent sizing
    containerProps ← {
        className: `${ICON_SIZES[options.size].class} flex items-center justify-center rounded-full bg-gray-100 ${options.className}`,
        role: options.decorative ? 'presentation' : 'img',
        'aria-label': options.decorative ? undefined : options.ariaLabel,
        style: {
            fontSize: `${emojiSize}px`,
            lineHeight: 1
        }
    }

    RETURN (
        <div {...containerProps}>
            <span>{emoji}</span>
        </div>
    )
END

/**
 * Emoji Validation
 */
FUNCTION IsValidEmoji(character: string): boolean
BEGIN
    // Check length (emoji can be 1-4 characters due to modifiers)
    IF character.length = 0 OR character.length > 10 THEN
        RETURN false
    END IF

    // Check if valid Unicode emoji
    // Use regex for emoji detection
    emojiRegex ← /[\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Component}]/u

    IF NOT emojiRegex.test(character) THEN
        RETURN false
    END IF

    // Check for dangerous characters
    dangerousChars ← ['<', '>', '&', '"', "'", '`']
    FOR EACH char IN dangerousChars DO
        IF character.includes(char) THEN
            RETURN false
        END IF
    END FOR

    RETURN true
END

/**
 * Emoji Size Calculation
 */
FUNCTION CalculateEmojiSize(iconSize: IconSize): number
BEGIN
    sizePx ← ICON_SIZES[iconSize].px

    // Emoji should be slightly smaller than container for padding
    emojiSizeRatio ← 0.7

    RETURN Math.floor(sizePx * emojiSizeRatio)
END

/**
 * Browser-Specific Emoji Rendering
 */
FUNCTION ApplyEmojiPolyfill(emoji: string): string
BEGIN
    userAgent ← navigator.userAgent

    // Check for older browsers without full emoji support
    IF IsOldAndroid(userAgent) OR IsOldWindows(userAgent) THEN
        // Use emoji image fallback
        RETURN CreateEmojiImageSrc(emoji)
    END IF

    // Modern browsers render emoji natively
    RETURN emoji
END

/**
 * Emoji to Image Fallback
 */
FUNCTION CreateEmojiImageSrc(emoji: string): string
BEGIN
    // Convert emoji to Unicode codepoint
    codepoint ← GetEmojiCodepoint(emoji)

    // Use Twemoji CDN or local emoji images
    RETURN `https://twemoji.maxcdn.com/v/latest/72x72/${codepoint}.png`
    // OR for local: `/emoji/${codepoint}.png`
END
```

**Emoji Mapping Table:**

```typescript
CONSTANT AGENT_EMOJI_MAP = {
    // T1 Agents (User-Facing)
    'personal-todos-agent': '📋',
    'meeting-prep-agent': '📅',
    'meeting-next-steps-agent': '✅',
    'follow-ups-agent': '🔔',
    'get-to-know-you-agent': '👋',
    'link-logger-agent': '🔗',
    'agent-ideas-agent': '💡',
    'agent-feedback-agent': '💬',

    // T2 Agents (System)
    'meta-agent': '⚙️',
    'meta-update-agent': '🔄',
    'skills-architect-agent': '🎨',
    'skills-maintenance-agent': '🔧',
    'agent-architect-agent': '🏗️',
    'agent-maintenance-agent': '🛠️',
    'learning-optimizer-agent': '🧠',
    'system-architect-agent': '🏛️',
    'page-builder-agent': '📄',
    'page-verification-agent': '✓',
    'dynamic-page-testing-agent': '🧪',

    // Default fallback
    'default': '🤖'
}
```

---

## Initials Fallback System

### Initials Generation and Rendering

```
ALGORITHM: GenerateInitials
INPUT: agentName: string
OUTPUT: initials: string (1-2 characters)

BEGIN
    // Clean the agent name
    cleaned ← agentName
        .replace(/-agent$/i, '')      // Remove '-agent' suffix
        .replace(/-/g, ' ')           // Replace hyphens with spaces
        .trim()

    // Split into words
    words ← cleaned.split(/\s+/)

    // Generate initials based on word count
    IF words.length = 0 THEN
        RETURN 'A'  // Default fallback
    ELSE IF words.length = 1 THEN
        // Single word: take first 2 letters
        RETURN words[0].substring(0, 2).toUpperCase()
    ELSE
        // Multiple words: first letter of first 2 words
        first ← words[0].charAt(0).toUpperCase()
        second ← words[1].charAt(0).toUpperCase()
        RETURN first + second
    END IF
END

/**
 * Examples of Initials Generation:
 *
 * Input: "personal-todos-agent"
 * Cleaned: "personal todos"
 * Output: "PT"
 *
 * Input: "meta-agent"
 * Cleaned: "meta"
 * Output: "ME"
 *
 * Input: "get-to-know-you-agent"
 * Cleaned: "get to know you"
 * Output: "GT"
 */

/**
 * Initials Icon Rendering
 */
FUNCTION RenderInitialsIcon(
    agent: Agent,
    options: IconOptions
): React.ReactElement
BEGIN
    initials ← GenerateInitials(agent.name)
    backgroundColor ← GetTierBackgroundColor(agent.tier, agent.color)
    textColor ← GetContrastTextColor(backgroundColor)
    sizeClass ← ICON_SIZES[options.size].class
    fontSize ← CalculateInitialsFontSize(options.size)

    containerProps ← {
        className: `${sizeClass} flex items-center justify-center rounded-full font-semibold ${options.className}`,
        style: {
            backgroundColor: backgroundColor,
            color: textColor,
            fontSize: fontSize
        },
        role: options.decorative ? 'presentation' : 'img',
        'aria-label': options.decorative ? undefined : (options.ariaLabel || agent.name)
    }

    RETURN (
        <div {...containerProps}>
            <span>{initials}</span>
        </div>
    )
END

/**
 * Tier-Based Background Color
 */
FUNCTION GetTierBackgroundColor(tier: number, agentColor?: string): string
BEGIN
    // Use agent's custom color if provided
    IF agentColor EXISTS AND IsValidHexColor(agentColor) THEN
        RETURN agentColor
    END IF

    // Default tier colors
    SWITCH tier
        CASE 1:  // User-facing agents
            RETURN '#3B82F6'  // Blue
        CASE 2:  // System agents
            RETURN '#6B7280'  // Gray
        DEFAULT:
            RETURN '#6366F1'  // Indigo (fallback)
    END SWITCH
END

/**
 * Contrast Text Color Calculation
 */
FUNCTION GetContrastTextColor(backgroundColor: string): string
BEGIN
    // Convert hex to RGB
    rgb ← HexToRGB(backgroundColor)

    // Calculate relative luminance (WCAG formula)
    luminance ← CalculateLuminance(rgb.r, rgb.g, rgb.b)

    // Use white text for dark backgrounds, black for light
    IF luminance > 0.5 THEN
        RETURN '#000000'  // Black
    ELSE
        RETURN '#FFFFFF'  // White
    END IF
END

/**
 * Luminance Calculation (WCAG 2.1)
 */
FUNCTION CalculateLuminance(r: number, g: number, b: number): number
BEGIN
    // Normalize RGB values to 0-1 range
    rNorm ← r / 255
    gNorm ← g / 255
    bNorm ← b / 255

    // Apply gamma correction
    rLinear ← (rNorm <= 0.03928) ? rNorm / 12.92 : ((rNorm + 0.055) / 1.055) ^ 2.4
    gLinear ← (gNorm <= 0.03928) ? gNorm / 12.92 : ((gNorm + 0.055) / 1.055) ^ 2.4
    bLinear ← (bNorm <= 0.03928) ? bNorm / 12.92 : ((bNorm + 0.055) / 1.055) ^ 2.4

    // Calculate relative luminance
    RETURN 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear
END

/**
 * Font Size Calculation for Initials
 */
FUNCTION CalculateInitialsFontSize(iconSize: IconSize): string
BEGIN
    sizePx ← ICON_SIZES[iconSize].px

    // Font size should be ~40% of container size
    fontSize ← Math.floor(sizePx * 0.4)

    RETURN `${fontSize}px`
END
```

**Accessibility Considerations:**
- WCAG 2.1 AA contrast ratio (4.5:1 minimum)
- Proper ARIA labels for screen readers
- Semantic HTML structure

---

## Icon Mapping Configuration

### Complete 19-Agent Icon Mapping

```typescript
/**
 * Lucide-React Icon Assignments
 *
 * Tier 1 (User-Facing) - User-centric icons
 * Tier 2 (System) - Technical/system icons
 */

CONSTANT AGENT_ICON_MAP: Record<string, IconMapEntry> = {
    // ==========================================
    // TIER 1: USER-FACING AGENTS (8 agents)
    // ==========================================

    'personal-todos-agent': {
        lucideIcon: 'CheckSquare',
        emoji: '📋',
        description: 'Task checklist icon for personal todos'
    },

    'meeting-prep-agent': {
        lucideIcon: 'Calendar',
        emoji: '📅',
        description: 'Calendar icon for meeting preparation'
    },

    'meeting-next-steps-agent': {
        lucideIcon: 'ClipboardCheck',
        emoji: '✅',
        description: 'Clipboard with checkmark for action items'
    },

    'follow-ups-agent': {
        lucideIcon: 'Bell',
        emoji: '🔔',
        description: 'Notification bell for follow-up reminders'
    },

    'get-to-know-you-agent': {
        lucideIcon: 'UserCircle',
        emoji: '👋',
        description: 'User profile icon for getting to know preferences'
    },

    'link-logger-agent': {
        lucideIcon: 'Link2',
        emoji: '🔗',
        description: 'Chain link icon for URL logging'
    },

    'agent-ideas-agent': {
        lucideIcon: 'Lightbulb',
        emoji: '💡',
        description: 'Lightbulb icon for agent capability ideas'
    },

    'agent-feedback-agent': {
        lucideIcon: 'MessageSquare',
        emoji: '💬',
        description: 'Chat bubble icon for user feedback'
    },

    // ==========================================
    // TIER 2: SYSTEM AGENTS (11+ agents)
    // ==========================================

    'meta-agent': {
        lucideIcon: 'Settings',
        emoji: '⚙️',
        description: 'Gear icon for agent creation system'
    },

    'meta-update-agent': {
        lucideIcon: 'RefreshCw',
        emoji: '🔄',
        description: 'Refresh icon for agent updates'
    },

    'skills-architect-agent': {
        lucideIcon: 'Palette',
        emoji: '🎨',
        description: 'Palette icon for skill design'
    },

    'skills-maintenance-agent': {
        lucideIcon: 'Wrench',
        emoji: '🔧',
        description: 'Wrench icon for skill maintenance'
    },

    'agent-architect-agent': {
        lucideIcon: 'Building',
        emoji: '🏗️',
        description: 'Building icon for agent architecture'
    },

    'agent-maintenance-agent': {
        lucideIcon: 'Tool',
        emoji: '🛠️',
        description: 'Tools icon for agent maintenance'
    },

    'learning-optimizer-agent': {
        lucideIcon: 'Brain',
        emoji: '🧠',
        description: 'Brain icon for learning optimization'
    },

    'system-architect-agent': {
        lucideIcon: 'Layers',
        emoji: '🏛️',
        description: 'Layers icon for system architecture'
    },

    'page-builder-agent': {
        lucideIcon: 'FileText',
        emoji: '📄',
        description: 'Document icon for page building'
    },

    'page-verification-agent': {
        lucideIcon: 'CheckCircle',
        emoji: '✓',
        description: 'Checkmark icon for page verification'
    },

    'dynamic-page-testing-agent': {
        lucideIcon: 'TestTube2',
        emoji: '🧪',
        description: 'Test tube icon for page testing'
    },

    // ==========================================
    // DEFAULT FALLBACK
    // ==========================================

    'default': {
        lucideIcon: 'Bot',
        emoji: '🤖',
        description: 'Robot icon for unknown agents'
    }
}

/**
 * Icon Lookup Function
 */
FUNCTION GetAgentIcon(agentSlug: string): IconMapEntry
BEGIN
    IF agentSlug IN AGENT_ICON_MAP THEN
        RETURN AGENT_ICON_MAP[agentSlug]
    ELSE
        LogWarning('Unknown agent slug, using default icon', { slug: agentSlug })
        RETURN AGENT_ICON_MAP['default']
    END IF
END

/**
 * Tier Color Mapping
 */
CONSTANT TIER_COLORS = {
    1: {
        primary: '#3B82F6',      // Blue
        light: '#DBEAFE',        // Light blue background
        dark: '#1E40AF',         // Dark blue for hover
        text: '#1E3A8A'          // Text blue
    },
    2: {
        primary: '#6B7280',      // Gray
        light: '#F3F4F6',        // Light gray background
        dark: '#374151',         // Dark gray for hover
        text: '#1F2937'          // Text gray
    }
}
```

---

## AgentIcon Component

### Main Component Structure

```typescript
COMPONENT AgentIcon
INPUT_PROPS:
    agent: Agent
    size?: IconSize = 'md'
    fallbackMode?: 'auto' | 'emoji' | 'initials' = 'auto'
    showStatus?: boolean = false
    className?: string = ''
    decorative?: boolean = false
    ariaLabel?: string

STATE:
    iconLoadStatus: 'loading' | 'loaded' | 'failed'
    iconComponent: React.ComponentType | null
    shouldUseFallback: boolean

BEGIN
    // Initialize state
    [iconLoadStatus, setIconLoadStatus] ← useState('loading')
    [iconComponent, setIconComponent] ← useState(null)
    [shouldUseFallback, setShouldUseFallback] ← useState(false)

    // Effect: Load icon on mount
    useEffect(() => {
        LoadIconAsync()
    }, [agent.id, agent.icon])

    FUNCTION LoadIconAsync(): void
    BEGIN
        // Reset state
        setIconLoadStatus('loading')
        setShouldUseFallback(false)

        // Try to load icon
        TRY
            iconResult ← AWAIT ResolveAgentIcon(agent)

            IF iconResult.success THEN
                setIconComponent(iconResult.component)
                setIconLoadStatus('loaded')
            ELSE
                THROW iconResult.error
            END IF

        CATCH error
            LogIconLoadError(agent.id, error)
            setIconLoadStatus('failed')
            setShouldUseFallback(true)
        END TRY
    END

    // Render logic
    FUNCTION render(): React.ReactElement
    BEGIN
        // Prepare common props
        commonProps ← {
            size: size,
            className: className,
            decorative: decorative,
            ariaLabel: ariaLabel || agent.name
        }

        // Determine which icon to render
        IF iconLoadStatus = 'loaded' AND iconComponent EXISTS THEN
            RETURN RenderLoadedIcon(iconComponent, commonProps)
        END IF

        IF shouldUseFallback OR fallbackMode ≠ 'auto' THEN
            IF fallbackMode = 'emoji' OR (fallbackMode = 'auto' AND agent.icon_emoji) THEN
                RETURN RenderEmojiIcon(agent.icon_emoji, commonProps)
            ELSE
                RETURN RenderInitialsIcon(agent, commonProps)
            END IF
        END IF

        // Loading state
        IF iconLoadStatus = 'loading' THEN
            RETURN RenderLoadingState(commonProps)
        END IF

        // Default fallback
        RETURN RenderInitialsIcon(agent, commonProps)
    END

    /**
     * Render loaded SVG/Lucide icon
     */
    FUNCTION RenderLoadedIcon(
        IconComponent: React.ComponentType,
        props: CommonProps
    ): React.ReactElement
    BEGIN
        sizeClass ← ICON_SIZES[props.size].class
        tierColor ← TIER_COLORS[agent.tier].primary
        statusColor ← GetStatusColor(agent.status)

        RETURN (
            <div
                className={`${sizeClass} rounded-lg flex items-center justify-center relative ${props.className}`}
                style={{ backgroundColor: tierColor }}
            >
                <IconComponent
                    className="w-full h-full p-1 text-white"
                    strokeWidth={2}
                    aria-hidden={props.decorative}
                    aria-label={props.decorative ? undefined : props.ariaLabel}
                />

                {showStatus && (
                    <StatusIndicator
                        status={agent.status}
                        color={statusColor}
                    />
                )}
            </div>
        )
    END

    /**
     * Render loading skeleton
     */
    FUNCTION RenderLoadingState(props: CommonProps): React.ReactElement
    BEGIN
        sizeClass ← ICON_SIZES[props.size].class

        RETURN (
            <div
                className={`${sizeClass} rounded-lg bg-gray-200 animate-pulse ${props.className}`}
                aria-label="Loading icon"
            />
        )
    END

    /**
     * Status indicator overlay
     */
    FUNCTION StatusIndicator(
        status: AgentStatus,
        color: string
    ): React.ReactElement
    BEGIN
        RETURN (
            <div
                className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white"
                style={{ backgroundColor: color }}
                aria-hidden="true"
            />
        )
    END
END

/**
 * Status Color Mapping
 */
FUNCTION GetStatusColor(status: AgentStatus): string
BEGIN
    SWITCH status
        CASE 'active':
            RETURN '#10B981'  // Green
        CASE 'inactive':
            RETURN '#F59E0B'  // Yellow
        CASE 'error':
            RETURN '#EF4444'  // Red
        DEFAULT:
            RETURN '#6B7280'  // Gray
    END SWITCH
END
```

### Component Usage Examples

```typescript
// Example 1: Default usage
<AgentIcon agent={agent} />

// Example 2: Large icon with status
<AgentIcon
    agent={agent}
    size="xl"
    showStatus
/>

// Example 3: Force emoji fallback
<AgentIcon
    agent={agent}
    fallbackMode="emoji"
    size="lg"
/>

// Example 4: Decorative icon (hidden from screen readers)
<AgentIcon
    agent={agent}
    decorative
    className="ml-2"
/>

// Example 5: Custom aria label
<AgentIcon
    agent={agent}
    ariaLabel={`${agent.name} agent profile`}
    size="md"
/>
```

---

## Performance Optimization

### Icon Caching Strategy

```
DATA_STRUCTURE IconCacheManager
BEGIN
    // LRU Cache implementation
    cache: Map<string, CachedIcon>
    accessOrder: LinkedList<string>
    maxSize: number = 50
    ttl: number = 300000  // 5 minutes

    FUNCTION get(key: string): CachedIcon | null
    BEGIN
        IF NOT cache.has(key) THEN
            RETURN null
        END IF

        entry ← cache.get(key)

        // Check TTL expiration
        IF CurrentTime() - entry.timestamp > ttl THEN
            cache.delete(key)
            accessOrder.remove(key)
            RETURN null
        END IF

        // Update access order (LRU)
        accessOrder.moveToFront(key)

        RETURN entry
    END

    FUNCTION set(key: string, icon: CachedIcon): void
    BEGIN
        // Evict if cache is full
        IF cache.size >= maxSize THEN
            evict()
        END IF

        icon.timestamp ← CurrentTime()
        cache.set(key, icon)
        accessOrder.addToFront(key)
    END

    FUNCTION evict(): void
    BEGIN
        // Remove least recently used entry
        lruKey ← accessOrder.removeLast()
        cache.delete(lruKey)
    END

    FUNCTION clear(): void
    BEGIN
        cache.clear()
        accessOrder.clear()
    END
END

/**
 * Global cache instance
 */
GLOBAL_CONSTANT iconCache = NEW IconCacheManager()
```

### Lazy Loading Strategy

```
ALGORITHM: LazyLoadIcons
BEGIN
    // Only load icons when they enter viewport
    FUNCTION setupIntersectionObserver(): void
    BEGIN
        observer ← NEW IntersectionObserver((entries) => {
            FOR EACH entry IN entries DO
                IF entry.isIntersecting THEN
                    agentId ← entry.target.dataset.agentId
                    LoadIconForAgent(agentId)
                    observer.unobserve(entry.target)
                END IF
            END FOR
        }, {
            rootMargin: '50px',  // Load slightly before visible
            threshold: 0.1
        })

        // Observe all icon containers
        iconContainers ← document.querySelectorAll('[data-icon-lazy]')
        FOR EACH container IN iconContainers DO
            observer.observe(container)
        END FOR
    END
END
```

### Tree-Shaking Optimization

```typescript
/**
 * Vite Configuration for Icon Tree-Shaking
 */
CONFIGURATION ViteIconConfig
BEGIN
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    // Separate chunk for icon library
                    'icons': ['lucide-react']
                }
            }
        },

        // Minimize icon bundle
        minify: 'esbuild',

        // Enable tree-shaking
        treeShake: {
            moduleSideEffects: false
        }
    },

    // Optimize icon imports in dev mode
    optimizeDeps: {
        include: ['lucide-react'],
        esbuildOptions: {
            // Faster icon loading in dev
            treeShaking: true
        }
    }
END

/**
 * Named Imports for Tree-Shaking
 * ✅ CORRECT: Only imports used icons
 */
import { Bot, CheckCircle, Calendar } from 'lucide-react';

/**
 * ❌ INCORRECT: Imports entire library
 */
import * as LucideIcons from 'lucide-react';
```

### Memoization Strategy

```typescript
COMPONENT AgentIcon
BEGIN
    // Memoize expensive calculations
    iconConfig ← useMemo(() => {
        RETURN {
            initials: GenerateInitials(agent.name),
            color: GetTierBackgroundColor(agent.tier, agent.color),
            iconMap: GetAgentIcon(agent.slug)
        }
    }, [agent.name, agent.tier, agent.color, agent.slug])

    // Memoize icon component
    IconComponent ← useMemo(() => {
        RETURN ResolveIconComponent(agent, iconConfig)
    }, [agent.icon, agent.icon_type, iconConfig])

    // Prevent unnecessary re-renders
    RETURN React.memo(
        RenderIcon(IconComponent, iconConfig),
        (prevProps, nextProps) => {
            // Custom comparison
            RETURN (
                prevProps.agent.id === nextProps.agent.id AND
                prevProps.agent.status === nextProps.agent.status AND
                prevProps.size === nextProps.size
            )
        }
    )
END
```

**Performance Metrics:**
- **Initial Load**: < 100ms for icon resolution
- **Cache Hit**: < 5ms for cached icons
- **Tree-Shaking**: 60-80% reduction in icon bundle size
- **LRU Eviction**: O(1) time complexity

---

## Accessibility Implementation

### WCAG 2.1 AA Compliance

```
ALGORITHM: EnsureIconAccessibility
INPUT: iconElement: HTMLElement, agent: Agent, decorative: boolean
OUTPUT: accessibleElement: HTMLElement

BEGIN
    // Rule 1: Decorative icons must be hidden from screen readers
    IF decorative = true THEN
        iconElement.setAttribute('aria-hidden', 'true')
        iconElement.setAttribute('role', 'presentation')
        iconElement.removeAttribute('aria-label')
        RETURN iconElement
    END IF

    // Rule 2: Meaningful icons must have proper ARIA labels
    IF decorative = false THEN
        iconElement.setAttribute('role', 'img')

        // Construct descriptive label
        label ← GenerateAccessibleLabel(agent)
        iconElement.setAttribute('aria-label', label)

        // Remove aria-hidden if present
        iconElement.removeAttribute('aria-hidden')
    END IF

    // Rule 3: Ensure keyboard accessibility
    IF iconElement.parentElement.tagName = 'BUTTON' THEN
        // Button handles focus, icon is decorative
        iconElement.setAttribute('aria-hidden', 'true')
        iconElement.parentElement.setAttribute('aria-label', label)
    END IF

    // Rule 4: Ensure color contrast
    EnsureContrastCompliance(iconElement, agent)

    RETURN iconElement
END

/**
 * Generate Accessible Label
 */
FUNCTION GenerateAccessibleLabel(agent: Agent): string
BEGIN
    // Base label
    label ← agent.name.replace(/-/g, ' ')

    // Add tier context
    tierLabel ← (agent.tier = 1) ? 'user-facing' : 'system'
    label ← `${label}, ${tierLabel} agent`

    // Add status context
    IF agent.status EXISTS THEN
        label ← `${label}, status: ${agent.status}`
    END IF

    RETURN label
END

/**
 * Contrast Compliance Check
 */
FUNCTION EnsureContrastCompliance(
    element: HTMLElement,
    agent: Agent
): void
BEGIN
    backgroundColor ← GetComputedBackgroundColor(element)
    textColor ← GetComputedTextColor(element)

    contrastRatio ← CalculateContrastRatio(backgroundColor, textColor)

    // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
    MIN_CONTRAST ← 4.5

    IF contrastRatio < MIN_CONTRAST THEN
        LogWarning('Insufficient color contrast', {
            agent: agent.name,
            ratio: contrastRatio,
            required: MIN_CONTRAST
        })

        // Auto-correct contrast
        adjustedColor ← AdjustColorForContrast(textColor, backgroundColor, MIN_CONTRAST)
        element.style.color ← adjustedColor
    END IF
END

/**
 * Contrast Ratio Calculation (WCAG formula)
 */
FUNCTION CalculateContrastRatio(color1: string, color2: string): number
BEGIN
    lum1 ← CalculateLuminance(HexToRGB(color1))
    lum2 ← CalculateLuminance(HexToRGB(color2))

    lighter ← Math.max(lum1, lum2)
    darker ← Math.min(lum1, lum2)

    RETURN (lighter + 0.05) / (darker + 0.05)
END
```

### Screen Reader Announcements

```typescript
/**
 * Icon Context Announcements
 */
FUNCTION AnnounceIconContext(agent: Agent, context: string): void
BEGIN
    // Create live region for dynamic updates
    liveRegion ← document.getElementById('icon-announcements')

    IF NOT liveRegion EXISTS THEN
        liveRegion ← document.createElement('div')
        liveRegion.id ← 'icon-announcements'
        liveRegion.setAttribute('role', 'status')
        liveRegion.setAttribute('aria-live', 'polite')
        liveRegion.setAttribute('aria-atomic', 'true')
        liveRegion.className ← 'sr-only'  // Visually hidden
        document.body.appendChild(liveRegion)
    END IF

    // Set announcement text
    announcement ← `${agent.name} ${context}`
    liveRegion.textContent ← announcement

    // Clear after 3 seconds
    setTimeout(() => {
        liveRegion.textContent ← ''
    }, 3000)
END

/**
 * Usage Example:
 */
AnnounceIconContext(agent, 'icon loaded successfully')
AnnounceIconContext(agent, 'status changed to active')
```

---

## Error Handling

### Error Recovery Strategy

```
ALGORITHM: HandleIconLoadError
INPUT:
    agent: Agent
    error: Error
    attemptNumber: number
OUTPUT:
    RecoveryAction

CONSTANTS:
    MAX_RETRY_ATTEMPTS = 3
    RETRY_DELAY_MS = 1000

BEGIN
    // Log error for monitoring
    LogIconError(agent, error, attemptNumber)

    // Increment error counter
    errorCount ← IncrementErrorCount(agent.id)

    // Determine recovery strategy
    IF attemptNumber < MAX_RETRY_ATTEMPTS THEN
        // Retry with exponential backoff
        delay ← RETRY_DELAY_MS * (2 ^ attemptNumber)

        RETURN {
            action: 'RETRY',
            delay: delay,
            nextLevel: 'svg'
        }
    ELSE IF agent.icon_emoji EXISTS THEN
        // Fall back to emoji
        RETURN {
            action: 'FALLBACK',
            level: 'emoji'
        }
    ELSE
        // Fall back to initials
        RETURN {
            action: 'FALLBACK',
            level: 'initials'
        }
    END IF
END

/**
 * Error Logging
 */
FUNCTION LogIconError(
    agent: Agent,
    error: Error,
    attemptNumber: number
): void
BEGIN
    errorData ← {
        timestamp: CurrentTime(),
        agentId: agent.id,
        agentSlug: agent.slug,
        iconPath: agent.icon,
        iconType: agent.icon_type,
        error: error.message,
        stack: error.stack,
        attemptNumber: attemptNumber,
        userAgent: navigator.userAgent
    }

    // Send to monitoring service
    MonitoringService.logError('icon_load_failure', errorData)

    // Console warning in development
    IF process.env.NODE_ENV = 'development' THEN
        console.warn('[Icon Load Error]', errorData)
    END IF
END

/**
 * Error Count Tracking
 */
DATA_STRUCTURE ErrorTracker
BEGIN
    errorCounts: Map<string, number>
    errorTimestamps: Map<string, number[]>

    FUNCTION IncrementErrorCount(agentId: string): number
    BEGIN
        current ← errorCounts.get(agentId) || 0
        newCount ← current + 1
        errorCounts.set(agentId, newCount)

        // Track timestamp
        timestamps ← errorTimestamps.get(agentId) || []
        timestamps.push(CurrentTime())
        errorTimestamps.set(agentId, timestamps)

        // Alert if error rate is high
        IF IsHighErrorRate(agentId) THEN
            AlertIconLoadIssue(agentId, newCount)
        END IF

        RETURN newCount
    END

    FUNCTION IsHighErrorRate(agentId: string): boolean
    BEGIN
        timestamps ← errorTimestamps.get(agentId) || []

        // Check if more than 5 errors in last minute
        recentErrors ← timestamps.filter(t =>
            CurrentTime() - t < 60000
        )

        RETURN recentErrors.length > 5
    END
END
```

### Graceful Degradation

```
ALGORITHM: GracefullyDegrade
INPUT: agent: Agent, failedLevel: IconLevel
OUTPUT: React.ReactElement

BEGIN
    SWITCH failedLevel
        CASE 'svg':
            // Try emoji next
            IF agent.icon_emoji EXISTS AND IsValidEmoji(agent.icon_emoji) THEN
                LogFallback('svg -> emoji', agent.id)
                RETURN RenderEmojiIcon(agent.icon_emoji)
            ELSE
                // Skip to initials
                LogFallback('svg -> initials (no emoji)', agent.id)
                RETURN RenderInitialsIcon(agent)
            END IF

        CASE 'emoji':
            // Fall back to initials
            LogFallback('emoji -> initials', agent.id)
            RETURN RenderInitialsIcon(agent)

        CASE 'initials':
            // Last resort: generic icon
            LogFallback('initials -> generic', agent.id)
            RETURN RenderGenericIcon()

        DEFAULT:
            RETURN RenderGenericIcon()
    END SWITCH
END

/**
 * Generic Fallback Icon
 */
FUNCTION RenderGenericIcon(): React.ReactElement
BEGIN
    RETURN (
        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
            <span className="text-gray-600 font-bold">?</span>
        </div>
    )
END
```

---

## Test Cases

### Unit Test Cases

```typescript
DESCRIBE 'Icon Resolution Algorithm'
BEGIN
    TEST 'should load SVG icon when available'
    BEGIN
        agent ← {
            id: 'test-1',
            slug: 'personal-todos-agent',
            name: 'personal-todos-agent',
            tier: 1,
            icon: 'CheckSquare',
            icon_type: 'lucide'
        }

        result ← ResolveAgentIcon(agent)

        ASSERT result.level = 'svg'
        ASSERT result.component IS LucideIcon
        ASSERT result.iconName = 'CheckSquare'
    END

    TEST 'should fall back to emoji when SVG fails'
    BEGIN
        agent ← {
            id: 'test-2',
            slug: 'test-agent',
            name: 'test-agent',
            tier: 1,
            icon: 'InvalidIcon',
            icon_emoji: '🤖'
        }

        result ← ResolveAgentIcon(agent)

        ASSERT result.level = 'emoji'
        ASSERT result.emoji = '🤖'
    END

    TEST 'should fall back to initials when emoji invalid'
    BEGIN
        agent ← {
            id: 'test-3',
            slug: 'test-agent',
            name: 'test-agent',
            tier: 1,
            icon: null,
            icon_emoji: '<script>'  // Invalid emoji
        }

        result ← ResolveAgentIcon(agent)

        ASSERT result.level = 'initials'
        ASSERT result.initials = 'TE'
    END

    TEST 'should generate correct initials'
    BEGIN
        ASSERT GenerateInitials('personal-todos-agent') = 'PT'
        ASSERT GenerateInitials('meta-agent') = 'ME'
        ASSERT GenerateInitials('get-to-know-you-agent') = 'GT'
        ASSERT GenerateInitials('single') = 'SI'
    END

    TEST 'should validate emoji correctly'
    BEGIN
        ASSERT IsValidEmoji('🤖') = true
        ASSERT IsValidEmoji('📋') = true
        ASSERT IsValidEmoji('<script>') = false
        ASSERT IsValidEmoji('') = false
        ASSERT IsValidEmoji('abc') = false
    END

    TEST 'should calculate contrast ratio correctly'
    BEGIN
        ratio1 ← CalculateContrastRatio('#FFFFFF', '#000000')
        ASSERT ratio1 = 21  // Maximum contrast

        ratio2 ← CalculateContrastRatio('#FFFFFF', '#FFFFFF')
        ASSERT ratio2 = 1  // No contrast

        ratio3 ← CalculateContrastRatio('#3B82F6', '#FFFFFF')
        ASSERT ratio3 >= 4.5  // WCAG AA compliant
    END
END

DESCRIBE 'Icon Caching'
BEGIN
    TEST 'should cache loaded icons'
    BEGIN
        agent ← CreateTestAgent()

        // First load
        result1 ← ResolveAgentIcon(agent)
        ASSERT IconCache.has(agent.id) = true

        // Second load should use cache
        result2 ← ResolveAgentIcon(agent)
        ASSERT result1.component = result2.component
    END

    TEST 'should evict LRU entries when cache full'
    BEGIN
        // Fill cache to max size
        FOR i FROM 1 TO 51 DO
            agent ← CreateTestAgent({ id: `agent-${i}` })
            ResolveAgentIcon(agent)
        END FOR

        // First entry should be evicted
        ASSERT IconCache.has('agent-1') = false
        ASSERT IconCache.has('agent-51') = true
    END

    TEST 'should expire cached icons after TTL'
    BEGIN
        agent ← CreateTestAgent()
        ResolveAgentIcon(agent)

        // Advance time by TTL + 1
        MockTime.advance(300001)

        cached ← IconCache.get(agent.id)
        ASSERT cached = null
    END
END

DESCRIBE 'Accessibility'
BEGIN
    TEST 'should set aria-hidden for decorative icons'
    BEGIN
        component ← <AgentIcon agent={agent} decorative={true} />
        rendered ← render(component)

        iconElement ← rendered.querySelector('svg')
        ASSERT iconElement.getAttribute('aria-hidden') = 'true'
    END

    TEST 'should set aria-label for meaningful icons'
    BEGIN
        component ← <AgentIcon agent={agent} ariaLabel="Test label" />
        rendered ← render(component)

        iconElement ← rendered.querySelector('[role="img"]')
        ASSERT iconElement.getAttribute('aria-label') = 'Test label'
    END

    TEST 'should meet WCAG AA contrast requirements'
    BEGIN
        component ← <AgentIcon agent={agent} />
        rendered ← render(component)

        backgroundColor ← GetComputedStyle(rendered).backgroundColor
        textColor ← GetComputedStyle(rendered).color

        ratio ← CalculateContrastRatio(backgroundColor, textColor)
        ASSERT ratio >= 4.5
    END
END
```

### Integration Test Cases

```typescript
DESCRIBE 'Icon Component Integration'
BEGIN
    TEST 'should render all 19 agents with correct icons'
    BEGIN
        agents ← LoadAllAgents()

        FOR EACH agent IN agents DO
            component ← <AgentIcon agent={agent} />
            rendered ← render(component)

            // Should render without errors
            ASSERT rendered EXISTS

            // Should have proper structure
            iconElement ← rendered.querySelector('[data-testid="agent-icon"]')
            ASSERT iconElement EXISTS
        END FOR
    END

    TEST 'should handle icon loading failure gracefully'
    BEGIN
        agent ← {
            id: 'test',
            icon: 'NonExistentIcon',
            icon_emoji: null
        }

        component ← <AgentIcon agent={agent} />
        rendered ← render(component)

        // Should render initials fallback
        initials ← rendered.querySelector('[data-testid="initials-icon"]')
        ASSERT initials EXISTS
        ASSERT initials.textContent MATCHES /^[A-Z]{1,2}$/
    END

    TEST 'should apply tier-specific styling'
    BEGIN
        t1Agent ← CreateTestAgent({ tier: 1 })
        t2Agent ← CreateTestAgent({ tier: 2 })

        t1Rendered ← render(<AgentIcon agent={t1Agent} />)
        t2Rendered ← render(<AgentIcon agent={t2Agent} />)

        t1Color ← GetComputedStyle(t1Rendered).backgroundColor
        t2Color ← GetComputedStyle(t2Rendered).backgroundColor

        ASSERT t1Color = '#3B82F6'  // Blue for T1
        ASSERT t2Color = '#6B7280'  // Gray for T2
    END
END
```

### End-to-End Test Cases

```typescript
DESCRIBE 'E2E Icon Loading'
BEGIN
    TEST 'should load icons in agent list view'
    BEGIN
        page.goto('/agents')

        // Wait for icons to load
        page.waitForSelector('[data-testid="agent-icon"]')

        // Count rendered icons
        iconCount ← page.$$eval('[data-testid="agent-icon"]', els => els.length)

        ASSERT iconCount >= 8  // At least T1 agents visible
    END

    TEST 'should show status indicators when enabled'
    BEGIN
        page.goto('/agents')

        // Find agent with status
        agentCard ← page.$('[data-agent-status="active"]')
        statusIcon ← agentCard.$('[data-testid="status-indicator"]')

        ASSERT statusIcon.isVisible()

        backgroundColor ← statusIcon.evaluate(el =>
            window.getComputedStyle(el).backgroundColor
        )
        ASSERT backgroundColor = 'rgb(16, 185, 129)'  // Green
    END

    TEST 'should lazy load icons on scroll'
    BEGIN
        page.goto('/agents')

        // Initial icons loaded
        initialCount ← page.$$eval('[data-testid="agent-icon"]', els => els.length)

        // Scroll to bottom
        page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

        // Wait for new icons to load
        page.waitForTimeout(500)

        finalCount ← page.$$eval('[data-testid="agent-icon"]', els => els.length)

        ASSERT finalCount > initialCount
    END
END
```

### Edge Case Test Cases

```typescript
DESCRIBE 'Edge Cases'
BEGIN
    TEST 'should handle missing agent data'
    BEGIN
        agent ← {
            id: null,
            name: null,
            tier: null
        }

        component ← <AgentIcon agent={agent} />
        rendered ← render(component)

        // Should render generic fallback
        ASSERT rendered EXISTS
    END

    TEST 'should handle extremely long agent names'
    BEGIN
        agent ← CreateTestAgent({
            name: 'a'.repeat(1000)
        })

        initials ← GenerateInitials(agent.name)

        ASSERT initials.length <= 2
    END

    TEST 'should handle special characters in agent name'
    BEGIN
        agent ← CreateTestAgent({
            name: '!@#$%^&*()-agent'
        })

        initials ← GenerateInitials(agent.name)

        ASSERT initials MATCHES /^[A-Z0-9]{1,2}$/
    END

    TEST 'should handle rapid icon changes'
    BEGIN
        agent1 ← CreateTestAgent({ id: 'test-1' })
        agent2 ← CreateTestAgent({ id: 'test-2' })

        component ← render(<AgentIcon agent={agent1} />)

        // Rapidly change agent
        FOR i FROM 1 TO 10 DO
            component.rerender(<AgentIcon agent={agent2} />)
            component.rerender(<AgentIcon agent={agent1} />)
        END FOR

        // Should not crash
        ASSERT component.exists()
    END

    TEST 'should handle concurrent icon loads'
    BEGIN
        agents ← CreateMultipleTestAgents(50)

        promises ← []
        FOR EACH agent IN agents DO
            promises.push(ResolveAgentIcon(agent))
        END FOR

        results ← AWAIT Promise.all(promises)

        // All should resolve successfully
        ASSERT results.length = 50
        ASSERT results.every(r => r.success = true)
    END
END
```

---

## Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Create `IconOptions` interface
- [ ] Create `IconCache` data structure
- [ ] Implement `ResolveAgentIcon` algorithm
- [ ] Implement `GenerateInitials` function
- [ ] Implement `IsValidEmoji` validator
- [ ] Create `ICON_SIZES` constant
- [ ] Create `AGENT_ICON_MAP` constant

### Phase 2: Icon Loading
- [ ] Implement `LoadLucideIcon` function
- [ ] Implement `LoadCustomSVG` function
- [ ] Implement `ValidateSVGPath` function
- [ ] Implement `SanitizeSVG` function
- [ ] Implement caching layer
- [ ] Add error handling

### Phase 3: Rendering Components
- [ ] Implement `RenderLucideIcon` function
- [ ] Implement `RenderEmojiIcon` function
- [ ] Implement `RenderInitialsIcon` function
- [ ] Implement `AgentIcon` React component
- [ ] Add loading states
- [ ] Add status indicators

### Phase 4: Accessibility
- [ ] Implement ARIA label generation
- [ ] Implement contrast ratio calculation
- [ ] Add screen reader support
- [ ] Test with keyboard navigation
- [ ] Validate WCAG 2.1 AA compliance

### Phase 5: Performance
- [ ] Implement LRU cache eviction
- [ ] Add lazy loading support
- [ ] Optimize tree-shaking
- [ ] Add memoization
- [ ] Benchmark performance

### Phase 6: Testing
- [ ] Write unit tests (90%+ coverage)
- [ ] Write integration tests
- [ ] Write E2E tests
- [ ] Test edge cases
- [ ] Cross-browser testing

---

## Complexity Analysis Summary

### Time Complexity
- **Icon Resolution**: O(1) average, O(log n) worst case (dynamic import)
- **Cache Lookup**: O(1)
- **Initials Generation**: O(n) where n = length of agent name (typically small)
- **Emoji Validation**: O(1)
- **LRU Eviction**: O(1)

### Space Complexity
- **Icon Cache**: O(k) where k = max cache size (50)
- **Component Rendering**: O(1) per icon
- **Memory Footprint**: ~10-50KB per cached icon

### Performance Targets
- **Initial Icon Load**: < 100ms
- **Cache Hit Response**: < 5ms
- **Fallback Render**: < 10ms
- **Bundle Size**: < 50KB (gzipped) for all icons

---

## References

1. **Specification**: `/workspaces/agent-feed/docs/SPARC-AGENT-TIER-SYSTEM-SPEC.md`
2. **SVG Research**: `/workspaces/agent-feed/docs/SVG-ICON-RESEARCH.md`
3. **Lucide React Docs**: https://lucide.dev/guide/packages/lucide-react
4. **WCAG 2.1**: https://www.w3.org/WAI/WCAG21/quickref/
5. **React Performance**: https://react.dev/learn/render-and-commit

---

**END OF PSEUDOCODE DOCUMENT**

**Next Phase**: Architecture & Component Implementation
**Status**: Ready for React Component Development
**Estimated Implementation Time**: 8-12 hours
