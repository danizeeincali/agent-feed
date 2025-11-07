#!/bin/bash
set -e

# Cache cleanup script for cost optimization
# Deletes Claude Code session files older than specified days
# Author: DevOps Agent
# Usage: ./cleanup-claude-cache.sh [--dry-run] [--days N]

DRY_RUN=false
RETENTION_DAYS=7
BASE_DIR="${PWD}"

# Parse command line flags
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --dry-run) DRY_RUN=true ;;
    --days) RETENTION_DAYS="$2"; shift ;;
    --help)
      echo "Usage: $0 [--dry-run] [--days N]"
      echo "  --dry-run    Show what would be deleted without actually deleting"
      echo "  --days N     Set retention period in days (default: 7)"
      exit 0
      ;;
    *) echo "Unknown parameter: $1"; echo "Use --help for usage information"; exit 1 ;;
  esac
  shift
done

# Verify .claude/config exists
if [ ! -d "${BASE_DIR}/.claude/config" ]; then
  echo "❌ Error: .claude/config directory not found in ${BASE_DIR}"
  exit 1
fi

# Calculate space before cleanup
if command -v du &> /dev/null; then
  BEFORE_SIZE=$(du -sh "${BASE_DIR}/.claude/config" 2>/dev/null | cut -f1 || echo "unknown")
else
  BEFORE_SIZE="unknown"
fi

echo "🧹 Claude Cache Cleanup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   Base directory: ${BASE_DIR}"
echo "   Retention period: ${RETENTION_DAYS} days"
echo "   Current size: ${BEFORE_SIZE}"
echo ""

# Count files that will be affected
OLD_PROJECT_FILES=$(find "${BASE_DIR}/.claude/config/projects/" -type f -mtime +${RETENTION_DAYS} 2>/dev/null | wc -l || echo "0")
OLD_TODO_FILES=$(find "${BASE_DIR}/.claude/config/todos/" -type f -mtime +${RETENTION_DAYS} 2>/dev/null | wc -l || echo "0")
OLD_SHELL_FILES=$(find "${BASE_DIR}/.claude/config/shell-snapshots/" -type f -mtime +${RETENTION_DAYS} 2>/dev/null | wc -l || echo "0")
TOTAL_OLD_FILES=$((OLD_PROJECT_FILES + OLD_TODO_FILES + OLD_SHELL_FILES))

if [ "$DRY_RUN" = true ]; then
  echo "   🔍 DRY RUN MODE - No files will be deleted"
  echo ""

  if [ ${OLD_PROJECT_FILES} -gt 0 ]; then
    echo "   Project files to delete (${OLD_PROJECT_FILES}):"
    find "${BASE_DIR}/.claude/config/projects/" -type f -mtime +${RETENTION_DAYS} 2>/dev/null | head -5
    [ ${OLD_PROJECT_FILES} -gt 5 ] && echo "   ... and $((OLD_PROJECT_FILES - 5)) more"
    echo ""
  fi

  if [ ${OLD_TODO_FILES} -gt 0 ]; then
    echo "   Todo files to delete (${OLD_TODO_FILES}):"
    find "${BASE_DIR}/.claude/config/todos/" -type f -mtime +${RETENTION_DAYS} 2>/dev/null | head -5
    [ ${OLD_TODO_FILES} -gt 5 ] && echo "   ... and $((OLD_TODO_FILES - 5)) more"
    echo ""
  fi

  if [ ${OLD_SHELL_FILES} -gt 0 ]; then
    echo "   Shell snapshot files to delete (${OLD_SHELL_FILES}):"
    find "${BASE_DIR}/.claude/config/shell-snapshots/" -type f -mtime +${RETENTION_DAYS} 2>/dev/null | head -5
    [ ${OLD_SHELL_FILES} -gt 5 ] && echo "   ... and $((OLD_SHELL_FILES - 5)) more"
    echo ""
  fi

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "   📊 Total files to be deleted: ${TOTAL_OLD_FILES}"
  echo "   💡 Run without --dry-run to actually delete files"
else
  echo "   🗑️  Deleting stale files older than ${RETENTION_DAYS} days..."
  echo ""

  # Delete old files with progress
  if [ ${OLD_PROJECT_FILES} -gt 0 ]; then
    find "${BASE_DIR}/.claude/config/projects/" -type f -mtime +${RETENTION_DAYS} -delete 2>/dev/null
    echo "   ✅ Deleted ${OLD_PROJECT_FILES} project files"
  fi

  if [ ${OLD_TODO_FILES} -gt 0 ]; then
    find "${BASE_DIR}/.claude/config/todos/" -type f -mtime +${RETENTION_DAYS} -delete 2>/dev/null
    echo "   ✅ Deleted ${OLD_TODO_FILES} todo files"
  fi

  if [ ${OLD_SHELL_FILES} -gt 0 ]; then
    find "${BASE_DIR}/.claude/config/shell-snapshots/" -type f -mtime +${RETENTION_DAYS} -delete 2>/dev/null
    echo "   ✅ Deleted ${OLD_SHELL_FILES} shell snapshot files"
  fi

  if [ ${TOTAL_OLD_FILES} -eq 0 ]; then
    echo "   ℹ️  No stale files found (all files are within retention period)"
  fi

  echo ""

  # Calculate space after cleanup
  if command -v du &> /dev/null; then
    AFTER_SIZE=$(du -sh "${BASE_DIR}/.claude/config" 2>/dev/null | cut -f1 || echo "unknown")
  else
    AFTER_SIZE="unknown"
  fi

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "   📊 Cleanup Summary:"
  echo "   - Files deleted: ${TOTAL_OLD_FILES}"
  echo "   - Size before: ${BEFORE_SIZE}"
  echo "   - Size after: ${AFTER_SIZE}"
  echo ""
  echo "   ✨ Cleanup complete!"
fi

exit 0
