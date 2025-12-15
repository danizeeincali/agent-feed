#!/bin/bash

# Update Agent Frontmatter with Tier System Fields
# Adds: tier, visibility, icon, icon_type, icon_emoji, posts_as_self, show_in_default_feed

# Function to add frontmatter fields
update_frontmatter() {
  local file=$1
  local tier=$2
  local visibility=$3
  local icon=$4
  local icon_emoji=$5
  local posts_as_self=${6:-true}
  local show_in_default_feed=${7:-true}

  # Check if tier field already exists
  if grep -q "^tier:" "$file"; then
    echo "✓ $file already has tier field, skipping"
    return
  fi

  # Add fields after the first frontmatter separator (---)
  # Use sed to insert after line 2 (after opening ---)
  sed -i "2a\\
tier: $tier\\
visibility: $visibility\\
icon: $icon\\
icon_type: svg\\
icon_emoji: $icon_emoji\\
posts_as_self: $posts_as_self\\
show_in_default_feed: $show_in_default_feed" "$file"

  echo "✅ Updated $file"
}

echo "🚀 Updating all agent frontmatter files..."

# T1 User-Facing Agents (8 total)
update_frontmatter "personal-todos-agent.md" 1 "public" "CheckSquare" "✅" "true" "true"
update_frontmatter "get-to-know-you-agent.md" 1 "public" "Users" "👥" "true" "true"
update_frontmatter "follow-ups-agent.md" 1 "public" "Clock" "⏰" "true" "true"
update_frontmatter "meeting-next-steps-agent.md" 1 "public" "Calendar" "📅" "true" "true"
update_frontmatter "meeting-prep-agent.md" 1 "public" "FileText" "📋" "true" "true"
update_frontmatter "link-logger-agent.md" 1 "public" "Link" "🔗" "true" "true"
update_frontmatter "agent-feedback-agent.md" 1 "public" "MessageSquare" "💬" "true" "true"
update_frontmatter "agent-ideas-agent.md" 1 "public" "Lightbulb" "💡" "true" "true"

# T2 System/Meta Agents (11 total)
update_frontmatter "meta-agent.md" 2 "protected" "Settings" "⚙️" "false" "false"
update_frontmatter "page-builder-agent.md" 2 "public" "Layout" "📐" "false" "false"
update_frontmatter "page-verification-agent.md" 2 "public" "ShieldCheck" "🛡️" "false" "false"
update_frontmatter "dynamic-page-testing-agent.md" 2 "public" "TestTube" "🧪" "false" "false"

# T2 Protected Phase 4.2 Specialists (6 total)
update_frontmatter "agent-architect-agent.md" 2 "protected" "Wrench" "🔧" "false" "false"
update_frontmatter "agent-maintenance-agent.md" 2 "protected" "Tool" "🛠️" "false" "false"
update_frontmatter "skills-architect-agent.md" 2 "protected" "BookOpen" "📚" "false" "false"
update_frontmatter "skills-maintenance-agent.md" 2 "protected" "Pencil" "✏️" "false" "false"
update_frontmatter "learning-optimizer-agent.md" 2 "protected" "TrendingUp" "📈" "false" "false"
update_frontmatter "system-architect-agent.md" 2 "protected" "Database" "🗄️" "false" "false"

echo ""
echo "✅ All agent frontmatter updated!"
echo ""
echo "Summary:"
echo "  T1 Agents: 8 (user-facing)"
echo "  T2 Agents: 11 (system/meta)"
echo "  Protected: 7 (6 Phase 4.2 + meta-agent)"
echo ""
echo "Next step: Verify with: grep -A 6 '^tier:' *.md | head -50"
