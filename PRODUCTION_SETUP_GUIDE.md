# Production Setup Guide - Citizen Engagement App

This guide will help you set up a robust, production-ready data architecture for the Citizen Engagement App with automated daily updates, fallback data, and comprehensive monitoring.

## 🏗️ Architecture Overview

The new architecture includes:
- **Live Data Tables**: Real-time data from APIs (officials, counties)
- **Fallback Data Tables**: Reliable backup data for when APIs fail
- **Automated Daily Sync**: Updates data every day at 2 AM
- **Comprehensive Monitoring**: Daily reports and health checks
- **Fast Performance**: Local database queries instead of API calls

## 📋 Prerequisites

1. **Supabase Project**: Set up a Supabase project
2. **API Keys**: Get Congress.gov and Census API keys
3. **Server Access**: Linux server with cron capability
4. **Email Service**: (Optional) SendGrid or AWS SES for reports

## 🚀 Step 1: Database Setup

### 1.1 Run the Database Schema

Execute the production database schema in your Supabase SQL editor:

```bash
# Copy and run the contents of database-production-architecture.sql
# This creates all tables, indexes, functions, and initial fallback data
```

### 1.2 Verify Database Setup

Check that these tables were created:
- `officials` (live data)
- `counties` (live data)
- `fallback_officials` (backup data)
- `fallback_counties` (backup data)
- `data_sync_logs` (monitoring)

## 🔧 Step 2: Environment Configuration

### 2.1 Copy Environment File

```bash
cp PRODUCTION.env.local .env.local
```

### 2.2 Configure Required Variables

Edit `.env.local` with your actual values:

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# API Keys (Required)
CONGRESS_API_KEY=your_congress_api_key
CENSUS_API_KEY=your_census_api_key

# Daily Sync (Required)
DAILY_SYNC_AUTH_KEY=your_secure_random_key
REPORT_EMAIL=your_email@domain.com
APP_URL=https://your-app-domain.com
```

### 2.3 Generate Secure Auth Key

```bash
# Generate a secure random key for daily sync authentication
openssl rand -hex 32
```

## 🤖 Step 3: Automated Daily Sync Setup

### 3.1 Run the Setup Script

```bash
# Make the script executable
chmod +x scripts/setup-cron.sh

# Set environment variables
export APP_URL="https://your-app-domain.com"
export DAILY_SYNC_AUTH_KEY="your_secure_key"
export REPORT_EMAIL="your_email@domain.com"

# Run the setup script
./scripts/setup-cron.sh
```

### 3.2 Verify Cron Jobs

```bash
# Check installed cron jobs
crontab -l

# You should see:
# 0 2 * * * /usr/local/bin/citizen-app-sync.sh (Daily sync at 2 AM)
# 0 3 * * 0 /usr/local/bin/citizen-app-cleanup.sh (Weekly cleanup)
# 0 */6 * * * curl -s "https://your-app.com/api/health" (Health checks)
```

## 🧪 Step 4: Testing

### 4.1 Test Manual Sync

```bash
# Test the daily sync endpoint
curl -X POST \
  -H "Authorization: Bearer your_secure_key" \
  -H "Content-Type: application/json" \
  "https://your-app.com/api/sync/daily"
```

### 4.2 Test Daily Report

```bash
# Test the daily report (HTML format)
curl "https://your-app.com/api/reports/daily?format=html"

# Test sending report via email
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"email": "your_email@domain.com"}' \
  "https://your-app.com/api/reports/daily"
```

### 4.3 Test API Endpoints

```bash
# Test officials API (should be fast now)
curl "https://your-app.com/api/officials?state=Pennsylvania"

# Test counties API (should be fast now)
curl "https://your-app.com/api/counties?state=Pennsylvania"
```

## 📊 Step 5: Monitoring Setup

### 5.1 View Sync Logs

```bash
# View today's sync log
tail -f /var/log/citizen-app/sync-$(date +%Y-%m-%d).log

# View all recent logs
ls -la /var/log/citizen-app/
```

### 5.2 Database Monitoring

Check sync status in Supabase:

```sql
-- View recent sync operations
SELECT * FROM data_sync_logs 
ORDER BY created_at DESC 
LIMIT 20;

-- Check data freshness
SELECT 
  state,
  COUNT(*) as official_count,
  MAX(last_updated) as last_updated
