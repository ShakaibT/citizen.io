#!/bin/bash

# Citizen Engagement App - Automated Backup Script
# This script creates timestamped backups of the entire project

set -e  # Exit on any error

# Configuration
PROJECT_NAME="citizen-app"
PROJECT_DIR="/Users/shakaibtariq/Desktop/Citizen-Engagement/citizen-app"
BACKUP_DIR="/Users/shakaibtariq/Desktop/Citizen-Engagement/backups"
MAX_BACKUPS=30  # Keep last 30 backups
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="${PROJECT_NAME}_backup_${TIMESTAMP}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

log "Starting backup process for $PROJECT_NAME"

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    error "Project directory not found: $PROJECT_DIR"
    exit 1
fi

# Change to project directory
cd "$PROJECT_DIR"

# Check Git status
log "Checking Git status..."
if ! git status --porcelain | grep -q .; then
    log "Working tree is clean"
else
    warning "Working tree has uncommitted changes"
    git status --short
fi

# Create backup archive
log "Creating backup archive: $BACKUP_NAME.tar.gz"
tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" \
    --exclude='.next' \
    --exclude='node_modules' \
    --exclude='.git/objects' \
    --exclude='.git/logs' \
    --exclude='*.log' \
    --exclude='.DS_Store' \
    --exclude='*.tmp' \
    -C "$(dirname "$PROJECT_DIR")" \
    "$(basename "$PROJECT_DIR")"

# Verify backup was created
if [ -f "$BACKUP_DIR/$BACKUP_NAME.tar.gz" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_NAME.tar.gz" | cut -f1)
    log "Backup created successfully: $BACKUP_NAME.tar.gz ($BACKUP_SIZE)"
else
    error "Failed to create backup"
    exit 1
fi

# Create metadata file
log "Creating backup metadata..."
cat > "$BACKUP_DIR/$BACKUP_NAME.meta" << EOF
Backup Information
==================
Project: $PROJECT_NAME
Timestamp: $TIMESTAMP
Date: $(date)
Git Commit: $(git rev-parse HEAD 2>/dev/null || echo "N/A")
Git Branch: $(git branch --show-current 2>/dev/null || echo "N/A")
Backup Size: $BACKUP_SIZE
Node Version: $(node --version 2>/dev/null || echo "N/A")
NPM Version: $(npm --version 2>/dev/null || echo "N/A")
Working Tree Status: $(git status --porcelain | wc -l) files modified
EOF

# Create quick restore script
log "Creating restore script..."
cat > "$BACKUP_DIR/${BACKUP_NAME}_restore.sh" << EOF
#!/bin/bash
# Quick restore script for backup: $BACKUP_NAME

set -e

RESTORE_DIR="\$1"
if [ -z "\$RESTORE_DIR" ]; then
    echo "Usage: \$0 <restore_directory>"
    echo "Example: \$0 /Users/shakaibtariq/Desktop/Citizen-Engagement/citizen-app-restored"
    exit 1
fi

echo "Restoring backup $BACKUP_NAME to \$RESTORE_DIR"

# Create restore directory
mkdir -p "\$RESTORE_DIR"

# Extract backup
tar -xzf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" -C "\$(dirname "\$RESTORE_DIR")"

# Rename extracted directory
mv "\$(dirname "\$RESTORE_DIR")/$(basename "$PROJECT_DIR")" "\$RESTORE_DIR"

echo "Backup restored to: \$RESTORE_DIR"
echo "Next steps:"
echo "1. cd \$RESTORE_DIR"
echo "2. npm install"
echo "3. npm run dev"
EOF

chmod +x "$BACKUP_DIR/${BACKUP_NAME}_restore.sh"

# Clean up old backups
log "Cleaning up old backups (keeping last $MAX_BACKUPS)..."
cd "$BACKUP_DIR"
ls -t ${PROJECT_NAME}_backup_*.tar.gz 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm -f
ls -t ${PROJECT_NAME}_backup_*.meta 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm -f
ls -t ${PROJECT_NAME}_backup_*_restore.sh 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm -f

# List current backups
BACKUP_COUNT=$(ls -1 ${PROJECT_NAME}_backup_*.tar.gz 2>/dev/null | wc -l)
log "Total backups: $BACKUP_COUNT"

# Create latest symlink
ln -sf "$BACKUP_NAME.tar.gz" "${PROJECT_NAME}_latest.tar.gz"
ln -sf "$BACKUP_NAME.meta" "${PROJECT_NAME}_latest.meta"
ln -sf "${BACKUP_NAME}_restore.sh" "${PROJECT_NAME}_latest_restore.sh"

log "Backup process completed successfully!"
log "Backup location: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
log "Metadata: $BACKUP_DIR/$BACKUP_NAME.meta"
log "Restore script: $BACKUP_DIR/${BACKUP_NAME}_restore.sh"

# Display backup summary
echo ""
echo "=== BACKUP SUMMARY ==="
echo "Backup Name: $BACKUP_NAME"
echo "Backup Size: $BACKUP_SIZE"
echo "Location: $BACKUP_DIR"
echo "Total Backups: $BACKUP_COUNT"
echo "=======================" 