# Daily Officials Data Update Setup

This document explains how to set up automatic daily updates for officials data.

## Option 1: Vercel Cron Jobs (Recommended)

If you're deploying on Vercel, create a `vercel.json` file in your project root:

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

This will call the update endpoint every day at 6 AM UTC.

## Option 2: GitHub Actions

Create `.github/workflows/update-officials.yml`:

```yaml
name: Update Officials Data

on:
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - name: Update Officials Data
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://your-app-domain.com/api/officials/update
```

## Option 3: External Cron Service

Use services like:
- cron-job.org
- EasyCron
- Zapier

Set them to make a POST request to:
```
https://your-app-domain.com/api/officials/update
```

With header:
```
Authorization: Bearer YOUR_CRON_SECRET
```

## Environment Variables Required

Make sure these are set in your deployment:

- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `CRON_SECRET`: A secret token for authenticating cron requests
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL

## Manual Update

You can manually trigger an update by calling:

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-app-domain.com/api/officials/update
```

## What Gets Updated

The daily update fetches:
- Federal Senators for all 50 states
- Federal Representatives for all 50 states
- Data comes from the official Congress.gov API

State-level officials (governors, state legislators) need to be added manually via the `/api/officials/add` endpoint.

## Monitoring

Check the update logs in your deployment platform to ensure updates are running successfully. The endpoint returns:

```json
{
  "success": true,
  "message": "Federal officials data updated successfully",
  "timestamp": "2025-06-02T15:49:47.571Z"
}
``` 