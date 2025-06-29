-- Comprehensive Database Schema Fix for Citizen Engagement App
-- Run this in your Supabase SQL editor to fix all schema issues

-- First, clean up any existing duplicate data (handle UUID properly)
DELETE FROM officials WHERE ctid NOT IN (
  SELECT MIN(ctid) 
  FROM officials 
  GROUP BY name, office_type
);

-- Drop existing problematic indexes and constraints
DROP INDEX IF EXISTS idx_officials_unique_bioguide;
DROP INDEX IF EXISTS idx_officials_unique_name_state_office;
DROP INDEX IF EXISTS idx_officials_unique_name_office;

-- Add missing columns to officials table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'officials' AND column_name = 'bioguide_id') THEN
        ALTER TABLE officials ADD COLUMN bioguide_id VARCHAR(20);
    END IF;
END $$;

-- Add missing columns to counties table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'counties' AND column_name = 'county_fips') THEN
        ALTER TABLE counties ADD COLUMN county_fips VARCHAR(3);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'counties' AND column_name = 'state') THEN
        ALTER TABLE counties ADD COLUMN state VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'counties' AND column_name = 'full_fips') THEN
        ALTER TABLE counties ADD COLUMN full_fips VARCHAR(5);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'counties' AND column_name = 'state_fips') THEN
        ALTER TABLE counties ADD COLUMN state_fips VARCHAR(2);
    END IF;
END $$;

-- Create proper unique constraints after cleaning duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_officials_unique_bioguide 
  ON officials(bioguide_id) 
  WHERE bioguide_id IS NOT NULL;

-- Create a unique constraint that allows for multiple officials with same name but different office types
-- Use a simpler approach that works with UUID
CREATE UNIQUE INDEX IF NOT EXISTS idx_officials_unique_name_office_state 
  ON officials(name, office_type, state) 
  WHERE name IS NOT NULL AND office_type IS NOT NULL AND state IS NOT NULL;

-- Update the upsert function to handle UUID properly
CREATE OR REPLACE FUNCTION upsert_official(
  p_name VARCHAR(255),
  p_office VARCHAR(255),
  p_party VARCHAR(100) DEFAULT NULL,
  p_state VARCHAR(100),
  p_level VARCHAR(50),
  p_office_type VARCHAR(100),
  p_bioguide_id VARCHAR(20) DEFAULT NULL,
  p_district VARCHAR(10) DEFAULT NULL,
  p_phone VARCHAR(50) DEFAULT NULL,
  p_email VARCHAR(255) DEFAULT NULL,
  p_website VARCHAR(500) DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_photo_url VARCHAR(500) DEFAULT NULL,
  p_social_media JSONB DEFAULT NULL,
  p_term_start DATE DEFAULT NULL,
  p_term_end DATE DEFAULT NULL
) RETURNS officials AS $$
DECLARE
  result officials;
BEGIN
  INSERT INTO officials (
    name, office, party, state, level, office_type, bioguide_id, district,
    phone, email, website, address, photo_url, social_media, term_start, term_end
  ) VALUES (
    p_name, p_office, p_party, p_state, p_level, p_office_type, p_bioguide_id, p_district,
    p_phone, p_email, p_website, p_address, p_photo_url, p_social_media, p_term_start, p_term_end
  )
  ON CONFLICT (name, office_type, state) 
  DO UPDATE SET
    office = EXCLUDED.office,
    party = EXCLUDED.party,
    level = EXCLUDED.level,
    bioguide_id = EXCLUDED.bioguide_id,
    district = EXCLUDED.district,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    website = EXCLUDED.website,
    address = EXCLUDED.address,
    photo_url = EXCLUDED.photo_url,
    social_media = EXCLUDED.social_media,
    term_start = EXCLUDED.term_start,
    term_end = EXCLUDED.term_end,
    updated_at = NOW()
  RETURNING * INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Clear existing Pennsylvania officials and insert correct current officials
DELETE FROM officials WHERE state = 'Pennsylvania' OR state = 'PA';

-- Insert correct Pennsylvania officials with current senators
INSERT INTO officials (name, office, party, state, level, office_type, bioguide_id) VALUES
('Josh Shapiro', 'Governor of Pennsylvania', 'Democratic', 'Pennsylvania', 'state', 'governor', NULL),
('Dave McCormick', 'U.S. Senator', 'Republican', 'Pennsylvania', 'federal', 'senator', 'M001212'),
('John Fetterman', 'U.S. Senator', 'Democratic', 'Pennsylvania', 'federal', 'senator', 'F000482')
ON CONFLICT (name, office_type, state) DO UPDATE SET
  office = EXCLUDED.office,
  party = EXCLUDED.party,
  level = EXCLUDED.level,
  bioguide_id = EXCLUDED.bioguide_id,
  updated_at = NOW();

-- Add some sample House representatives for Pennsylvania
INSERT INTO officials (name, office, party, state, level, office_type, bioguide_id, district) VALUES
('Brian Fitzpatrick', 'U.S. Representative', 'Republican', 'Pennsylvania', 'federal', 'representative', 'F000466', '1'),
('Brendan Boyle', 'U.S. Representative', 'Democratic', 'Pennsylvania', 'federal', 'representative', 'B001296', '2'),
('Dwight Evans', 'U.S. Representative', 'Democratic', 'Pennsylvania', 'federal', 'representative', 'E000296', '3'),
('Madeleine Dean', 'U.S. Representative', 'Democratic', 'Pennsylvania', 'federal', 'representative', 'D000631', '4'),
('Mary Gay Scanlon', 'U.S. Representative', 'Democratic', 'Pennsylvania', 'federal', 'representative', 'S001205', '5')
ON CONFLICT (name, office_type, state) DO UPDATE SET
  office = EXCLUDED.office,
  party = EXCLUDED.party,
  level = EXCLUDED.level,
  bioguide_id = EXCLUDED.bioguide_id,
  district = EXCLUDED.district,
  updated_at = NOW();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_counties_state ON counties(state);
CREATE INDEX IF NOT EXISTS idx_counties_full_fips ON counties(full_fips);
CREATE INDEX IF NOT EXISTS idx_officials_state ON officials(state);
CREATE INDEX IF NOT EXISTS idx_officials_level ON officials(level);
CREATE INDEX IF NOT EXISTS idx_officials_office_type ON officials(office_type);

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema'; 