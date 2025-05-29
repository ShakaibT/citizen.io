# Authentication Testing Guide

## Current Status
✅ Supabase is configured and connected
✅ Authentication modal is implemented
✅ Email/password authentication is ready
⚠️ OAuth providers need to be configured in Supabase dashboard

## Testing Authentication

### 1. Test Email/Password Authentication

1. **Open your app**: Go to http://localhost:3000
2. **Open auth modal**: Click "Sign In" or "Sign Up" button
3. **Test Sign Up**:
   - Click "Sign Up" tab
   - Fill in:
     - Full Name: `Test User`
     - Email: `test@example.com`
     - Password: `password123`
     - Confirm Password: `password123`
   - Click "Create Account"
   - Check for success message

4. **Test Sign In**:
   - Click "Sign In" tab
   - Use the same credentials
   - Click "Sign In"
   - Should redirect or show success

### 2. Test OAuth Providers (After Configuration)

#### Google OAuth
1. Click "Continue with Google"
2. Should redirect to Google login
3. After authorization, should redirect back to your app

#### GitHub OAuth
1. Click "Continue with GitHub"
2. Should redirect to GitHub login
3. After authorization, should redirect back to your app

#### Discord OAuth
1. Click "Continue with Discord"
2. Should redirect to Discord login
3. After authorization, should redirect back to your app

### 3. Expected Behaviors

#### Before OAuth Configuration:
- Email/password should work
- OAuth buttons should show error messages like "Google authentication is not configured"

#### After OAuth Configuration:
- All authentication methods should work
- Users should be redirected to OAuth provider
- After successful auth, users should return to your app

### 4. Debugging

#### Check Browser Console:
- Open Developer Tools (F12)
- Look for any error messages
- Check Network tab for failed requests

#### Check Supabase Dashboard:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Authentication → Users
4. Check if users are being created

#### Common Issues:
1. **"Supabase is not configured"**: Check .env.local file
2. **OAuth errors**: Configure providers in Supabase dashboard
3. **Redirect errors**: Check Site URL in Supabase settings
4. **Email not confirmed**: Check email or disable confirmation in Supabase

### 5. Next Steps for Full OAuth Setup

1. **Configure Google OAuth**:
   - Go to Google Cloud Console
   - Create OAuth 2.0 credentials
   - Add redirect URI: `https://lnwxgwllzoydhjglxume.supabase.co/auth/v1/callback`
   - Add credentials to Supabase dashboard

2. **Configure GitHub OAuth**:
   - Go to GitHub Developer Settings
   - Create new OAuth App
   - Add callback URL: `https://lnwxgwllzoydhjglxume.supabase.co/auth/v1/callback`
   - Add credentials to Supabase dashboard

3. **Configure Discord OAuth**:
   - Go to Discord Developer Portal
   - Create new application
   - Add redirect URI: `https://lnwxgwllzoydhjglxume.supabase.co/auth/v1/callback`
   - Add credentials to Supabase dashboard

### 6. Testing Checklist

- [ ] Email signup works
- [ ] Email signin works
- [ ] Password reset works
- [ ] User appears in Supabase dashboard
- [ ] Auth state persists on page refresh
- [ ] Sign out works
- [ ] Google OAuth works (after configuration)
- [ ] GitHub OAuth works (after configuration)
- [ ] Discord OAuth works (after configuration)

### 7. Production Considerations

- Update Site URL to your production domain
- Update OAuth redirect URLs to production domain
- Use different Supabase project for production
- Enable email confirmations for production
- Set up proper email templates 