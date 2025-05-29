#!/bin/bash

# Citizen Engagement App - Authentication Setup Script
echo "🚀 Setting up authentication for Citizen Engagement App..."

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "📋 Creating .env.local from example..."
    cp EXAMPLE.env.local .env.local
    echo "✅ Created .env.local file"
    echo ""
    echo "⚠️  IMPORTANT: You need to edit .env.local with your actual Supabase credentials!"
    echo "   1. Go to https://supabase.com and create a new project"
    echo "   2. Get your Project URL and API keys from Settings → API"
    echo "   3. Replace the placeholder values in .env.local"
    echo ""
else
    echo "✅ .env.local already exists"
fi

# Check if Supabase credentials are configured
if grep -q "YOUR_ACTUAL" .env.local; then
    echo "⚠️  Supabase credentials not configured yet!"
    echo "   Please edit .env.local and replace the placeholder values"
    echo "   See SUPABASE_SETUP.md for detailed instructions"
else
    echo "✅ Supabase credentials appear to be configured"
fi

echo ""
echo "📚 Next steps:"
echo "   1. Follow the guide in SUPABASE_SETUP.md"
echo "   2. Configure your OAuth providers (Google, GitHub, Discord)"
echo "   3. Restart your dev server: npm run dev"
echo "   4. Test authentication at http://localhost:3000"
echo ""
echo "🔗 Useful links:"
echo "   - Supabase Dashboard: https://supabase.com/dashboard"
echo "   - Google Cloud Console: https://console.cloud.google.com"
echo "   - GitHub OAuth Apps: https://github.com/settings/developers"
echo "   - Discord Developer Portal: https://discord.com/developers/applications"
echo ""
echo "✨ Happy coding!" 