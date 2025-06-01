# Supabase Authentication Setup Guide

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or sign in to your account
3. Click "New Project"
4. Choose your organization
5. Fill in project details:
   - **Name**: `citizen-engagement-app`
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users
6. Click "Create new project"
7. Wait for the project to be created (takes ~2 minutes)

## Step 2: Get Your Supabase Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (starts with `https://`)
   - **anon public** key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`)
   - **service_role** key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`)

## Step 3: Configure Environment Variables

1. In your project root, copy the example environment file:
   ```bash
   cp EXAMPLE.env.local .env.local
   ```

2. Edit `.env.local` and replace the placeholder values:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

## Step 4: Configure Authentication Providers

### Enable Email Authentication
1. In Supabase dashboard, go to **Authentication** → **Settings**
2. Under **Auth Providers**, make sure **Email** is enabled
3. Configure email settings:
   - **Enable email confirmations**: ON (recommended)
   - **Enable email change confirmations**: ON (recommended)

### Configure OAuth Providers

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google+ API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client IDs**
5. Configure OAuth consent screen first if prompted
6. For **Application type**, choose **Web application**
7. Add authorized redirect URIs:
   ```
   https://your-project-ref.supabase.co/auth/v1/callback
   ```
8. Copy the **Client ID** and **Client Secret**
9. In Supabase dashboard, go to **Authentication** → **Settings** → **Auth Providers**
10. Enable **Google** and paste your Client ID and Client Secret

#### GitHub OAuth
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in the details:
   - **Application name**: `Citizen Engagement App`
   - **Homepage URL**: `http://localhost:3000` (for development)
   - **Authorization callback URL**: `https://your-project-ref.supabase.co/auth/v1/callback`
4. Click **Register application**
5. Copy the **Client ID** and generate a **Client Secret**
6. In Supabase dashboard, enable **GitHub** and paste your credentials

#### Discord OAuth
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application**
3. Give it a name: `Citizen Engagement App`
4. Go to **OAuth2** → **General**
5. Copy the **Client ID** and **Client Secret**
6. Add redirect URL: `https://your-project-ref.supabase.co/auth/v1/callback`
7. In Supabase dashboard, enable **Discord** and paste your credentials

## Step 5: Configure Site URL and Redirect URLs

1. In Supabase dashboard, go to **Authentication** → **Settings**
2. Under **Site URL**, set:
   - Development: `http://localhost:3000`
   - Production: `https://your-domain.com`
3. Under **Redirect URLs**, add:
   - `http://localhost:3000/auth/callback`
   - `https://your-domain.com/auth/callback` (for production)

## Step 6: Test Authentication

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Open your app at `http://localhost:3000`
3. Click on "Sign In" or "Sign Up"
4. Try the different authentication methods:
   - Email/password signup
   - Google OAuth
   - GitHub OAuth
   - Discord OAuth

## Step 7: Set Up User Profiles (Optional)

If you want to store additional user data, create a profiles table:

1. In Supabase dashboard, go to **Table Editor**
2. Click **Create a new table**
3. Name it `profiles`
4. Add columns:
   - `id` (uuid, primary key, references auth.users.id)
   - `full_name` (text)
   - `avatar_url` (text)
   - `created_at` (timestamptz, default now())
   - `updated_at` (timestamptz, default now())

5. Set up Row Level Security (RLS):
   ```sql
   -- Enable RLS
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

   -- Policy for users to see their own profile
   CREATE POLICY "Users can view own profile" ON profiles
     FOR SELECT USING (auth.uid() = id);

   -- Policy for users to update their own profile
   CREATE POLICY "Users can update own profile" ON profiles
     FOR UPDATE USING (auth.uid() = id);
   ```

## Troubleshooting

### Common Issues:

1. **"Supabase is not configured" error**
   - Check that your `.env.local` file exists and has the correct values
   - Restart your development server after adding environment variables

