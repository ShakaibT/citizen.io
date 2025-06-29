-- Clean counties table schema for citizen engagement app
-- Run this in your Supabase SQL editor

-- Drop existing tables and recreate with proper schema
DROP TABLE IF EXISTS county_representatives CASCADE;
DROP TABLE IF EXISTS counties CASCADE;

-- Create counties table with all necessary columns
CREATE TABLE counties (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  state VARCHAR(100) NOT NULL,
  state_fips VARCHAR(2) NOT NULL,
  county_fips VARCHAR(3) NOT NULL,
  full_fips VARCHAR(5) NOT NULL, -- state_fips + county_fips
  population INTEGER DEFAULT 0,
  land_area BIGINT DEFAULT 0, -- in square meters
  water_area BIGINT DEFAULT 0,
  density DECIMAL(10,2) DEFAULT 0, -- people per square mile
  median_income INTEGER,
  county_seat TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add unique constraints
  UNIQUE(state, county_fips),
  UNIQUE(full_fips)
);

-- Create county_representatives table to store the many-to-many relationship
CREATE TABLE county_representatives (
  id SERIAL PRIMARY KEY,
  county_id INTEGER REFERENCES counties(id) ON DELETE CASCADE,
  official_id INTEGER REFERENCES officials(id) ON DELETE CASCADE,
  district TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(county_id, official_id)
);

-- Create indexes for fast queries
CREATE INDEX idx_counties_state ON counties(state);
CREATE INDEX idx_counties_state_fips ON counties(state_fips);
CREATE INDEX idx_counties_full_fips ON counties(full_fips);
CREATE INDEX idx_counties_name_state ON counties(name, state);
CREATE INDEX idx_county_representatives_county_id ON county_representatives(county_id);
CREATE INDEX idx_county_representatives_official_id ON county_representatives(official_id);

-- Enable Row Level Security
ALTER TABLE counties ENABLE ROW LEVEL SECURITY;
ALTER TABLE county_representatives ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Public read access on counties" ON counties
  FOR SELECT USING (true);

CREATE POLICY "Public read access on county_representatives" ON county_representatives
  FOR SELECT USING (true);

-- Create policies for service role write access
CREATE POLICY "Service role write access on counties" ON counties
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role write access on county_representatives" ON county_representatives
  FOR ALL USING (auth.role() = 'service_role');

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_counties_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_counties_updated_at 
  BEFORE UPDATE ON counties 
  FOR EACH ROW 
  EXECUTE FUNCTION update_counties_updated_at_column();

-- Create function to upsert county data
CREATE OR REPLACE FUNCTION upsert_county(
  p_name TEXT,
  p_state TEXT,
  p_state_fips TEXT,
  p_county_fips TEXT,
  p_population INTEGER DEFAULT NULL,
  p_land_area BIGINT DEFAULT NULL,
  p_density NUMERIC DEFAULT NULL,
  p_median_income INTEGER DEFAULT NULL,
  p_county_seat TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  county_id INTEGER;
  full_fips_code TEXT;
BEGIN
  -- Create full FIPS code
  full_fips_code := p_state_fips || p_county_fips;
  
  -- Try to update existing record first
  UPDATE counties 
  SET 
    name = p_name,
    state = p_state,
    population = COALESCE(p_population, population),
    land_area = COALESCE(p_land_area, land_area),
    density = COALESCE(p_density, density),
    median_income = COALESCE(p_median_income, median_income),
    county_seat = COALESCE(p_county_seat, county_seat),
    updated_at = NOW()
  WHERE full_fips = full_fips_code
  RETURNING id INTO county_id;
  
  -- If no update occurred, insert new record
  IF county_id IS NULL THEN
    INSERT INTO counties (
      name, state, state_fips, county_fips, full_fips, 
      population, land_area, density, median_income, county_seat
    ) VALUES (
      p_name, p_state, p_state_fips, p_county_fips, full_fips_code,
      p_population, p_land_area, p_density, p_median_income, p_county_seat
    ) RETURNING id INTO county_id;
  END IF;
  
  RETURN county_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to link county with representative
CREATE OR REPLACE FUNCTION link_county_representative(
  p_county_fips TEXT,
  p_official_bioguide_id TEXT,
  p_district TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  county_id INTEGER;
  official_id INTEGER;
BEGIN
  -- Find county by FIPS code
  SELECT id INTO county_id FROM counties WHERE full_fips = p_county_fips;
  
  -- Find official by bioguide_id
  SELECT id INTO official_id FROM officials WHERE bioguide_id = p_official_bioguide_id;
  
  -- If both exist, create the link
  IF county_id IS NOT NULL AND official_id IS NOT NULL THEN
    INSERT INTO county_representatives (county_id, official_id, district)
    VALUES (county_id, official_id, p_district)
    ON CONFLICT (county_id, official_id) 
    DO UPDATE SET district = p_district, created_at = NOW();
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Create function to get county with representatives
CREATE OR REPLACE FUNCTION get_county_with_representatives(
  p_county_name TEXT,
  p_state_name TEXT
) RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'id', c.id,
    'name', c.name,
    'state', c.state,
    'population', c.population,
    'county_seat', c.county_seat,
    'median_income', c.median_income,
    'representatives', COALESCE(
      json_agg(
        json_build_object(
          'name', o.name,
          'office', o.office,
          'party', o.party,
          'district', cr.district
        )
      ) FILTER (WHERE o.id IS NOT NULL),
      '[]'::json
    )
  ) INTO result
  FROM counties c
  LEFT JOIN county_representatives cr ON c.id = cr.county_id
  LEFT JOIN officials o ON cr.official_id = o.id
  WHERE c.name = p_county_name AND c.state = p_state_name
  GROUP BY c.id, c.name, c.state, c.population, c.county_seat, c.median_income;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql; 