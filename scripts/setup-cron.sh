#!/bin/bash

# Setup script for automated daily data syncing
# This script sets up cron jobs to run daily data sync and reporting

echo "🔧 Setting up automated daily data sync for Citizen Engagement App..."

# Configuration
APP_URL="${APP_URL:-http://localhost:3000}"
SYNC_AUTH_KEY="${DAILY_SYNC_AUTH_KEY:-your-secure-sync-key}"
REPORT_EMAIL="${REPORT_EMAIL:-admin@example.com}"

# Create log directory
LOG_DIR="/var/log/citizen-app"
sudo mkdir -p "$LOG_DIR"
sudo chown $USER:$USER "$LOG_DIR"

# Create sync script
SYNC_SCRIPT="/usr/local/bin/citizen-app-sync.sh"
sudo tee "$SYNC_SCRIPT" > /dev/null << EOF
#!/bin/bash

# Daily sync script for Citizen Engagement App
# This script runs the daily data sync and generates reports

LOG_FILE="$LOG_DIR/sync-\$(date +%Y-%m-%d).log"
DATE=\$(date '+%Y-%m-%d %H:%M:%S')

echo "[\$DATE] Starting daily data sync..." >> "\$LOG_FILE"

# Run daily sync
SYNC_RESPONSE=\$(curl -s -X POST \\
  -H "Authorization: Bearer $SYNC_AUTH_KEY" \\
  -H "Content-Type: application/json" \\
  "$APP_URL/api/sync/daily" \\
  2>&1)

SYNC_EXIT_CODE=\$?

if [ \$SYNC_EXIT_CODE -eq 0 ]; then
    echo "[\$DATE] Daily sync completed successfully" >> "\$LOG_FILE"
    echo "\$SYNC_RESPONSE" >> "\$LOG_FILE"
    
    # Generate and send daily report
    REPORT_RESPONSE=\$(curl -s -X POST \\
      -H "Content-Type: application/json" \\
      -d '{"email": "$REPORT_EMAIL"}' \\
      "$APP_URL/api/reports/daily" \\
      2>&1)
    
    REPORT_EXIT_CODE=\$?
    
    if [ \$REPORT_EXIT_CODE -eq 0 ]; then
        echo "[\$DATE] Daily report generated successfully" >> "\$LOG_FILE"
    else
        echo "[\$DATE] Failed to generate daily report: \$REPORT_RESPONSE" >> "\$LOG_FILE"
    fi
else
    echo "[\$DATE] Daily sync failed: \$SYNC_RESPONSE" >> "\$LOG_FILE"
    
    # Send failure notification
    curl -s -X POST \\
      -H "Content-Type: application/json" \\
      -d '{"email": "$REPORT_EMAIL", "subject": "🚨 Daily Sync Failed", "message": "Daily data sync failed. Check logs for details."}' \\
      "$APP_URL/api/notifications/email" \\
      >> "\$LOG_FILE" 2>&1
fi

# Clean up old log files (keep last 30 days)
find "$LOG_DIR" -name "sync-*.log" -mtime +30 -delete

echo "[\$DATE] Sync process completed" >> "\$LOG_FILE"
EOF

# Make sync script executable
sudo chmod +x "$SYNC_SCRIPT"

# Create weekly cleanup script
CLEANUP_SCRIPT="/usr/local/bin/citizen-app-cleanup.sh"
sudo tee "$CLEANUP_SCRIPT" > /dev/null << EOF
#!/bin/bash

# Weekly cleanup script for Citizen Engagement App
# This script cleans up old data and optimizes the database

LOG_FILE="$LOG_DIR/cleanup-\$(date +%Y-%m-%d).log"
DATE=\$(date '+%Y-%m-%d %H:%M:%S')

echo "[\$DATE] Starting weekly cleanup..." >> "\$LOG_FILE"

# Clean up old sync logs (keep last 90 days)
CLEANUP_RESPONSE=\$(curl -s -X POST \\
  -H "Authorization: Bearer $SYNC_AUTH_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"days_to_keep": 90}' \\
  "$APP_URL/api/maintenance/cleanup" \\
  2>&1)

echo "[\$DATE] Cleanup response: \$CLEANUP_RESPONSE" >> "\$LOG_FILE"
echo "[\$DATE] Weekly cleanup completed" >> "\$LOG_FILE"
EOF

# Make cleanup script executable
sudo chmod +x "$CLEANUP_SCRIPT"

# Add cron jobs
echo "📅 Setting up cron jobs..."

# Create temporary cron file
TEMP_CRON=$(mktemp)

# Get existing cron jobs (if any)
crontab -l 2>/dev/null > "$TEMP_CRON" || true

# Remove any existing citizen-app cron jobs
sed -i '/citizen-app/d' "$TEMP_CRON"

# Add new cron jobs
cat >> "$TEMP_CRON" << EOF

# Citizen Engagement App - Daily data sync at 2 AM
0 2 * * * $SYNC_SCRIPT

# Citizen Engagement App - Weekly cleanup on Sundays at 3 AM
0 3 * * 0 $CLEANUP_SCRIPT

# Citizen Engagement App - Health check every 6 hours
0 */6 * * * curl -s "$APP_URL/api/health" > /dev/null || echo "Health check failed at \$(date)" >> $LOG_DIR/health.log

EOF

# Install the new cron jobs
crontab "$TEMP_CRON"

# Clean up
rm "$TEMP_CRON"

echo "✅ Cron jobs installed successfully!"
echo ""
echo "📋 Summary:"
echo "  - Daily sync: Every day at 2:00 AM"
echo "  - Weekly cleanup: Every Sunday at 3:00 AM"
echo "  - Health checks: Every 6 hours"
echo "  - Logs location: $LOG_DIR"
echo "  - Sync script: $SYNC_SCRIPT"
echo "  - Cleanup script: $CLEANUP_SCRIPT"
echo ""
echo "🔧 Configuration:"
echo "  - App URL: $APP_URL"
echo "  - Report email: $REPORT_EMAIL"
echo "  - Auth key: ${SYNC_AUTH_KEY:0:10}..."
echo ""
echo "📝 To view current cron jobs: crontab -l"
echo "📝 To view sync logs: tail -f $LOG_DIR/sync-\$(date +%Y-%m-%d).log"
echo "📝 To manually run sync: $SYNC_SCRIPT"
echo ""
echo "⚠️  Make sure to:"
echo "  1. Set DAILY_SYNC_AUTH_KEY in your environment"
echo "  2. Set REPORT_EMAIL to your email address"
echo "  3. Ensure your app is running and accessible at $APP_URL"
echo "  4. Test the sync manually before relying on cron"
echo ""
echo "🧪 Test the setup:"
echo "  curl -X POST -H \"Authorization: Bearer $SYNC_AUTH_KEY\" $APP_URL/api/sync/daily"
echo "  curl -X GET $APP_URL/api/reports/daily?format=html" 