2. **OAuth redirect errors**
   - Verify redirect URLs match exactly in both provider and Supabase settings
   - Check that your Supabase project URL is correct

3. **Email confirmation not working**
   - Check your email provider settings in Supabase
   - For development, you can disable email confirmation temporarily

4. **CORS errors**
   - Make sure your site URL is correctly set in Supabase settings

### Development vs Production

- **Development**: Use `http://localhost:3000`
- **Production**: Use your actual domain with HTTPS

Make sure to update all URLs when deploying to production!

## Security Notes

- Never commit your `.env.local` file to version control
- Use different Supabase projects for development and production
- Regularly rotate your service role keys
- Enable Row Level Security (RLS) on all tables containing user data

# Supabase Setup for Real-Time Officials Data

This guide will help you set up the Supabase database table needed for the real-time officials data system.

## Prerequisites

1. A Supabase account and project
2. Access to the Supabase SQL Editor

## Step 1: Create the Officials Table

Go to your Supabase dashboard → SQL Editor → New Query, and run this SQL:

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
  term_start DATE,
  term_end DATE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_officials_state ON officials(state);
CREATE INDEX idx_officials_level ON officials(level);
CREATE INDEX idx_officials_last_updated ON officials(last_updated);
CREATE INDEX idx_officials_office_type ON officials(office_type);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update updated_at
CREATE TRIGGER update_officials_updated_at 
    BEFORE UPDATE ON officials 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

## Step 2: Set Row Level Security (RLS)

```sql
-- Enable RLS on the officials table
ALTER TABLE officials ENABLE ROW LEVEL SECURITY;

-- Allow public read access (since this is public officials data)
CREATE POLICY "Allow public read access" ON officials
    FOR SELECT USING (true);

-- Allow service role to insert/update/delete (for the daily updates)
CREATE POLICY "Allow service role full access" ON officials
    FOR ALL USING (auth.role() = 'service_role');
```

## Step 3: Environment Variables

Make sure your `.env.local` file has these variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_GOOGLE_CIVIC_API_KEY=your_google_civic_api_key
CRON_SECRET=your_secure_random_string
```

## Step 4: Test the Setup

1. Start your development server: `npm run dev`
2. Visit: `http://localhost:3000/api/officials/update` to manually trigger an update
3. Check your Supabase dashboard to see if officials data was inserted

## Step 5: Set Up Daily Updates (Production)

For production, set up a daily cron job to update the officials data:

### Option A: Vercel Cron Jobs (Recommended)

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

### Option B: External Cron Service

Use a service like cron-job.org to call your update endpoint daily:

```
URL: https://your-domain.com/api/officials/update
Method: POST
Headers: Authorization: Bearer your_cron_secret
Schedule: Daily at 6:00 AM
```

## Data Structure

The officials table will contain:

- **Federal Officials**: President, Senators, Representatives
- **State Officials**: Governor, State Legislators
- **Local Officials**: Mayors, City Council (where available)

Each record includes:
- Name, office, party affiliation
- Contact information (phone, email, website)
- Term information
- Data source and last update timestamp

## Benefits

✅ **Always Up-to-Date**: Daily automatic updates from Google Civic Information API
✅ **Fast Performance**: Local database queries, no API rate limits during user sessions
✅ **Cost-Effective**: Free tier covers all usage
✅ **Reliable**: Fallback data ensures the app always works
✅ **Accurate**: Real-time data from authoritative government sources

## Troubleshooting

### Table Creation Issues
- Make sure you have the correct permissions in Supabase
- Check the SQL syntax in the Supabase SQL Editor

### API Key Issues
- Verify your Google Civic Information API key is valid
- Check that the API is enabled in Google Cloud Console

### Update Issues
- Check the server logs for error messages
- Verify the CRON_SECRET matches in your environment variables
- Test the manual update endpoint first

### Data Not Showing
- Check if the officials table has data in Supabase
- Verify the API endpoints are working: `/api/officials?state=PA`
- Check browser console for any JavaScript errors 