# API Setup Guide

## Required API Keys

To fully use the Citizen Engagement app, you need to configure the following API keys in your `.env.local` file:

### 1. Supabase Configuration
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**How to get Supabase keys:**
1. Go to [supabase.com](https://supabase.com) and create a project
2. In your project dashboard, go to Settings > API
3. Copy the Project URL and anon/public key
4. Copy the service_role key (keep this secret!)

### 2. Google Maps API Configuration
```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

**How to get Google Maps API key:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
4. Go to Credentials and create an API key
5. Restrict the API key to your domain for security

### 3. Example .env.local file
Create a `.env.local` file in your project root with:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyC...
```

## Features Enabled by API Keys

### With Supabase:
- User authentication
- Address storage and validation logging
- User preferences and saved locations
- Map data (states and counties GeoJSON)

### With Google Maps:
- Address autocomplete suggestions
- Real-time address validation
- Geocoding for map pin placement
- Interactive map updates as you type

## Current Status

Based on the terminal output, your current configuration shows:
- ✅ Supabase URL is configured
- ❌ Supabase keys are still placeholder values
- ❌ Google Maps API key needs to be configured

## Troubleshooting

If you see "Invalid API key" errors:
1. Double-check your Supabase keys are correct
2. Make sure there are no extra spaces or quotes
3. Restart your development server after updating .env.local
4. Check that your Supabase project is active and not paused

If address autocomplete doesn't work:
1. Verify your Google Maps API key is correct
2. Ensure the Places API is enabled in Google Cloud Console
3. Check browser console for any API errors 