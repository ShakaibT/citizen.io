-- COMPREHENSIVE DATABASE SCHEMA FIX
-- This script fixes all schema issues preventing the app from working
-- Run this in your Supabase SQL editor

-- Step 1: Drop and recreate tables with correct schema
DROP TABLE IF EXISTS officials CASCADE;
DROP TABLE IF EXISTS counties CASCADE;

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
    office_type VARCHAR(100) NOT NULL,
    term_start DATE,
    term_end DATE,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    source VARCHAR(100) DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    bioguide_id VARCHAR(20),
    congress_url VARCHAR(500)
);

-- Step 3: Create counties table with all required columns
CREATE TABLE counties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    state VARCHAR(100) NOT NULL,
    state_fips VARCHAR(2) NOT NULL,
    county_fips VARCHAR(3) NOT NULL,
    full_fips VARCHAR(5) NOT NULL,
    population BIGINT,
    land_area DECIMAL(15,2),
    water_area DECIMAL(15,2),
    density DECIMAL(10,2),
    median_income INTEGER,
    county_seat VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Create indexes for performance
CREATE INDEX idx_officials_state ON officials(state);
CREATE INDEX idx_officials_level ON officials(level);
CREATE INDEX idx_officials_office_type ON officials(office_type);
CREATE INDEX idx_officials_bioguide ON officials(bioguide_id) WHERE bioguide_id IS NOT NULL;
CREATE INDEX idx_counties_state ON counties(state);
CREATE INDEX idx_counties_full_fips ON counties(full_fips);
CREATE UNIQUE INDEX idx_counties_unique_fips ON counties(full_fips);

-- Step 5: Insert Pennsylvania officials with correct data
INSERT INTO officials (name, office, party, state, level, office_type, bioguide_id, source) VALUES
('Josh Shapiro', 'Governor of Pennsylvania', 'Democratic', 'Pennsylvania', 'state', 'executive', NULL, 'manual'),
('Dave McCormick', 'U.S. Senator', 'Republican', 'Pennsylvania', 'federal', 'legislative', 'M001212', 'congress'),
('John Fetterman', 'U.S. Senator', 'Democratic', 'Pennsylvania', 'federal', 'legislative', 'F000482', 'congress'),
('Brian Fitzpatrick', 'U.S. Representative', 'Republican', 'Pennsylvania', 'federal', 'legislative', 'F000466', 'congress'),
('Brendan Boyle', 'U.S. Representative', 'Democratic', 'Pennsylvania', 'federal', 'legislative', 'B001296', 'congress');

-- Step 6: Insert sample Pennsylvania counties
INSERT INTO counties (name, state, state_fips, county_fips, full_fips, population, land_area, water_area) VALUES
('Philadelphia', 'Pennsylvania', '42', '101', '42101', 1603797, 134.18, 8.73),
('Allegheny', 'Pennsylvania', '42', '003', '42003', 1250578, 730.07, 19.31),
('Montgomery', 'Pennsylvania', '42', '091', '42091', 856553, 483.11, 9.91),
('Bucks', 'Pennsylvania', '42', '017', '42017', 646538, 604.55, 17.43),
('Chester', 'Pennsylvania', '42', '029', '42029', 545823, 751.49, 8.54),
('Delaware', 'Pennsylvania', '42', '045', '42045', 576830, 184.11, 9.73),
('Lancaster', 'Pennsylvania', '42', '071', '42071', 552984, 944.07, 5.18),
('York', 'Pennsylvania', '42', '133', '42133', 456438, 904.33, 7.78);

-- Step 7: Create simple functions for data operations
CREATE OR REPLACE FUNCTION upsert_official(
    p_name VARCHAR(255),
    p_office VARCHAR(255),
    p_party VARCHAR(100) DEFAULT NULL,
    p_state VARCHAR(100),
    p_level VARCHAR(50),
    p_office_type VARCHAR(100),
    p_bioguide_id VARCHAR(20) DEFAULT NULL,
    p_district VARCHAR(10) DEFAULT NULL,
    p_source VARCHAR(100) DEFAULT 'api'
) RETURNS UUID AS $$
DECLARE
    official_id UUID;
BEGIN
    -- Try to find existing official
    SELECT id INTO official_id 
    FROM officials 
    WHERE name = p_name AND state = p_state AND office_type = p_office_type;
    
    IF official_id IS NOT NULL THEN
        -- Update existing
        UPDATE officials 
        SET 
            office = p_office,
            party = p_party,
            level = p_level,
            bioguide_id = p_bioguide_id,
            district = p_district,
            source = p_source,
            updated_at = NOW()
        WHERE id = official_id;
    ELSE
        -- Insert new
        INSERT INTO officials (
            name, office, party, state, level, office_type, 
            bioguide_id, district, source
        ) VALUES (
            p_name, p_office, p_party, p_state, p_level, p_office_type,
            p_bioguide_id, p_district, p_source
        ) RETURNING id INTO official_id;
    END IF;
    
    RETURN official_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION upsert_county(
    p_name VARCHAR(255),
    p_state VARCHAR(100),
    p_state_fips VARCHAR(2),
    p_county_fips VARCHAR(3),
    p_full_fips VARCHAR(5),
    p_population BIGINT DEFAULT NULL,
    p_land_area DECIMAL(15,2) DEFAULT NULL,
    p_water_area DECIMAL(15,2) DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    county_id UUID;
BEGIN
    -- Try to find existing county
    SELECT id INTO county_id 
    FROM counties 
    WHERE full_fips = p_full_fips;
    
    IF county_id IS NOT NULL THEN
        -- Update existing
        UPDATE counties 
        SET 
            name = p_name,
            state = p_state,
            population = p_population,
            land_area = p_land_area,
            water_area = p_water_area,
            updated_at = NOW()
        WHERE id = county_id;
    ELSE
        -- Insert new
        INSERT INTO counties (
            name, state, state_fips, county_fips, full_fips,
            population, land_area, water_area
        ) VALUES (
            p_name, p_state, p_state_fips, p_county_fips, p_full_fips,
            p_population, p_land_area, p_water_area
        ) RETURNING id INTO county_id;
    END IF;
    
    RETURN county_id;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Enable RLS (Row Level Security) if needed
ALTER TABLE officials ENABLE ROW LEVEL SECURITY;
ALTER TABLE counties ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Public read access for officials" ON officials FOR SELECT USING (true);
CREATE POLICY "Public read access for counties" ON counties FOR SELECT USING (true);

-- Step 9: Grant permissions
GRANT ALL ON officials TO anon, authenticated;
GRANT ALL ON counties TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Step 10: Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Step 11: Verify setup
SELECT 'Database schema fix completed successfully' as status;
SELECT COUNT(*) as total_officials FROM officials;
SELECT COUNT(*) as total_counties FROM counties;
SELECT COUNT(*) as pa_officials FROM officials WHERE state = 'Pennsylvania';
SELECT COUNT(*) as pa_counties FROM counties WHERE state = 'Pennsylvania'; 