#!/bin/bash

###############################################################################
# Cache Optimization Cleanup Script
# Purpose: Aggressive cleanup to meet validation targets
# Target: Reduce untracked files from 615 to <30
###############################################################################

set -e  # Exit on error

echo "🧹 CACHE OPTIMIZATION CLEANUP SCRIPT"
echo "===================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Backup function
backup_before_cleanup() {
    echo "📦 Creating backup..."
    BACKUP_DIR="./backups/cleanup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"

    # Backup .claude/config
    if [ -d ".claude/config" ]; then
        tar -czf "$BACKUP_DIR/claude-config-backup.tar.gz" .claude/config
        echo -e "${GREEN}✓ Backup created: $BACKUP_DIR/claude-config-backup.tar.gz${NC}"
    fi
}

# Count files function
count_files() {
    git status --porcelain | wc -l | xargs
}

# Update .gitignore
update_gitignore() {
    echo ""
    echo "📝 Updating .gitignore..."

    # Patterns to add
    PATTERNS=(
        ".claude/config/todos/*.json"
        ".claude/config/shell-snapshots/*.sh"
        ".claude/config/projects/**/*.jsonl"
        ".claude/config/statsig/"
        "docs/validation/*.txt"
        "docs/validation/*.log"
    )

    for pattern in "${PATTERNS[@]}"; do
        if ! grep -q "$pattern" .gitignore 2>/dev/null; then
            echo "$pattern" >> .gitignore
            echo -e "${GREEN}✓ Added: $pattern${NC}"
        else
            echo -e "${YELLOW}⏭  Already exists: $pattern${NC}"
        fi
    done
}

# Clean git untracked files
clean_git_untracked() {
    echo ""
    echo "🗑️  Cleaning git untracked files..."

    BEFORE=$(count_files)
    echo "Before: $BEFORE untracked files"

    # Remove files matching .gitignore patterns
    git clean -fX .claude/config/ || true

    AFTER=$(count_files)
    REMOVED=$((BEFORE - AFTER))

    echo "After: $AFTER untracked files"
    echo -e "${GREEN}✓ Removed: $REMOVED files${NC}"
}

# Clean stale config files
clean_stale_files() {
    echo ""
    echo "🗑️  Cleaning stale config files (>7 days)..."

    BEFORE=$(find .claude/config -type f 2>/dev/null | wc -l | xargs)
    echo "Before: $BEFORE total files"

    # Delete files older than 7 days
    STALE_COUNT=$(find .claude/config -type f -mtime +7 2>/dev/null | wc -l | xargs)
    echo "Found $STALE_COUNT stale files"

    if [ "$STALE_COUNT" -gt 0 ]; then
        find .claude/config -type f -mtime +7 -delete 2>/dev/null || true
        echo -e "${GREEN}✓ Deleted $STALE_COUNT stale files${NC}"
    fi

    AFTER=$(find .claude/config -type f 2>/dev/null | wc -l | xargs)
    echo "After: $AFTER total files"
}

# Aggressive cleanup (3-day TTL for non-critical files)
aggressive_cleanup() {
    echo ""
    echo "⚡ Aggressive cleanup (3-day TTL for temp files)..."

    # Patterns for aggressive cleanup
    TEMP_PATTERNS=(
        ".claude/config/shell-snapshots/*.sh"
        ".claude/config/statsig/statsig.cached*"
        ".claude/config/statsig/statsig.session_id*"
    )

    REMOVED=0
    for pattern in "${TEMP_PATTERNS[@]}"; do
        FILES=$(find $pattern -mtime +3 2>/dev/null | wc -l | xargs)
        if [ "$FILES" -gt 0 ]; then
            find $pattern -mtime +3 -delete 2>/dev/null || true
            REMOVED=$((REMOVED + FILES))
            echo -e "${GREEN}✓ Deleted $FILES files matching: $pattern${NC}"
        fi
    done

    echo "Total removed: $REMOVED files"
}

# Compress old logs
compress_old_logs() {
    echo ""
    echo "📦 Compressing old log files..."

    # Find and compress logs older than 7 days
    OLD_LOGS=$(find docs/validation -name "*.txt" -mtime +7 2>/dev/null | wc -l | xargs)

    if [ "$OLD_LOGS" -gt 0 ]; then
        find docs/validation -name "*.txt" -mtime +7 -exec gzip {} \; 2>/dev/null || true
        echo -e "${GREEN}✓ Compressed $OLD_LOGS log files${NC}"
    else
        echo "No old logs to compress"
    fi
}

# Display summary
display_summary() {
    echo ""
    echo "===================================="
    echo "📊 CLEANUP SUMMARY"
    echo "===================================="

    GIT_FILES=$(count_files)
    TOTAL_FILES=$(find .claude/config -type f 2>/dev/null | wc -l | xargs)
    STALE_FILES=$(find .claude/config -type f -mtime +7 2>/dev/null | wc -l | xargs)
    DIR_SIZE=$(du -sh .claude/config 2>/dev/null | cut -f1)

    echo "Git untracked files: $GIT_FILES (target: <30)"
    echo "Total config files: $TOTAL_FILES (target: <150)"
    echo "Stale files (>7 days): $STALE_FILES (target: 0)"
    echo "Directory size: $DIR_SIZE (target: 8-10M)"
    echo ""

    # Validation status
    if [ "$GIT_FILES" -le 30 ] && [ "$TOTAL_FILES" -le 150 ] && [ "$STALE_FILES" -eq 0 ]; then
        echo -e "${GREEN}✅ ALL TARGETS MET!${NC}"
        echo -e "${GREEN}✅ Ready for cost validation${NC}"
    else
        echo -e "${YELLOW}⚠️  Some targets not met:${NC}"
        [ "$GIT_FILES" -gt 30 ] && echo -e "${RED}  ❌ Git files: $GIT_FILES > 30${NC}"
        [ "$TOTAL_FILES" -gt 150 ] && echo -e "${RED}  ❌ Total files: $TOTAL_FILES > 150${NC}"
        [ "$STALE_FILES" -gt 0 ] && echo -e "${RED}  ❌ Stale files: $STALE_FILES > 0${NC}"
    fi

    echo "===================================="
}

# Dry run mode
if [ "$1" == "--dry-run" ]; then
    echo "🔍 DRY RUN MODE (no changes will be made)"
    echo ""

    echo "Would remove:"
    echo "- $(find .claude/config -type f -mtime +7 2>/dev/null | wc -l) stale files (>7 days)"
    echo "- $(find .claude/config/shell-snapshots/*.sh -mtime +3 2>/dev/null | wc -l) temp shell snapshots"
    echo "- Git untracked files matching .gitignore patterns"

    exit 0
fi

# Main execution
main() {
    echo "Starting cleanup process..."
    echo ""

    # Safety check
    read -p "This will delete files. Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cleanup cancelled."
        exit 0
    fi

    # Execute cleanup steps
    backup_before_cleanup
    update_gitignore
    clean_git_untracked
    clean_stale_files
    aggressive_cleanup
    compress_old_logs
    display_summary

    echo ""
    echo -e "${GREEN}✓ Cleanup complete!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review changes: git status"
    echo "2. Start API server: npm run dev"
    echo "3. Run validation: node docs/validation/validation-test-suite.js"
    echo "4. Monitor costs for 7 days"
}

# Run main function
main
