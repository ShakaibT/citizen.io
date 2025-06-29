-- COMPREHENSIVE DATABASE SCHEMA FIX FOR SUPABASE
-- Run this script in your Supabase SQL Editor

-- Step 1: Drop existing tables and functions
DROP TABLE IF EXISTS officials CASCADE;
DROP TABLE IF EXISTS counties CASCADE;
DROP FUNCTION IF EXISTS upsert_official CASCADE;
DROP FUNCTION IF EXISTS upsert_county CASCADE;

-- Step 2: Create officials table with all required columns
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

-- Step 3: Create counties table with all required columns
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create indexes for better performance
CREATE INDEX idx_officials_state ON officials(state);
CREATE INDEX idx_officials_level ON officials(level);
CREATE INDEX idx_officials_office_type ON officials(office_type);
CREATE INDEX idx_officials_bioguide ON officials(bioguide_id) WHERE bioguide_id IS NOT NULL;
CREATE INDEX idx_counties_state ON counties(state);
CREATE INDEX idx_counties_full_fips ON counties(full_fips);
CREATE UNIQUE INDEX idx_counties_unique_fips ON counties(full_fips);

-- Step 5: Enable Row Level Security
ALTER TABLE officials ENABLE ROW LEVEL SECURITY;
ALTER TABLE counties ENABLE ROW LEVEL SECURITY;

-- Step 6: Create policies for public read access
CREATE POLICY "Allow public read access on officials" ON officials
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access on counties" ON counties
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert on officials" ON officials
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated update on officials" ON officials
    FOR UPDATE USING (true);

CREATE POLICY "Allow authenticated insert on counties" ON counties
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated update on counties" ON counties
    FOR UPDATE USING (true);

-- Step 7: Create upsert function for officials
CREATE OR REPLACE FUNCTION upsert_official(
    p_name VARCHAR(255),
    p_office VARCHAR(255),
    p_party VARCHAR(100) DEFAULT NULL,
    p_state VARCHAR(100),
    p_level VARCHAR(50),
    p_office_type VARCHAR(50),
    p_bioguide_id VARCHAR(20) DEFAULT NULL,
    p_district VARCHAR(10) DEFAULT NULL,
    p_source VARCHAR(50) DEFAULT 'api',
    p_email VARCHAR(255) DEFAULT NULL,
    p_phone VARCHAR(50) DEFAULT NULL,
    p_website VARCHAR(500) DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_congress_url VARCHAR(500) DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    result_id UUID;
BEGIN
    INSERT INTO officials (
        name, office, party, state, level, office_type, bioguide_id, 
        district, source, email, phone, website, address, congress_url, updated_at
    ) VALUES (
        p_name, p_office, p_party, p_state, p_level, p_office_type, p_bioguide_id,
        p_district, p_source, p_email, p_phone, p_website, p_address, p_congress_url, NOW()
    )
    ON CONFLICT (state, name, office) DO UPDATE SET
        party = EXCLUDED.party,
        bioguide_id = EXCLUDED.bioguide_id,
        district = EXCLUDED.district,
        source = EXCLUDED.source,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        website = EXCLUDED.website,
        address = EXCLUDED.address,
        congress_url = EXCLUDED.congress_url,
        updated_at = NOW()
    RETURNING id INTO result_id;
    
    RETURN result_id;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create upsert function for counties
CREATE OR REPLACE FUNCTION upsert_county(
    p_name VARCHAR(255),
    p_state VARCHAR(100),
    p_state_fips VARCHAR(2),
    p_county_fips VARCHAR(3),
    p_full_fips VARCHAR(5),
    p_population INTEGER DEFAULT NULL,
    p_land_area DECIMAL DEFAULT NULL,
    p_water_area DECIMAL DEFAULT NULL
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

-- Step 9: Insert Pennsylvania officials data
INSERT INTO officials (name, office, party, state, level, office_type, source) VALUES
('Josh Shapiro', 'Governor', 'Democratic', 'Pennsylvania', 'state', 'executive', 'manual'),
('Dave McCormick', 'U.S. Senator', 'Republican', 'Pennsylvania', 'federal', 'legislative', 'manual'),
('John Fetterman', 'U.S. Senator', 'Democratic', 'Pennsylvania', 'federal', 'legislative', 'manual')
ON CONFLICT (state, name, office) DO UPDATE SET
    party = EXCLUDED.party,
    updated_at = NOW();

-- Step 10: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Verification queries (optional - you can run these separately to check)
-- SELECT COUNT(*) as official_count FROM officials;
-- SELECT COUNT(*) as county_count FROM counties;
-- SELECT * FROM officials WHERE state = 'Pennsylvania'; 