import React, { memo } from 'react';
import * as LucideIcons from 'lucide-react';

/**
 * Size mapping for icon dimensions
 */
const SIZE_CLASSES = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
  '2xl': 'w-16 h-16'
} as const;

/**
 * Tier-based color mapping
 */
const TIER_COLORS = {
  1: 'text-blue-600',
  2: 'text-gray-500'
} as const;

/**
 * Agent data interface
 */
interface AgentData {
  name: string;
  icon?: string;
  icon_type?: 'svg' | 'emoji';
  icon_emoji?: string;
  tier?: 1 | 2;
}

/**
 * AgentIcon component props
 */
export interface AgentIconProps {
  agent: AgentData;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showStatus?: boolean;
}

/**
 * Generate initials from agent name
 * Examples:
 * - "personal-todos-agent" -> "PT"
 * - "meta-agent" -> "ME"
 * - "Test Agent" -> "TA"
 */
const generateInitials = (name: string): string => {
  if (!name || name.trim() === '') {
    return 'A';
  }

  // Clean the name: remove "-agent" suffix and replace hyphens with spaces
  const cleaned = name
    .replace(/-agent$/i, '')
    .replace(/-/g, ' ')
    .trim();

  // Split into words
  const words = cleaned.split(/\s+/).filter(word => word.length > 0);

  if (words.length === 0) {
    return 'A';
  } else if (words.length === 1) {
    // Single word: take first 2 letters
    return words[0].substring(0, 2).toUpperCase();
  } else {
    // Multiple words: first letter of first 2 words
    const first = words[0].charAt(0).toUpperCase();
    const second = words[1].charAt(0).toUpperCase();
    return first + second;
  }
};

/**
 * Resolve lucide-react icon component by name
 */
const getLucideIcon = (iconName: string): React.ComponentType<any> | null => {
  try {
    // Direct lookup
    const icon = (LucideIcons as any)[iconName];
    // lucide-react exports React.forwardRef objects (type: 'object') AND functions
    if (icon && (typeof icon === 'function' || typeof icon === 'object')) {
      return icon;
    }

    // Try common variations
    const variations = [
      iconName,
      `${iconName}Icon`,
      `Lucide${iconName}`
    ];

    for (const variant of variations) {
      const variantIcon = (LucideIcons as any)[variant];
      // lucide-react exports React.forwardRef objects (type: 'object') AND functions
      if (variantIcon && (typeof variantIcon === 'function' || typeof variantIcon === 'object')) {
        return variantIcon;
      }
    }

    return null;
  } catch (error) {
    console.error('AgentIcon: Error loading icon:', iconName, error);
    return null;
  }
};

/**
 * AgentIcon Component
 *
 * Three-level fallback system:
 * 1. SVG icon from lucide-react
 * 2. Emoji fallback
 * 3. Initials fallback
 */
export const AgentIcon: React.FC<AgentIconProps> = memo(({
  agent,
  size = 'md',
  className = '',
  showStatus = false
}) => {
  const sizeClass = SIZE_CLASSES[size];
  const tierColor = TIER_COLORS[agent.tier || 1];

  // LEVEL 1: Try SVG icon from lucide-react
  if (agent.icon && agent.icon_type === 'svg') {
    const IconComponent = getLucideIcon(agent.icon);

    if (IconComponent) {
      const combinedClassName = `${sizeClass} ${tierColor} ${className}`.trim();

      return (
        <IconComponent
          className={combinedClassName}
          aria-label={agent.name}
          role="img"
          strokeWidth={2}
        />
      );
    }
  }

  // LEVEL 2: Emoji fallback
  if (agent.icon_emoji) {
    return (
      <span
        className={`${sizeClass} inline-flex items-center justify-center ${className}`}
        role="img"
        aria-label={agent.name}
      >
        {agent.icon_emoji}
      </span>
    );
  }

  // LEVEL 3: Initials fallback
  const initials = generateInitials(agent.name);

  return (
    <div
      className={`${sizeClass} rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium ${className}`}
      role="img"
      aria-label={agent.name}
    >
      {initials}
    </div>
  );
});

AgentIcon.displayName = 'AgentIcon';
