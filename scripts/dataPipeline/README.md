# Interactive Officials Data Pipeline

This directory contains the interactive data pipeline for fetching and updating U.S. federal and state officials data from Congress.gov API and OpenStates API.

## Features

- **Federal Officials**: Fetches U.S. Senators and Representatives from Congress.gov API
- **State Officials**: Fetches state legislators and executives from OpenStates API  
- **Interactive Confirmation**: State-by-state confirmation before applying changes
- **Change Tracking**: Uses MD5 checksums to detect changes in official data
- **Data Archiving**: Saves daily API responses for audit trails
- **Email Notifications**: Sends summary emails after pipeline completion

## Setup

### 1. Database Setup

First, run the SQL commands in `setup-tables.sql` in your Supabase SQL editor to create the required tables:

```sql
-- Copy and paste the contents of setup-tables.sql into Supabase SQL editor
```

This will create:
- `official_checksums` table for tracking data changes
- `change_requests` table for storing pending updates

### 2. Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Required APIs
CONGRESS_API_KEY=your_congress_api_key_here
OPENSTATES_API_KEY=your_openstates_api_key_here

# Supabase (should already exist)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Email notifications (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
ADMIN_EMAIL=admin@yourdomain.com
```

#### Getting API Keys

**Congress.gov API Key:**
1. Visit https://api.congress.gov/sign-up/
2. Fill out the form with your contact information
3. You'll receive an API key via email
4. Free tier includes 5,000 requests per hour

**OpenStates API Key:**
1. Visit https://openstates.org/api/
2. Sign up for a free account
3. Generate an API key from your dashboard
4. Free tier includes 1,000 requests per day

### 3. Install Dependencies

```bash
cd scripts/dataPipeline
npm install
```

## Usage

### Running the Interactive Pipeline

```bash
# From the project root
node scripts/dataPipeline/updatePipelineInteractive.js

# Or from the dataPipeline directory
npm run interactive
```

### What Happens During Execution

1. **Data Fetching**: For each of the 50 states:
   - Fetches federal officials (Senators and Representatives) from Congress.gov
   - Fetches state officials (legislators and executives) from OpenStates
   - Archives raw API responses to `archives/{YYYY-MM-DD}/` directory

2. **Change Detection**: 
   - Computes MD5 checksums for each official's key data
   - Compares against existing checksums in database
   - Identifies new officials and updated information

3. **Interactive Review**: For each state with changes:
   - Displays all proposed changes in a readable format
   - Prompts user to confirm: "Apply all changes for state XX? (Y/n)"
   - User can approve (Y/Enter) or skip (n) each state

4. **Database Updates**: For approved states:
   - Creates `change_requests` records for review
   - Updates `official_checksums` to prevent duplicate processing

5. **Summary**: 
   - Displays total change requests created
   - Sends email summary (if configured)

### Example Interactive Session

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

Apply all of the above changes for state AL? (Y/n): Y
🔄 Applying changes for AL...
✅ Applied 2/2 changes for AL

🏛️ Processing AK...
✅ No changes found for AK
...
```

## File Structure

```
scripts/dataPipeline/
├── updatePipelineInteractive.js    # Main interactive pipeline script
├── setup-tables.sql                # Database schema for additional tables
├── package.json                     # Dependencies and scripts
├── README.md                        # This file
└── archives/                        # Daily API response archives
    └── YYYY-MM-DD/                  # Date-based directories
        ├── AL-senate.json           # Senate data for Alabama
        ├── AL-house.json            # House data for Alabama
        ├── AL-openstates.json       # State officials for Alabama
        └── ...                      # Files for all 50 states
```

## Data Flow

1. **APIs** → **Archives** (JSON files)
2. **Archives** → **Processing** (checksum comparison)
3. **Processing** → **User Confirmation** (interactive prompts)
4. **Confirmation** → **Database** (change_requests table)
5. **Database** → **Admin Review** (manual approval process)

## Error Handling

- **API Failures**: Script continues to next state if one fails
- **Network Issues**: Uses cached archive files if available
- **Database Errors**: Logs errors but continues processing
- **User Interruption**: Graceful exit with summary of completed work

## Monitoring

- All API responses are archived for audit trails
- Change requests are stored with timestamps and payloads
- Email summaries provide completion notifications
- Console output shows detailed progress and error information

## Security Notes

- Uses Supabase service role key for database operations
- API keys are loaded from environment variables
- No sensitive data is logged to console or files
- Row Level Security policies protect database access

## Troubleshooting

### Common Issues

**"Missing required environment variable"**
- Ensure all required environment variables are set in `.env.local`
- Check that the file is in the project root directory

**"Congress API error: 404"**
- Verify your Congress.gov API key is valid
- Check if you've exceeded rate limits (5,000/hour)

**"OpenStates API error: 401"**
- Verify your OpenStates API key is valid  
- Check if you've exceeded rate limits (1,000/day)

**"Error creating change request"**
- Ensure database tables are created (run setup-tables.sql)
- Verify Supabase service role key has proper permissions

### Debug Mode

Add debug logging by setting:
```bash
DEBUG=true node scripts/dataPipeline/updatePipelineInteractive.js
```

## Contributing

When modifying the pipeline:

1. Test with a single state first
2. Verify archive files are created correctly
3. Check database records are inserted properly
4. Test email notifications if configured
5. Update this README if adding new features

## License

MIT License - see project root for details. 