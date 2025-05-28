#!/bin/bash

# Citizen Engagement App - Quick Recovery Script
# This script provides rapid recovery options for the project

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

# Function to show current status
show_status() {
    echo ""
    echo "=== PROJECT STATUS ==="
    cd "$PROJECT_DIR"
    
    echo "Current Directory: $(pwd)"
    echo "Git Branch: $(git branch --show-current 2>/dev/null || echo "N/A")"
    echo "Git Commit: $(git rev-parse --short HEAD 2>/dev/null || echo "N/A")"
    echo "Working Tree: $(git status --porcelain | wc -l) files modified"
    
    if [ -d ".next" ]; then
        echo "Build Cache: Present"
    else
        echo "Build Cache: Cleared"
    fi
    
    if [ -d "node_modules" ]; then
        echo "Dependencies: Installed"
    else
        echo "Dependencies: Missing"
    fi
    
    echo "======================"
    echo ""
}

# Function to perform git-based recovery
git_recovery() {
    log "Starting Git-based recovery..."
    
    cd "$PROJECT_DIR"
    
    # Show current status
    info "Current Git status:"
    git status --short || true
    
    # Stash any uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        warning "Uncommitted changes detected. Stashing..."
        git stash push -m "Auto-stash before recovery $(date)"
        info "Changes stashed. Use 'git stash pop' to restore if needed."
    fi
    
    # Reset to last known good state
    log "Resetting to last commit on main branch..."
    git checkout main
    git reset --hard HEAD
    git clean -fd
    
    # Pull latest changes
    log "Pulling latest changes from remote..."
    git pull origin main || warning "Could not pull from remote (offline?)"
    
    # Clear build cache
    log "Clearing build cache..."
    rm -rf .next
    
    # Reinstall dependencies
    log "Reinstalling dependencies..."
    npm install
    
    log "Git-based recovery completed!"
}

# Function to restore from backup
backup_recovery() {
    if [ ! -d "$BACKUP_DIR" ]; then
        error "Backup directory not found: $BACKUP_DIR"
        return 1
    fi
    
    # List available backups
    echo "Available backups:"
    ls -la "$BACKUP_DIR"/citizen-app_backup_*.tar.gz 2>/dev/null | tail -10 || {
        error "No backups found in $BACKUP_DIR"
        return 1
    }
    
    # Use latest backup if no specific backup specified
    local backup_file="$BACKUP_DIR/citizen-app_latest.tar.gz"
    
    if [ ! -f "$backup_file" ]; then
        error "Latest backup not found: $backup_file"
        return 1
    fi
    
    log "Restoring from backup: $backup_file"
    
    # Create temporary restore directory
    local temp_restore="/tmp/citizen-app-restore-$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$temp_restore"
    
    # Extract backup
    log "Extracting backup..."
    tar -xzf "$backup_file" -C "$temp_restore"
    
    # Stop any running development server
    log "Stopping any running processes..."
    pkill -f "next dev" || true
    sleep 2
    
    # Backup current state
    if [ -d "$PROJECT_DIR" ]; then
        local current_backup="$PROJECT_DIR.backup.$(date +%Y%m%d_%H%M%S)"
        log "Backing up current state to: $current_backup"
        mv "$PROJECT_DIR" "$current_backup"
    fi
    
    # Restore from backup
    log "Restoring project..."
    mv "$temp_restore/citizen-app" "$PROJECT_DIR"
    
    # Set proper permissions
    chmod +x "$PROJECT_DIR/scripts/"*.sh 2>/dev/null || true
    
    cd "$PROJECT_DIR"
    
    # Reinstall dependencies
    log "Installing dependencies..."
    npm install
    
    log "Backup recovery completed!"
    info "Previous state backed up to: $current_backup"
}

# Function to perform emergency reset
emergency_reset() {
    warning "EMERGENCY RESET - This will destroy all local changes!"
    echo "This will:"
    echo "1. Reset Git repository to remote main branch"
    echo "2. Delete all local changes"
    echo "3. Clear all caches"
    echo "4. Reinstall all dependencies"
    echo ""
    read -p "Are you sure? Type 'YES' to continue: " confirm
    
    if [ "$confirm" != "YES" ]; then
        info "Emergency reset cancelled"
        return 0
    fi
    
    log "Starting emergency reset..."
    
    cd "$PROJECT_DIR"
    
    # Force reset everything
    git fetch origin
    git reset --hard origin/main
    git clean -fdx
    
    # Clear all caches
    rm -rf .next node_modules
    
    # Reinstall everything
    npm install
    
    log "Emergency reset completed!"
    warning "All local changes have been lost!"
}

