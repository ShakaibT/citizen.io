-- Comprehensive Database Schema Fix
-- This script fixes all the issues preventing data from displaying

-- Drop existing tables to start fresh
DROP TABLE IF EXISTS public.counties CASCADE;
DROP TABLE IF EXISTS public.officials CASCADE;

-- Create officials table with all required columns
CREATE TABLE public.officials (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    office TEXT NOT NULL,
    party TEXT,
    state TEXT NOT NULL,
    bioguide_id TEXT UNIQUE, -- This was missing and causing errors
    district TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create counties table with all required columns
CREATE TABLE public.counties (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    state TEXT NOT NULL, -- This was missing and causing errors
    county_fips TEXT NOT NULL, -- This was missing and causing errors
    state_fips TEXT NOT NULL,
    full_fips TEXT NOT NULL,
    population BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(county_fips, state_fips) -- Proper unique constraint
);

-- Enable RLS
ALTER TABLE public.officials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counties ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public read access
CREATE POLICY "Allow public read access on officials" ON public.officials
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access on counties" ON public.counties
    FOR SELECT USING (true);

-- Create indexes for performance
CREATE INDEX idx_officials_state ON public.officials(state);
CREATE INDEX idx_officials_bioguide_id ON public.officials(bioguide_id);
CREATE INDEX idx_counties_state ON public.counties(state);
CREATE INDEX idx_counties_fips ON public.counties(county_fips, state_fips);

-- Insert Pennsylvania officials (current data)
INSERT INTO public.officials (name, office, party, state, bioguide_id) VALUES
('Josh Shapiro', 'Governor', 'Democratic', 'Pennsylvania', 'SHAPIRO_PA_GOV'),
('John Fetterman', 'U.S. Senator', 'Democratic', 'Pennsylvania', 'F000482'),
('Dave McCormick', 'U.S. Senator', 'Republican', 'Pennsylvania', 'M001212');

-- Create function to get county with representatives
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
                    'district', o.district
                )
            )
            FROM public.officials o 
            WHERE o.state = c.state 
            AND o.office LIKE '%Representative%'),
            '[]'::jsonb
        ) as representatives
    FROM public.counties c
    WHERE c.name = county_name AND c.state = state_name;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.officials TO anon, authenticated;
GRANT SELECT ON public.counties TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_county_with_representatives TO anon, authenticated; 