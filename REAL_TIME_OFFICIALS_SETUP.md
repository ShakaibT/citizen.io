# Real-Time Officials Data System Setup

This system ensures that elected officials data is always current by:
1. Fetching real-time data from Google Civic Information API
2. Storing it in Supabase for fast access
3. Automatically updating daily via cron jobs
4. Providing fallback data when APIs are unavailable

## Benefits

- **Always Current**: Data updates daily from authoritative sources
- **Fast Loading**: Cached in Supabase for instant access
- **Cost Effective**: Free Google Civic API + minimal Supabase usage
- **Reliable**: Fallback systems ensure the app always works

## Setup Steps

### 1. Get Google Civic Information API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the "Google Civic Information API"
4. Create credentials (API Key)
5. Restrict the API key to "Google Civic Information API" for security

**Cost**: FREE - 25,000 requests per day

### 2. Set Up Supabase Table

Run this SQL in your Supabase SQL Editor:

```sql
-- Create the officials table
CREATE TABLE officials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  office TEXT NOT NULL,
  party TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  photo_url TEXT,
  address TEXT,
  state TEXT NOT NULL,
  district TEXT,
  level TEXT NOT NULL CHECK (level IN ('federal', 'state', 'local')),
  office_type TEXT NOT NULL CHECK (office_type IN ('executive', 'legislative', 'judicial')),
  term_start TEXT,
  term_end TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source TEXT NOT NULL CHECK (source IN ('google_civic', 'ballotpedia', 'manual')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX idx_officials_state ON officials(state);
CREATE INDEX idx_officials_level ON officials(level);
CREATE INDEX idx_officials_office_type ON officials(office_type);
CREATE INDEX idx_officials_last_updated ON officials(last_updated);

-- Enable Row Level Security
ALTER TABLE officials ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Public read access" ON officials
  FOR SELECT USING (true);

-- Create policy for service role write access
CREATE POLICY "Service role write access" ON officials
  FOR ALL USING (auth.role() = 'service_role');

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_officials_updated_at 
  BEFORE UPDATE ON officials 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
```

### 3. Environment Variables

Add these to your `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google APIs
NEXT_PUBLIC_GOOGLE_CIVIC_API_KEY=your_google_civic_api_key

# Cron Job Security
CRON_SECRET=your_secure_random_string_for_cron_jobs
```

### 4. Set Up Daily Updates

#### Option A: Vercel Cron Jobs (Recommended)

Create `vercel.json` in your project root:

```json
{
  "crons": [
    {
      "path": "/api/officials/update",
      "schedule": "0 6 * * *"
    }
  ]
}
```

This runs daily at 6 AM UTC.

#### Option B: External Cron Service

Use a service like [cron-job.org](https://cron-job.org) to call:
```
POST https://your-app.vercel.app/api/officials/update
Authorization: Bearer your_cron_secret
```

### 5. Initial Data Population

After setup, populate initial data by calling:

```bash
curl -X POST "http://localhost:3000/api/officials/update" \
  -H "Authorization: Bearer your_cron_secret"
```

## How It Works

### Data Flow

1. **User visits page** → App checks Supabase for cached officials data
2. **If data exists and is recent** → Return immediately (fast!)
3. **If data is stale or missing** → Fetch from Google Civic API
4. **Daily cron job** → Updates all state data automatically

### API Endpoints

- `GET /api/officials?state=StateName` - Get officials for a state
- `POST /api/officials/update` - Update all officials data (cron job)

### Data Sources Priority

1. **Google Civic Information API** (Primary) - Most current data
2. **Supabase Cache** (Secondary) - Fast access to recent data
3. **Static Fallback** (Tertiary) - Ensures app always works

## Monitoring

The system logs all operations:
- API fetch attempts and results
- Cache hits/misses
- Update job status
- Fallback usage

Check your Vercel logs or server logs to monitor the system.

## Cost Analysis

- **Google Civic API**: FREE (25k requests/day)
- **Supabase**: ~$0 (well within free tier limits)
- **Vercel Cron**: FREE (included in hobby plan)

**Total monthly cost: $0** for most applications.

## Troubleshooting

### Officials showing as outdated

1. Check if Google Civic API key is valid
2. Verify cron job is running (check logs)
3. Manually trigger update: `POST /api/officials/update`

### API rate limits

- Google Civic API: 25,000 requests/day
- If exceeded, system falls back to cached data
- Consider upgrading Google Cloud plan if needed

### Data accuracy

- Google Civic Information API is the most authoritative source
- Data updates within 24 hours of real-world changes
- For critical accuracy, consider manual verification for key races

## Security

- API keys are server-side only
- Cron endpoint requires authentication
- Supabase RLS policies protect data integrity
- No sensitive data stored in client-side code 