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