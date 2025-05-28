#!/bin/bash

# Citizen Engagement App - Backup System Setup
# This script initializes the complete backup and monitoring system

set -e

# Configuration
PROJECT_DIR="/Users/shakaibtariq/Desktop/Citizen-Engagement/citizen-app"
BACKUP_DIR="/Users/shakaibtariq/Desktop/Citizen-Engagement/backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

echo ""
echo "=========================================="
echo "  Citizen Engagement App Backup Setup"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "components" ]; then
    error "This doesn't appear to be the citizen-app directory"
    error "Please run this script from: $PROJECT_DIR"
    exit 1
fi

log "Setting up backup and recovery system..."

# 1. Create backup directory
log "Creating backup directory..."
mkdir -p "$BACKUP_DIR"
info "Backup directory: $BACKUP_DIR"

# 2. Initialize file integrity monitoring
log "Initializing file integrity monitoring..."
./scripts/monitor.sh init

# 3. Create first backup
log "Creating initial backup..."
./scripts/backup.sh

# 4. Create Git tag for current state
log "Creating Git tag for current stable state..."
CURRENT_DATE=$(date +%Y%m%d_%H%M%S)
git tag -a "stable-$CURRENT_DATE" -m "Stable state before backup system setup - $(date)"
info "Created Git tag: stable-$CURRENT_DATE"

# 5. Add backup scripts to .gitignore if not already there
log "Updating .gitignore..."
if ! grep -q "\.monitor/" .gitignore 2>/dev/null; then
    echo "" >> .gitignore
    echo "# Backup and monitoring" >> .gitignore
    echo ".monitor/" >> .gitignore
    echo "backups/" >> .gitignore
fi

# 6. Create cron job for automated backups (optional)
log "Setting up automated backups..."
CRON_JOB="0 */6 * * * cd $PROJECT_DIR && ./scripts/backup.sh >/dev/null 2>&1"
MONITOR_JOB="*/30 * * * * cd $PROJECT_DIR && ./scripts/monitor.sh check >/dev/null 2>&1"

echo ""
echo "=== AUTOMATED BACKUP SETUP ==="
echo "To enable automated backups, add these cron jobs:"
echo ""
echo "# Backup every 6 hours"
echo "$CRON_JOB"
echo ""
echo "# Monitor file integrity every 30 minutes"
echo "$MONITOR_JOB"
echo ""
echo "To add these, run: crontab -e"
echo "=============================="
echo ""

# 7. Create quick access aliases
log "Creating quick access commands..."
cat > scripts/backup-commands.sh << 'EOF'
#!/bin/bash
# Quick backup and recovery commands

# Backup commands
alias backup-now='cd /Users/shakaibtariq/Desktop/Citizen-Engagement/citizen-app && ./scripts/backup.sh'
alias backup-status='cd /Users/shakaibtariq/Desktop/Citizen-Engagement/citizen-app && ls -la /Users/shakaibtariq/Desktop/Citizen-Engagement/backups/'

# Monitoring commands
alias monitor-check='cd /Users/shakaibtariq/Desktop/Citizen-Engagement/citizen-app && ./scripts/monitor.sh check'
alias monitor-status='cd /Users/shakaibtariq/Desktop/Citizen-Engagement/citizen-app && ./scripts/monitor.sh status'
alias monitor-alerts='cd /Users/shakaibtariq/Desktop/Citizen-Engagement/citizen-app && ./scripts/monitor.sh alerts'

# Recovery commands
alias recover-git='cd /Users/shakaibtariq/Desktop/Citizen-Engagement/citizen-app && ./scripts/quick-recovery.sh git'
alias recover-backup='cd /Users/shakaibtariq/Desktop/Citizen-Engagement/citizen-app && ./scripts/quick-recovery.sh backup'
alias recover-status='cd /Users/shakaibtariq/Desktop/Citizen-Engagement/citizen-app && ./scripts/quick-recovery.sh status'
alias recover-diagnose='cd /Users/shakaibtariq/Desktop/Citizen-Engagement/citizen-app && ./scripts/quick-recovery.sh diagnose'

echo "Backup and recovery aliases loaded!"
echo "Available commands:"
echo "  backup-now      - Create backup now"
echo "  backup-status   - Show backup status"
echo "  monitor-check   - Check file integrity"
echo "  monitor-status  - Show monitoring status"
echo "  monitor-alerts  - Show recent alerts"
echo "  recover-git     - Quick Git recovery"
echo "  recover-backup  - Restore from backup"
echo "  recover-status  - Show project status"
echo "  recover-diagnose - Run diagnostics"
EOF

chmod +x scripts/backup-commands.sh

# 8. Test the system
log "Testing backup system..."
./scripts/monitor.sh status
./scripts/quick-recovery.sh status

# 9. Create emergency contact card
cat > EMERGENCY-RECOVERY.md << 'EOF'
# 🚨 EMERGENCY RECOVERY GUIDE

## Quick Recovery Commands

### If the site is broken:
```bash
cd /Users/shakaibtariq/Desktop/Citizen-Engagement/citizen-app
./scripts/quick-recovery.sh git
```

### If Git recovery fails:
```bash
./scripts/quick-recovery.sh backup
```

### For complete system failure:
```bash
./scripts/quick-recovery.sh emergency
```

### To check what's wrong:
```bash
./scripts/quick-recovery.sh diagnose
```

## Emergency Contacts
- Primary Developer: [Add your contact]
- Backup Developer: [Add backup contact]
- System Admin: [Add admin contact]

## Important Locations
- Project: `/Users/shakaibtariq/Desktop/Citizen-Engagement/citizen-app`
- Backups: `/Users/shakaibtariq/Desktop/Citizen-Engagement/backups`
- Scripts: `./scripts/`

## Last Resort
If everything fails, restore from the latest backup:
1. Go to backup directory
2. Find latest backup file
3. Run the restore script that comes with it

**Remember: STOP and assess before making changes!**
EOF

echo ""
echo "=========================================="
echo "  🎉 BACKUP SYSTEM SETUP COMPLETE!"
echo "=========================================="
echo ""
echo "✅ Backup directory created"
echo "✅ File integrity monitoring initialized"
echo "✅ Initial backup created"
echo "✅ Git tag created for current state"
echo "✅ Quick recovery scripts ready"
echo "✅ Emergency guide created"
echo ""
echo "📁 Files created:"
echo "   - backup-strategy.md (comprehensive strategy)"
echo "   - EMERGENCY-RECOVERY.md (quick reference)"
echo "   - scripts/backup.sh (automated backups)"
echo "   - scripts/monitor.sh (file monitoring)"
echo "   - scripts/quick-recovery.sh (recovery options)"
echo "   - scripts/backup-commands.sh (quick aliases)"
echo ""
echo "🔧 Next steps:"
echo "   1. Review backup-strategy.md"
echo "   2. Set up cron jobs for automation (optional)"
echo "   3. Test recovery: ./scripts/quick-recovery.sh test"
echo "   4. Load aliases: source scripts/backup-commands.sh"
echo ""
echo "🚨 Emergency recovery:"
echo "   ./scripts/quick-recovery.sh git"
echo ""
echo "=========================================="

log "Backup system setup completed successfully!" 