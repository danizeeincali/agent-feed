import {
  Bot, CheckSquare, Users, Clock, Calendar, FileText, Link,
  MessageSquare, Lightbulb, Settings, Layout, ShieldCheck,
  TestTube, Wrench, Settings as SettingsIcon, BookOpen, Pencil, TrendingUp, Database
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const AGENT_ICON_MAP: Record<string, LucideIcon> = {
  'avi': Bot,
  'personal-todos-agent': CheckSquare,
  'get-to-know-you-agent': Users,
  'follow-ups-agent': Clock,
  'meeting-next-steps-agent': Calendar,
  'meeting-prep-agent': FileText,
  'link-logger-agent': Link,
  'agent-feedback-agent': MessageSquare,
  'agent-ideas-agent': Lightbulb,
  'meta-agent': Settings,
  'page-builder-agent': Layout,
  'page-verification-agent': ShieldCheck,
  'dynamic-page-testing-agent': TestTube,
  'agent-architect-agent': Wrench,
  'agent-maintenance-agent': SettingsIcon,
  'skills-architect-agent': BookOpen,
  'skills-maintenance-agent': Pencil,
  'learning-optimizer-agent': TrendingUp,
  'system-architect-agent': Database
};

export const AGENT_EMOJI_FALLBACK: Record<string, string> = {
  'avi': '🤖',
  'personal-todos-agent': '✅',
  'get-to-know-you-agent': '👥',
  'follow-ups-agent': '⏰',
  'meeting-next-steps-agent': '📅',
  'meeting-prep-agent': '📋',
  'link-logger-agent': '🔗',
  'agent-feedback-agent': '💬',
  'agent-ideas-agent': '💡',
  'meta-agent': '⚙️',
  'page-builder-agent': '📐',
  'page-verification-agent': '🛡️',
  'dynamic-page-testing-agent': '🧪',
  'agent-architect-agent': '🔧',
  'agent-maintenance-agent': '🛠️',
  'skills-architect-agent': '📚',
  'skills-maintenance-agent': '✏️',
  'learning-optimizer-agent': '📈',
  'system-architect-agent': '🗄️'
};

export const TIER_COLORS = {
  1: { bg: 'bg-blue-600', text: 'text-blue-600', light: 'bg-blue-100' },
  2: { bg: 'bg-gray-500', text: 'text-gray-500', light: 'bg-gray-100' }
} as const;
