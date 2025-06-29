# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Add API Keys to `.env.local`

Add these lines to your `.env.local` file in the project root:

```bash
# Get from https://api.congress.gov/sign-up/
CONGRESS_API_KEY=your_congress_api_key_here

# Get from https://openstates.org/api/
OPENSTATES_API_KEY=your_openstates_api_key_here
```

### 2. Set Up Database Tables

Copy and paste the contents of `setup-tables.sql` into your Supabase SQL editor and run it.

### 3. Test Your Setup

```bash
node scripts/dataPipeline/test-setup.js
```

Fix any ❌ issues before proceeding.

### 4. Run the Interactive Pipeline

```bash
node scripts/dataPipeline/updatePipelineInteractive.js
```

The script will:
- Process all 50 states one by one
- Show you proposed changes for each state
- Ask for your confirmation before applying changes
- Create change requests in your database for review

### 5. Review Change Requests

After the pipeline completes, review the `change_requests` table in Supabase to see all pending updates.

## 📋 What You'll See

```
🚀 Starting Interactive Officials Data Pipeline
📅 Date: 2024-01-15
🗺️ Processing 50 states

🏛️ Processing AL...
📊 Found 2 federal officials for AL
📊 Found 140 state officials for AL

=== AL DRAFT CHANGES ===
• [NEW] Tommy Tuberville → Office: U.S. Senator—AL (ℹ️ party: Republican, start: 2021)
• [UPDATE] ID=ocd-person/12345 Changes:
    – party: "Democratic" → "Democrat"

Apply all of the above changes for state AL? (Y/n): 
```

Type `Y` (or just press Enter) to apply changes, or `n` to skip that state.

## 🔧 Troubleshooting

**Missing API keys?** Get them from:
- Congress.gov: https://api.congress.gov/sign-up/
- OpenStates: https://openstates.org/api/

**Database errors?** Run the SQL in `setup-tables.sql` first.

**Need help?** Check the full `README.md` for detailed instructions. 