# Function to run diagnostics
run_diagnostics() {
    log "Running project diagnostics..."
    
    cd "$PROJECT_DIR"
    
    echo ""
    echo "=== DIAGNOSTICS REPORT ==="
    
    # Check Git status
    echo "Git Status:"
    git status --porcelain | head -10
    if [ $(git status --porcelain | wc -l) -gt 10 ]; then
        echo "... and $(( $(git status --porcelain | wc -l) - 10 )) more files"
    fi
    echo ""
    
    # Check for syntax errors
    echo "Checking for syntax errors..."
    if command -v npx >/dev/null 2>&1; then
        npx tsc --noEmit --skipLibCheck 2>&1 | head -20 || echo "TypeScript check completed"
    else
        echo "TypeScript not available"
    fi
    echo ""
    
    # Check package.json
    echo "Package.json status:"
    if [ -f "package.json" ]; then
        echo "✓ package.json exists"
        if npm list --depth=0 >/dev/null 2>&1; then
            echo "✓ Dependencies are consistent"
        else
            echo "✗ Dependency issues detected"
        fi
    else
        echo "✗ package.json missing"
    fi
    echo ""
    
    # Check critical files
    echo "Critical files status:"
    local critical_files=("next.config.mjs" "tailwind.config.ts" "tsconfig.json")
    for file in "${critical_files[@]}"; do
        if [ -f "$file" ]; then
            echo "✓ $file"
        else
            echo "✗ $file missing"
        fi
    done
    echo ""
    
    # Check for common issues
    echo "Common issues check:"
    if [ -d ".next" ]; then
        echo "✓ Build cache exists"
    else
        echo "! Build cache cleared"
    fi
    
    if [ -d "node_modules" ]; then
        echo "✓ Dependencies installed"
    else
        echo "✗ Dependencies missing"
    fi
    
    echo "=========================="
    echo ""
}

# Function to test recovery
test_recovery() {
    log "Testing project after recovery..."
    
    cd "$PROJECT_DIR"
    
    # Clear build cache
    rm -rf .next
    
    # Try to build
    log "Testing build process..."
    if npm run build >/dev/null 2>&1; then
        log "✓ Build successful"
    else
        error "✗ Build failed"
        return 1
    fi
    
    # Try to start dev server (briefly)
    log "Testing development server..."
    timeout 10s npm run dev >/dev/null 2>&1 || true
    
    log "Recovery test completed successfully!"
}

# Main script logic
case "${1:-status}" in
    "status")
        show_status
        ;;
    "git")
        show_status
        git_recovery
        show_status
        ;;
    "backup")
        show_status
        backup_recovery
        show_status
        ;;
    "emergency")
        show_status
        emergency_reset
        show_status
        ;;
    "diagnose")
        run_diagnostics
        ;;
    "test")
        test_recovery
        ;;
    "full")
        log "Starting full recovery process..."
        show_status
        run_diagnostics
        git_recovery
        test_recovery
        show_status
        log "Full recovery completed!"
        ;;
    *)
        echo "Citizen Engagement App - Quick Recovery Script"
        echo ""
        echo "Usage: $0 {status|git|backup|emergency|diagnose|test|full}"
        echo ""
        echo "Commands:"
        echo "  status     - Show current project status"
        echo "  git        - Recover using Git (recommended)"
        echo "  backup     - Restore from latest backup"
        echo "  emergency  - Emergency reset (destroys local changes)"
        echo "  diagnose   - Run project diagnostics"
        echo "  test       - Test project after recovery"
        echo "  full       - Complete recovery process"
        echo ""
        echo "Examples:"
        echo "  $0 git      # Quick Git-based recovery"
        echo "  $0 full     # Complete recovery with diagnostics"
        echo "  $0 diagnose # Check for issues"
        exit 1
        ;;
esac 