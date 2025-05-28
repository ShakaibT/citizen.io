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
