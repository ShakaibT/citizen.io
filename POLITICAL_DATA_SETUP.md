# Political Data System Setup

This document explains how to set up and use the comprehensive political data system for the Citizen Engagement App.

## Overview

The political data system stores and manages:
- **States**: All 50 US states with basic information
- **Counties**: Counties within each state
- **Political Positions**: Federal, state, county, and municipal offices
- **Elected Officials**: Current and historical office holders
- **Elections**: Upcoming and past elections
- **Ballot Measures**: Propositions and ballot initiatives

## Database Schema

### Core Tables

1. **states** - US states with basic information
2. **counties** - Counties within states
3. **political_positions** - Types of political offices
4. **federal_officials** - US Senators and Representatives
5. **state_officials** - Governors, state legislators, etc.
6. **county_officials** - County-level elected officials
7. **elections** - Election events
8. **ballot_measures** - Ballot propositions and measures

## Setup Instructions

### 1. Create Database Tables

Run the schema creation script in your Supabase SQL editor:

```bash
# Copy and paste the contents of create-political-data-schema.sql
# into your Supabase SQL editor and execute
```

### 2. Seed Initial Data

Run the seed data script to populate basic positions and state data:

```bash
# Copy and paste the contents of seed-political-positions.sql
# into your Supabase SQL editor and execute
```

### 3. Verify Setup

Check that tables were created successfully:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'states', 'counties', 'political_positions', 
  'federal_officials', 'state_officials', 'county_officials',
  'elections', 'ballot_measures'
);

-- Check if states were populated
SELECT COUNT(*) as state_count FROM states;
-- Should return 50

-- Check if political positions were created
SELECT COUNT(*) as position_count FROM political_positions;
-- Should return 25+
```

## API Endpoints

### States API
```
GET /api/political-data/states
GET /api/political-data/states?state=TX
```

**Examples:**
```bash
# Get all states
curl http://localhost:3000/api/political-data/states

# Get specific state with officials and counties
curl http://localhost:3000/api/political-data/states?state=Texas
curl http://localhost:3000/api/political-data/states?state=TX
```

### Counties API
```
GET /api/political-data/counties?state=TX
GET /api/political-data/counties?state=TX&county=Harris
```

**Examples:**
```bash
# Get all counties in Texas
curl http://localhost:3000/api/political-data/counties?state=TX

# Get specific county with officials
curl http://localhost:3000/api/political-data/counties?state=TX&county=Harris
```

### Elections API
```
GET /api/political-data/elections
GET /api/political-data/elections?state=TX&upcoming=true
```

**Examples:**
```bash
# Get all elections
curl http://localhost:3000/api/political-data/elections

# Get upcoming elections in Texas
curl http://localhost:3000/api/political-data/elections?state=TX&upcoming=true
```

## Data Update System

### Weekly Updates

Run the update script weekly to keep data current:

```bash
# Install tsx if not already installed
npm install -g tsx

# Run the update script
npx tsx scripts/update-political-data.ts
```

### Manual Data Updates

#### Adding New Officials

```sql
-- Example: Add a new federal official
INSERT INTO federal_officials (
  state_id, position_id, first_name, last_name, party, 
  district_number, term_start, term_end, is_current
) VALUES (
  (SELECT id FROM states WHERE abbreviation = 'TX'),
  (SELECT id FROM political_positions WHERE title = 'U.S. Representative'),
  'John', 'Doe', 'Republican', 1, '2023-01-03', '2025-01-03', true
);
```

#### Adding Elections

```sql
-- Example: Add an upcoming election
INSERT INTO elections (
  state_id, election_date, election_type, title, description,
  registration_deadline, early_voting_start, early_voting_end
) VALUES (
  (SELECT id FROM states WHERE abbreviation = 'TX'),
  '2024-11-05', 'general', '2024 General Election',
  'Federal, state, and local elections',
  '2024-10-07', '2024-10-21', '2024-11-01'
);
```

#### Adding Counties

```sql
-- Example: Add a new county
INSERT INTO counties (state_id, name, fips_code, population, county_seat)
VALUES (
  (SELECT id FROM states WHERE abbreviation = 'TX'),
  'Example County', '48999', 100000, 'Example City'
);
```

## Data Sources

For production use, consider integrating with these APIs:

### Federal Data
- **Congress API**: https://api.congress.gov/
- **ProPublica Congress API**: https://projects.propublica.org/api-docs/congress-api/
- **GovTrack API**: https://www.govtrack.us/developers/api

### State Data
- **Ballotpedia API**: https://ballotpedia.org/API-documentation
- **Vote Smart API**: https://votesmart.org/share/api

### Election Data
- **Google Civic Information API**: https://developers.google.com/civic-information
- **Ballotpedia Elections API**: https://ballotpedia.org/API-documentation

### Census Data
- **US Census API**: https://www.census.gov/data/developers/data-sets.html

## Usage in Components

### Fetching State Data

```typescript
// In your React component
const [stateData, setStateData] = useState(null)

useEffect(() => {
  async function fetchStateData() {
    const response = await fetch('/api/political-data/states?state=TX')
    const data = await response.json()
    setStateData(data)
  }
  fetchStateData()
}, [])
```

### Displaying Officials

```typescript
// Display federal officials
{stateData?.federal_officials?.map(official => (
  <div key={official.id}>
    <h3>{official.first_name} {official.last_name}</h3>
    <p>{official.political_positions.title} ({official.party})</p>
    {official.district_number && <p>District {official.district_number}</p>}
  </div>
))}
```

## Security Considerations

1. **Row Level Security (RLS)** is enabled on all tables
2. **Public read access** is granted for all political data (public information)
3. **Service role access** is required for write operations
4. **API keys** should be kept secure and rotated regularly

## Maintenance

### Weekly Tasks
1. Run the update script: `npx tsx scripts/update-political-data.ts`
2. Check for new elections and add them to the database
3. Verify official term dates and update as needed

### Monthly Tasks
1. Review and update state population data
2. Check for new counties or boundary changes
3. Update political lean classifications based on recent elections

### Annual Tasks
1. Major election updates (congressional districts, new officials)
2. Census data updates
3. Review and clean up old election data

## Troubleshooting

### Common Issues

1. **API Key Errors**: Ensure your `.env.local` file has valid Supabase credentials
2. **Permission Errors**: Check that RLS policies are correctly configured
3. **Data Inconsistencies**: Run the cleanup functions in the update script

### Debugging

```bash
# Test database connection
npx tsx -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('states').select('count').then(console.log);
"
```

## Contributing

When adding new data or features:

1. Update the schema if needed
2. Add appropriate indexes for performance
3. Update the API endpoints
4. Add tests for new functionality
5. Update this documentation

## License

This political data system is part of the Citizen Engagement App and follows the same license terms. 