#!/bin/bash

# Citizen Engagement App - File Integrity Monitor
# This script monitors critical files for unauthorized changes

set -e

# Configuration
PROJECT_DIR="/Users/shakaibtariq/Desktop/Citizen-Engagement/citizen-app"
MONITOR_DIR="$PROJECT_DIR/.monitor"
CHECKSUMS_FILE="$MONITOR_DIR/checksums.txt"
LAST_CHECK_FILE="$MONITOR_DIR/last_check.txt"
ALERT_LOG="$MONITOR_DIR/alerts.log"

# Critical files to monitor
CRITICAL_FILES=(
    "package.json"
    "next.config.mjs"
    "tailwind.config.ts"
    "tsconfig.json"
    "components.json"
    ".env.local"
    "components/location-setup.tsx"
    "components/leaflet-map.tsx"
    "components/home-page.tsx"
    "app/page.tsx"
    "app/layout.tsx"
)

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
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >> "$ALERT_LOG"
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1" >> "$ALERT_LOG"
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Create monitor directory
mkdir -p "$MONITOR_DIR"

# Change to project directory
cd "$PROJECT_DIR"

# Function to calculate checksums
calculate_checksums() {
    local temp_file=$(mktemp)
    
    for file in "${CRITICAL_FILES[@]}"; do
        if [ -f "$file" ]; then
            shasum -a 256 "$file" >> "$temp_file"
        else
            echo "MISSING: $file" >> "$temp_file"
        fi
    done
    
    echo "$temp_file"
}

# Function to initialize monitoring
init_monitoring() {
    log "Initializing file integrity monitoring..."
    
    local checksums_temp=$(calculate_checksums)
    cp "$checksums_temp" "$CHECKSUMS_FILE"
    rm "$checksums_temp"
    
    echo "$(date)" > "$LAST_CHECK_FILE"
    
    log "Monitoring initialized for ${#CRITICAL_FILES[@]} critical files"
    log "Baseline checksums saved to: $CHECKSUMS_FILE"
}

# Function to check file integrity
check_integrity() {
    if [ ! -f "$CHECKSUMS_FILE" ]; then
        warning "No baseline checksums found. Initializing monitoring..."
        init_monitoring
        return 0
    fi
    
    log "Checking file integrity..."
    
    local current_checksums=$(calculate_checksums)
    local changes_detected=false
    local changes_count=0
    
    # Compare checksums
    while IFS= read -r line; do
        local current_hash=$(echo "$line" | cut -d' ' -f1)
        local current_file=$(echo "$line" | cut -d' ' -f3-)
        
        if [[ "$line" == "MISSING:"* ]]; then
            local missing_file=$(echo "$line" | cut -d' ' -f2-)
            if grep -q "$missing_file" "$CHECKSUMS_FILE"; then
                error "CRITICAL FILE DELETED: $missing_file"
                changes_detected=true
                ((changes_count++))
            fi
            continue
        fi
        
        local baseline_hash=$(grep "$current_file" "$CHECKSUMS_FILE" 2>/dev/null | cut -d' ' -f1)
        
        if [ -z "$baseline_hash" ]; then
            warning "NEW FILE DETECTED: $current_file"
            changes_detected=true
            ((changes_count++))
        elif [ "$current_hash" != "$baseline_hash" ]; then
            error "FILE MODIFIED: $current_file"
            info "  Previous hash: $baseline_hash"
            info "  Current hash:  $current_hash"
            changes_detected=true
            ((changes_count++))
            
            # Show what changed using git if available
            if git status --porcelain "$current_file" 2>/dev/null | grep -q .; then
                info "  Git status: $(git status --porcelain "$current_file")"
            fi
        fi
        
    done < "$current_checksums"
    
    # Check for missing files that were in baseline
    while IFS= read -r line; do
        local baseline_file=$(echo "$line" | cut -d' ' -f3-)
        if ! grep -q "$baseline_file" "$current_checksums"; then
            error "CRITICAL FILE MISSING: $baseline_file"
            changes_detected=true
            ((changes_count++))
        fi
    done < "$CHECKSUMS_FILE"
    
    rm "$current_checksums"
    
    if [ "$changes_detected" = true ]; then
        error "INTEGRITY CHECK FAILED: $changes_count changes detected"
        
        # Create alert summary
        cat >> "$ALERT_LOG" << EOF

=== INTEGRITY ALERT SUMMARY ===
Date: $(date)
Changes Detected: $changes_count
Last Check: $(cat "$LAST_CHECK_FILE" 2>/dev/null || echo "Unknown")
Git Status: $(git status --porcelain | wc -l) files modified
Git Commit: $(git rev-parse HEAD 2>/dev/null || echo "N/A")
================================

EOF
        
        return 1
    else
        log "File integrity check passed - all files unchanged"
        echo "$(date)" > "$LAST_CHECK_FILE"
        return 0
    fi
}

# Function to update baseline
update_baseline() {
    log "Updating baseline checksums..."
    
    # Backup old checksums
    if [ -f "$CHECKSUMS_FILE" ]; then
        cp "$CHECKSUMS_FILE" "$CHECKSUMS_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    local checksums_temp=$(calculate_checksums)
    cp "$checksums_temp" "$CHECKSUMS_FILE"
    rm "$checksums_temp"
    
    echo "$(date)" > "$LAST_CHECK_FILE"
    
    log "Baseline updated successfully"
}

# Function to show status
show_status() {
    echo ""
    echo "=== FILE INTEGRITY MONITOR STATUS ==="
    echo "Project Directory: $PROJECT_DIR"
    echo "Monitor Directory: $MONITOR_DIR"
    echo "Critical Files: ${#CRITICAL_FILES[@]}"
    
    if [ -f "$LAST_CHECK_FILE" ]; then
        echo "Last Check: $(cat "$LAST_CHECK_FILE")"
    else
        echo "Last Check: Never"
    fi
    
    if [ -f "$CHECKSUMS_FILE" ]; then
        echo "Baseline: Established"
        echo "Baseline Files: $(wc -l < "$CHECKSUMS_FILE")"
    else
        echo "Baseline: Not established"
    fi
    
    if [ -f "$ALERT_LOG" ]; then
        local alert_count=$(grep -c "ERROR\|WARNING" "$ALERT_LOG" 2>/dev/null || echo "0")
        echo "Total Alerts: $alert_count"
    else
        echo "Total Alerts: 0"
    fi
    
    echo "======================================"
    echo ""
}

# Function to show recent alerts
show_alerts() {
    if [ -f "$ALERT_LOG" ]; then
        echo "=== RECENT ALERTS ==="
        tail -20 "$ALERT_LOG"
        echo "===================="
    else
        echo "No alerts found"
    fi
}

# Main script logic
case "${1:-check}" in
    "init")
        init_monitoring
        ;;
    "check")
        check_integrity
        ;;
    "update")
        update_baseline
        ;;
    "status")
        show_status
        ;;
    "alerts")
        show_alerts
        ;;
    "watch")
        log "Starting continuous monitoring (Ctrl+C to stop)..."
        while true; do
            check_integrity || true
            sleep 60  # Check every minute
        done
        ;;
    *)
        echo "Usage: $0 {init|check|update|status|alerts|watch}"
        echo ""
        echo "Commands:"
        echo "  init    - Initialize monitoring with current file state"
        echo "  check   - Check file integrity against baseline"
        echo "  update  - Update baseline with current file state"
        echo "  status  - Show monitoring status"
        echo "  alerts  - Show recent alerts"
        echo "  watch   - Continuous monitoring (every 60 seconds)"
        exit 1
        ;;
esac 