# 🚀 Deployment Guide

This guide provides multiple options to deploy your Citizen Engagement App publicly for testing.

## 📋 Prerequisites

Before deploying, ensure you have:
- ✅ A working build (`npm run build` succeeds)
- ✅ Environment variables configured
- ✅ Git repository (for most deployment platforms)

## 🌟 Option 1: Vercel (Recommended - Easiest)

Vercel is the easiest option for Next.js applications:

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Deploy
```bash
# Login to Vercel
vercel login

# Deploy (follow the prompts)
vercel

# For production deployment
vercel --prod
```

### Step 3: Set Environment Variables
In the Vercel dashboard:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add these variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (optional)

### Alternative: Deploy via GitHub
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Configure environment variables
5. Deploy!

---

## 🌐 Option 2: Netlify

### Step 1: Install Netlify CLI
```bash
npm install -g netlify-cli
```

### Step 2: Build and Deploy
```bash
# Build the project
npm run build

# Login to Netlify
netlify login

# Deploy
netlify deploy

# For production
netlify deploy --prod
```

### Step 3: Configure Environment Variables
In Netlify dashboard:
1. Go to Site settings → Environment variables
2. Add the same environment variables as above

---

## ☁️ Option 3: Railway

### Step 1: Install Railway CLI
```bash
npm install -g @railway/cli
```

### Step 2: Deploy
```bash
# Login
railway login

# Initialize project
railway init

# Deploy
railway up
```

---

## 🐳 Option 4: Docker + Any Cloud Provider

### Step 1: Create Dockerfile
```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

### Step 2: Update next.config.mjs
Add this to your next.config.mjs:
```javascript
output: 'standalone',
```

---

## 🔧 Environment Variables Setup

Create a `.env.local` file with:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

## 🚀 Quick Deploy Commands

### Vercel (Fastest)
```bash
npx vercel --prod
```

### Netlify
```bash
npm run build && npx netlify deploy --prod --dir=.next
```

### Railway
```bash
npx @railway/cli up
```

## 📱 Testing Your Deployment

After deployment, test these features:
- ✅ Map loads and displays US states
- ✅ State clicking shows counties
- ✅ Zoom controls work
- ✅ Reset view works
- ✅ Mobile responsiveness
- ✅ API endpoints respond correctly

## 🔍 Troubleshooting

### Common Issues:
1. **Build fails**: Check for TypeScript errors
2. **Map doesn't load**: Verify Leaflet CSS is included
3. **API errors**: Check environment variables
4. **404 errors**: Ensure all routes are properly configured

### Debug Commands:
```bash
# Check build locally
npm run build && npm start

# Test production build
npm run build && npx serve .next

# Check for errors
npm run lint
```

## 📊 Performance Optimization

Your app is already optimized with:
- ✅ Static generation where possible
- ✅ Dynamic imports for Leaflet
- ✅ Image optimization
- ✅ API route caching
- ✅ Responsive design

## 🎯 Recommended: Vercel Deployment

For the fastest deployment, use Vercel:

1. **One-command deploy**: `npx vercel --prod`
2. **Automatic HTTPS**
3. **Global CDN**
4. **Automatic deployments from Git**
5. **Built-in analytics**

Your app will be live at: `https://your-app-name.vercel.app` 