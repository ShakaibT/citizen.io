-- ULTIMATE DATABASE SCHEMA FIX FOR SUPABASE
-- This fixes all schema mismatches and representative data issues
-- Run this script in your Supabase SQL Editor

-- Step 1: Drop everything and start completely fresh
DROP TABLE IF EXISTS officials CASCADE;
DROP TABLE IF EXISTS counties CASCADE;
DROP FUNCTION IF EXISTS upsert_official CASCADE;
DROP FUNCTION IF EXISTS upsert_county CASCADE;

-- Step 2: Create officials table with correct schema
CREATE TABLE officials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    office VARCHAR(255) NOT NULL,
    party VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    website VARCHAR(500),
    address TEXT,
    photo_url VARCHAR(500),
    state VARCHAR(100) NOT NULL,
    district VARCHAR(10),
    level VARCHAR(50) NOT NULL CHECK (level IN ('federal', 'state', 'local')),
    office_type VARCHAR(50) NOT NULL CHECK (office_type IN ('executive', 'legislative', 'judicial')),
    bioguide_id VARCHAR(20),
    congress_url VARCHAR(500),
    source VARCHAR(50) NOT NULL DEFAULT 'api',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create counties table with correct schema
CREATE TABLE counties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    state VARCHAR(100) NOT NULL,
    state_fips VARCHAR(2) NOT NULL,
    county_fips VARCHAR(3) NOT NULL,
    full_fips VARCHAR(5) NOT NULL,
    population INTEGER,
    land_area DECIMAL,
    water_area DECIMAL,
    density DECIMAL,
    median_income INTEGER,
    county_seat VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create the EXACT unique constraints that match the API code
CREATE UNIQUE INDEX idx_officials_unique ON officials(state, name, office);
CREATE UNIQUE INDEX idx_counties_unique ON counties(full_fips);

-- Step 5: Create other indexes for performance
CREATE INDEX idx_officials_state ON officials(state);
CREATE INDEX idx_officials_level ON officials(level);
CREATE INDEX idx_officials_office_type ON officials(office_type);
CREATE INDEX idx_officials_bioguide ON officials(bioguide_id) WHERE bioguide_id IS NOT NULL;
CREATE INDEX idx_counties_state ON counties(state);
CREATE INDEX idx_counties_state_fips ON counties(state_fips);

-- Step 6: Enable Row Level Security
ALTER TABLE officials ENABLE ROW LEVEL SECURITY;
ALTER TABLE counties ENABLE ROW LEVEL SECURITY;

-- Step 7: Create policies for public access
CREATE POLICY "Allow public read access on officials" ON officials FOR SELECT USING (true);
CREATE POLICY "Allow public read access on counties" ON counties FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert on officials" ON officials FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update on officials" ON officials FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated insert on counties" ON counties FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update on counties" ON counties FOR UPDATE USING (true);

-- Step 8: Create upsert_official function with EXACT parameters from API logs
CREATE OR REPLACE FUNCTION upsert_official(
    p_name VARCHAR(255),
    p_office VARCHAR(255),
    p_party VARCHAR(100),
    p_state VARCHAR(100),
    p_level VARCHAR(50),
    p_office_type VARCHAR(50),
    p_bioguide_id VARCHAR(20),
    p_district VARCHAR(10),
    p_source VARCHAR(50)
) RETURNS UUID AS $$
DECLARE
    result_id UUID;
BEGIN
    INSERT INTO officials (
        name, office, party, state, level, office_type, bioguide_id, 
        district, source, updated_at
    ) VALUES (
        p_name, p_office, p_party, p_state, p_level, p_office_type, p_bioguide_id,
        p_district, p_source, NOW()
    )
    ON CONFLICT (state, name, office) DO UPDATE SET
        party = EXCLUDED.party,
        level = EXCLUDED.level,
        office_type = EXCLUDED.office_type,
        bioguide_id = EXCLUDED.bioguide_id,
        district = EXCLUDED.district,
        source = EXCLUDED.source,
        updated_at = NOW()
    RETURNING id INTO result_id;
    
    RETURN result_id;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create upsert_county function with EXACT parameters from API logs
CREATE OR REPLACE FUNCTION upsert_county(
    p_name VARCHAR(255),
    p_state VARCHAR(100),
    p_state_fips VARCHAR(2),
    p_county_fips VARCHAR(3),
    p_full_fips VARCHAR(5),
    p_population INTEGER,
    p_land_area DECIMAL,
    p_water_area DECIMAL
) RETURNS UUID AS $$
DECLARE
    result_id UUID;
