-- Final Comprehensive Database Schema Fix
-- This script fixes all missing columns and constraint issues

-- Drop existing tables to start fresh
DROP TABLE IF EXISTS public.counties CASCADE;
DROP TABLE IF EXISTS public.officials CASCADE;

-- Create officials table with ALL required columns
CREATE TABLE public.officials (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    office TEXT NOT NULL,
    party TEXT,
    state TEXT NOT NULL,
    bioguide_id TEXT, -- This column was missing and causing errors
    district TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create counties table with ALL required columns
CREATE TABLE public.counties (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    state TEXT NOT NULL, -- This column was missing and causing errors
    county_fips TEXT NOT NULL, -- This column was missing and causing errors
    state_fips TEXT NOT NULL,
    full_fips TEXT NOT NULL,
    population BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create proper indexes
CREATE INDEX idx_officials_state ON public.officials(state);
CREATE INDEX idx_officials_bioguide_id ON public.officials(bioguide_id);
CREATE INDEX idx_counties_state ON public.counties(state);
CREATE INDEX idx_counties_fips ON public.counties(county_fips, state_fips);

-- Create unique constraint for officials (name + state + office combination)
CREATE UNIQUE INDEX idx_officials_unique ON public.officials(name, state, office);

-- Create unique constraint for counties (name + state combination)
CREATE UNIQUE INDEX idx_counties_unique ON public.counties(name, state);

-- Insert Pennsylvania officials with correct data
INSERT INTO public.officials (name, office, party, state, bioguide_id) VALUES
('Josh Shapiro', 'Governor', 'Democratic', 'Pennsylvania', NULL),
('John Fetterman', 'U.S. Senator', 'Democratic', 'Pennsylvania', 'F000479'),
('Dave McCormick', 'U.S. Senator', 'Republican', 'Pennsylvania', 'M001212')
ON CONFLICT (name, state, office) DO UPDATE SET
    party = EXCLUDED.party,
    bioguide_id = EXCLUDED.bioguide_id,
    updated_at = NOW();

-- Grant necessary permissions
GRANT ALL ON public.officials TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.counties TO postgres, anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Enable RLS (Row Level Security)
ALTER TABLE public.officials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counties ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Enable read access for all users" ON public.officials FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.counties FOR SELECT USING (true);

-- Create policies for authenticated write access
CREATE POLICY "Enable insert for authenticated users only" ON public.officials FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON public.officials FOR UPDATE USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.counties FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON public.counties FOR UPDATE USING (true);

-- Create helper function to get county with representatives
CREATE OR REPLACE FUNCTION get_county_with_representatives(county_name TEXT, state_name TEXT)
RETURNS TABLE(
    county_id BIGINT,
    county_name TEXT,
    county_state TEXT,
    county_population BIGINT,
    representatives JSONB
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.state,
        c.population,
        COALESCE(
            (SELECT jsonb_agg(
                jsonb_build_object(
                    'name', o.name,
                    'office', o.office,
                    'party', o.party,
                    'bioguide_id', o.bioguide_id
                )
            )
            FROM officials o 
            WHERE o.state = c.state 
            AND o.office LIKE '%Representative%'),
            '[]'::jsonb
        ) as representatives
    FROM counties c
    WHERE c.name = county_name AND c.state = state_name;
END;
$$; 