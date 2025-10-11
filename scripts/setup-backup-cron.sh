#!/bin/bash

##############################################################################
# Agent Feed Backup Cron Setup
# Description: Configure automated backup schedule with cron
# Author: Agent Feed Team
# Version: 1.0.0
##############################################################################

set -euo pipefail

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== Agent Feed Backup Cron Setup ===${NC}"
echo ""

# Get project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Backup script path
BACKUP_SCRIPT="$PROJECT_ROOT/scripts/backup-system.sh"
LOG_DIR="$PROJECT_ROOT/backups/logs"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

echo -e "${YELLOW}This script will help you set up automated backups using cron${NC}"
echo ""

# Check if cron is available
if ! command -v crontab &> /dev/null; then
    echo -e "${RED}Error: crontab command not found. Please install cron.${NC}"
    exit 1
fi

# Display current crontab
echo -e "${BLUE}Current crontab entries:${NC}"
crontab -l 2>/dev/null || echo "No crontab entries found"
echo ""

# Backup schedule options
echo -e "${BLUE}Select backup schedule:${NC}"
echo ""
echo "1) Daily at 2:00 AM (recommended)"
echo "2) Daily at midnight (12:00 AM)"
echo "3) Daily at 3:00 AM"
echo "4) Twice daily (2:00 AM and 2:00 PM)"
echo "5) Custom schedule"
echo "6) View examples and exit"
echo "7) Remove backup cron jobs and exit"
echo ""

read -p "Enter your choice (1-7): " choice

case $choice in
    1)
        CRON_SCHEDULE="0 2 * * *"
        DESCRIPTION="Daily at 2:00 AM"
        ;;
    2)
        CRON_SCHEDULE="0 0 * * *"
        DESCRIPTION="Daily at midnight"
        ;;
    3)
        CRON_SCHEDULE="0 3 * * *"
        DESCRIPTION="Daily at 3:00 AM"
        ;;
    4)
        CRON_SCHEDULE="0 2,14 * * *"
        DESCRIPTION="Twice daily (2:00 AM and 2:00 PM)"
        ;;
    5)
        echo ""
        echo "Enter custom cron schedule (e.g., '0 4 * * *' for 4:00 AM daily):"
        read -p "Cron schedule: " CRON_SCHEDULE
        DESCRIPTION="Custom schedule: $CRON_SCHEDULE"
        ;;
    6)
        cat << 'EOF'

=== Cron Schedule Examples ===

Daily backups:
  0 2 * * *     # Daily at 2:00 AM
  0 0 * * *     # Daily at midnight
  30 3 * * *    # Daily at 3:30 AM

Multiple times per day:
  0 2,14 * * *  # Twice daily (2 AM and 2 PM)
  0 */6 * * *   # Every 6 hours

Weekly backups:
  0 3 * * 0     # Weekly on Sunday at 3:00 AM
  0 2 * * 1-5   # Weekdays at 2:00 AM

Monthly backups:
  0 4 1 * *     # First day of month at 4:00 AM

=== Cron Format ===

* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, Sunday=0 or 7)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)

=== Additional Examples ===

# Production backup strategy (multiple retention periods)

# Daily backup (keep 7 days)
0 2 * * * /path/to/backup-system.sh >> /path/to/logs/cron.log 2>&1

# Weekly backup (keep 4 weeks)
0 3 * * 0 BACKUP_RETENTION_DAYS=28 /path/to/backup-system.sh >> /path/to/logs/cron-weekly.log 2>&1

# Monthly backup (keep 12 months)
0 4 1 * * BACKUP_RETENTION_DAYS=365 /path/to/backup-system.sh >> /path/to/logs/cron-monthly.log 2>&1

EOF
        exit 0
        ;;
    7)
        echo ""
        echo -e "${YELLOW}Removing backup cron jobs...${NC}"
        crontab -l 2>/dev/null | grep -v "$BACKUP_SCRIPT" | crontab - || true
        echo -e "${GREEN}Backup cron jobs removed${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

# Confirm
echo ""
echo -e "${BLUE}Backup Schedule Configuration:${NC}"
echo "  Schedule: $DESCRIPTION ($CRON_SCHEDULE)"
echo "  Script: $BACKUP_SCRIPT"
echo "  Logs: $LOG_DIR/cron.log"
echo ""

read -p "Do you want to add this to your crontab? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Cancelled"
    exit 0
fi

# Create cron job
CRON_JOB="$CRON_SCHEDULE $BACKUP_SCRIPT >> $LOG_DIR/cron.log 2>&1"

# Add to crontab
(crontab -l 2>/dev/null | grep -v "$BACKUP_SCRIPT"; echo "$CRON_JOB") | crontab -

echo ""
echo -e "${GREEN}✓ Backup cron job added successfully${NC}"
echo ""

# Display updated crontab
echo -e "${BLUE}Updated crontab:${NC}"
crontab -l | grep "$BACKUP_SCRIPT"
echo ""

# Additional setup recommendations
echo -e "${BLUE}=== Additional Setup Recommendations ===${NC}"
echo ""
echo "1. Weekly Backup (longer retention):"
echo "   Add this to your crontab for weekly backups with 4-week retention:"
echo "   0 3 * * 0 BACKUP_RETENTION_DAYS=28 $BACKUP_SCRIPT >> $LOG_DIR/cron-weekly.log 2>&1"
echo ""
echo "2. Monthly Backup (archive):"
echo "   Add this to your crontab for monthly backups with 1-year retention:"
echo "   0 4 1 * * BACKUP_RETENTION_DAYS=365 $BACKUP_SCRIPT >> $LOG_DIR/cron-monthly.log 2>&1"
echo ""
echo "3. Email Notifications:"
echo "   To receive email notifications, add MAILTO to your crontab:"
echo "   crontab -e"
echo "   Add at the top: MAILTO=your-email@example.com"
echo ""
echo "4. Monitor Backup Logs:"
echo "   tail -f $LOG_DIR/cron.log"
echo ""
echo "5. Test the backup:"
echo "   npm run backup:now"
echo ""
echo "6. Set up remote backup sync (S3, etc.):"
echo "   See BACKUP-RECOVERY-GUIDE.md for details"
echo ""

echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "The backup will run automatically according to the schedule."
echo "Check the log file for backup status: $LOG_DIR/cron.log"
echo ""
