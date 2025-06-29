-- Clean officials table schema for citizen engagement app
-- Run this in your Supabase SQL editor

-- Drop existing table and recreate with proper schema
DROP TABLE IF EXISTS county_representatives CASCADE;
DROP TABLE IF EXISTS officials CASCADE;

-- Create officials table with all necessary columns
CREATE TABLE officials (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  office VARCHAR(255) NOT NULL,
  party VARCHAR(100),
  state VARCHAR(100) NOT NULL,
  level VARCHAR(50) NOT NULL, -- 'federal', 'state', 'local'
  office_type VARCHAR(100) NOT NULL, -- 'governor', 'senator', 'representative', etc.
  bioguide_id VARCHAR(20), -- For Congress.gov API integration
  district VARCHAR(10), -- For representatives
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(500),
  address TEXT,
  photo_url VARCHAR(500),
  social_media JSONB,
  term_start DATE,
  term_end DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_officials_state ON officials(state);
CREATE INDEX idx_officials_level ON officials(level);
CREATE INDEX idx_officials_office_type ON officials(office_type);
CREATE INDEX idx_officials_bioguide_id ON officials(bioguide_id);

-- Create unique constraint for bioguide_id (when not null)
CREATE UNIQUE INDEX idx_officials_unique_bioguide 
  ON officials(bioguide_id) 
  WHERE bioguide_id IS NOT NULL;

-- Create unique constraint for name, state, and office combination
CREATE UNIQUE INDEX idx_officials_unique_name_state_office 
  ON officials(name, state, office_type);

-- Enable RLS
ALTER TABLE officials ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Public read access" ON officials FOR SELECT USING (true);

-- Create policies for service role write access
CREATE POLICY "Service role write access" ON officials
  FOR ALL USING (auth.role() = 'service_role');

-- Create the upsert function that works with the actual table structure
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
  ON CONFLICT (name, state, office_type) 
  DO UPDATE SET
    office = EXCLUDED.office,
    party = EXCLUDED.party,
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

-- Insert some sample data for Pennsylvania to test
INSERT INTO officials (name, office, party, state, level, office_type, bioguide_id) VALUES
('Josh Shapiro', 'Governor', 'Democratic', 'Pennsylvania', 'state', 'governor', NULL),
('Bob Casey Jr.', 'U.S. Senator', 'Democratic', 'Pennsylvania', 'federal', 'senator', 'C001070'),
('John Fetterman', 'U.S. Senator', 'Democratic', 'Pennsylvania', 'federal', 'senator', 'F000482')
ON CONFLICT (name, state, office_type) DO NOTHING; 