BEGIN
    INSERT INTO counties (
        name, state, state_fips, county_fips, full_fips, 
        population, land_area, water_area, updated_at
    ) VALUES (
        p_name, p_state, p_state_fips, p_county_fips, p_full_fips,
        p_population, p_land_area, p_water_area, NOW()
    )
    ON CONFLICT (full_fips) DO UPDATE SET
        name = EXCLUDED.name,
        state = EXCLUDED.state,
        state_fips = EXCLUDED.state_fips,
        county_fips = EXCLUDED.county_fips,
        population = EXCLUDED.population,
        land_area = EXCLUDED.land_area,
        water_area = EXCLUDED.water_area,
        updated_at = NOW()
    RETURNING id INTO result_id;
    
    RETURN result_id;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Insert correct Pennsylvania officials with proper districts
INSERT INTO officials (name, office, party, state, level, office_type, district, source) VALUES
-- State officials
('Josh Shapiro', 'Governor', 'Democratic', 'Pennsylvania', 'state', 'executive', NULL, 'manual'),
('Dave McCormick', 'U.S. Senator', 'Republican', 'Pennsylvania', 'federal', 'legislative', NULL, 'manual'),
('John Fetterman', 'U.S. Senator', 'Democratic', 'Pennsylvania', 'federal', 'legislative', NULL, 'manual'),

-- House Representatives with correct districts
('Brian K. Fitzpatrick', 'U.S. Representative', 'Republican', 'Pennsylvania', 'federal', 'legislative', '1', 'manual'),
('Brendan F. Boyle', 'U.S. Representative', 'Democratic', 'Pennsylvania', 'federal', 'legislative', '2', 'manual'),
('Dwight Evans', 'U.S. Representative', 'Democratic', 'Pennsylvania', 'federal', 'legislative', '3', 'manual'),
('Madeleine Dean', 'U.S. Representative', 'Democratic', 'Pennsylvania', 'federal', 'legislative', '4', 'manual'),
('Mary Gay Scanlon', 'U.S. Representative', 'Democratic', 'Pennsylvania', 'federal', 'legislative', '5', 'manual'),
('Chrissy Houlahan', 'U.S. Representative', 'Democratic', 'Pennsylvania', 'federal', 'legislative', '6', 'manual'),
('Susan Wild', 'U.S. Representative', 'Democratic', 'Pennsylvania', 'federal', 'legislative', '7', 'manual'),
('Matt Cartwright', 'U.S. Representative', 'Democratic', 'Pennsylvania', 'federal', 'legislative', '8', 'manual'),
('Dan Meuser', 'U.S. Representative', 'Republican', 'Pennsylvania', 'federal', 'legislative', '9', 'manual'),
('Scott Perry', 'U.S. Representative', 'Republican', 'Pennsylvania', 'federal', 'legislative', '10', 'manual'),
('Lloyd Smucker', 'U.S. Representative', 'Republican', 'Pennsylvania', 'federal', 'legislative', '11', 'manual'),
('Summer Lee', 'U.S. Representative', 'Democratic', 'Pennsylvania', 'federal', 'legislative', '12', 'manual'),
('John Joyce', 'U.S. Representative', 'Republican', 'Pennsylvania', 'federal', 'legislative', '13', 'manual'),
('Guy Reschenthaler', 'U.S. Representative', 'Republican', 'Pennsylvania', 'federal', 'legislative', '14', 'manual'),
('Glenn Thompson', 'U.S. Representative', 'Republican', 'Pennsylvania', 'federal', 'legislative', '15', 'manual'),
('Mike Kelly', 'U.S. Representative', 'Republican', 'Pennsylvania', 'federal', 'legislative', '16', 'manual'),
('Chris Deluzio', 'U.S. Representative', 'Democratic', 'Pennsylvania', 'federal', 'legislative', '17', 'manual')

ON CONFLICT (state, name, office) DO UPDATE SET
    party = EXCLUDED.party,
    district = EXCLUDED.district,
    updated_at = NOW();

-- Step 11: Grant all necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Step 12: Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Verification queries (uncomment to test)
-- SELECT COUNT(*) as official_count FROM officials;
-- SELECT COUNT(*) as county_count FROM counties;
-- SELECT name, office, district FROM officials WHERE state = 'Pennsylvania' ORDER BY district; 