FROM officials 
WHERE is_active = true
GROUP BY state
ORDER BY state;
```

### 5.3 Set Up Alerts (Optional)

Configure monitoring alerts for:
- Daily sync failures
- API rate limit exceeded
- Database connection issues
- Missing data for states

## 🔄 Step 6: Data Flow Verification

### 6.1 Understand the Data Flow

1. **Daily Sync (2 AM)**: 
   - Fetches fresh data from Congress.gov and Census APIs
   - Updates live data tables
   - Updates fallback tables with successful data
   - Logs all operations

2. **Website Requests**:
   - Queries local database (fast!)
   - Uses fallback data if live data unavailable
   - No external API calls during user interactions

3. **Daily Reports**:
   - Analyzes data quality
   - Identifies issues and missing data
   - Provides recommendations
   - Sends email notifications

### 6.2 Verify Data Sources

Check which states are using which data sources:

```bash
# Get daily report to see data source breakdown
curl "https://your-app.com/api/reports/daily" | jq '.report.dataQuality'
```

## 🚨 Step 7: Troubleshooting

### 7.1 Common Issues

**Sync Failing:**
```bash
# Check logs
tail -f /var/log/citizen-app/sync-$(date +%Y-%m-%d).log

# Test API keys
curl "https://api.congress.gov/v3/member?api_key=YOUR_KEY"
curl "https://api.census.gov/data/2023/acs/acs5?get=NAME&for=state:*&key=YOUR_KEY"
```

**Database Connection Issues:**
```bash
# Test Supabase connection
curl -H "apikey: YOUR_ANON_KEY" "https://your-project.supabase.co/rest/v1/officials?select=count"
```

**Cron Jobs Not Running:**
```bash
# Check cron service
sudo systemctl status cron

# Check cron logs
sudo tail -f /var/log/syslog | grep CRON
```

### 7.2 Manual Recovery

If sync fails for multiple days:

```bash
# Run manual sync
/usr/local/bin/citizen-app-sync.sh

# Check database for missing states
# Add missing data to fallback tables if needed
```

## 📈 Step 8: Performance Optimization

### 8.1 Database Indexes

The schema includes optimized indexes, but monitor query performance:

```sql
-- Check slow queries in Supabase dashboard
-- Add additional indexes if needed for your specific use cases
```

### 8.2 API Rate Limiting

Monitor API usage to avoid rate limits:
- Congress.gov: 5,000 requests/hour
- Census.gov: No official limit, but be respectful

### 8.3 Caching

Consider adding Redis caching for frequently accessed data:
- State lists
- Popular county data
- Official information

## 🔐 Step 9: Security

### 9.1 Secure Your Environment

- Use strong, unique passwords
- Rotate API keys regularly
- Limit database access
- Use HTTPS everywhere

### 9.2 Monitor Access

- Review Supabase logs regularly
- Monitor API usage patterns
- Set up alerts for unusual activity

## 📧 Step 10: Email Reports Setup (Optional)

### 10.1 SendGrid Setup

```bash
# Add to .env.local
SENDGRID_API_KEY=your_sendgrid_key

# Test email sending
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"email": "test@domain.com"}' \
  "https://your-app.com/api/reports/daily"
```

### 10.2 AWS SES Setup

```bash
# Add to .env.local
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
```

## ✅ Step 11: Go Live Checklist

Before going live, verify:

- [ ] Database schema deployed
- [ ] Environment variables configured
- [ ] Cron jobs installed and tested
- [ ] Manual sync test successful
- [ ] API endpoints responding quickly
- [ ] Daily reports generating
- [ ] Fallback data populated
- [ ] Monitoring and logging working
- [ ] Email notifications configured
- [ ] Performance optimized
- [ ] Security measures in place

## 🎯 Expected Results

After setup, you should see:

- **Fast website performance**: No more slow API calls
- **Reliable data**: Fallback data ensures no empty states
- **Daily updates**: Fresh data every morning
- **Comprehensive monitoring**: Know exactly what's happening
- **Automated reports**: Daily email summaries
- **Scalable architecture**: Can handle high traffic

## 📞 Support

If you encounter issues:

1. Check the logs: `/var/log/citizen-app/`
2. Review the daily reports for data quality issues
3. Test individual components (sync, reports, APIs)
4. Check Supabase dashboard for database issues
5. Verify environment variables and API keys

## 🔄 Maintenance

Regular maintenance tasks:

- **Weekly**: Review sync logs and reports
- **Monthly**: Check API key usage and limits
- **Quarterly**: Update fallback data if needed
- **Annually**: Rotate API keys and auth tokens

---

**🎉 Congratulations!** You now have a robust, production-ready data architecture that will keep your Citizen Engagement App running smoothly with reliable, fast data access. 