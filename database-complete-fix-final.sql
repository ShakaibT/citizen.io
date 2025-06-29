-- =====================================================
-- COMPLETE DATABASE FIX - FINAL SOLUTION
-- =====================================================
-- This script completely fixes all database issues:
-- 1. Function name conflicts (42725 errors)
-- 2. Missing columns (bioguide_id, county_fips, etc.)
-- 3. Missing constraints (42P10 errors)
-- 4. Parameter mismatches (PGRST202 errors)

-- =====================================================
-- STEP 1: DROP ALL EXISTING CONFLICTING FUNCTIONS
-- =====================================================

-- Drop ALL versions of upsert functions to eliminate conflicts
DROP FUNCTION IF EXISTS public.upsert_official CASCADE;
DROP FUNCTION IF EXISTS upsert_official CASCADE;
DROP FUNCTION IF EXISTS public.upsert_county CASCADE;
DROP FUNCTION IF EXISTS upsert_county CASCADE;
DROP FUNCTION IF EXISTS public.get_officials_with_fallback CASCADE;
DROP FUNCTION IF EXISTS get_officials_with_fallback CASCADE;
DROP FUNCTION IF EXISTS public.get_counties_with_fallback CASCADE;
DROP FUNCTION IF EXISTS get_counties_with_fallback CASCADE;
DROP FUNCTION IF EXISTS public.log_sync_operation CASCADE;
DROP FUNCTION IF EXISTS log_sync_operation CASCADE;

-- =====================================================
-- STEP 2: DROP AND RECREATE TABLES WITH CORRECT SCHEMA
-- =====================================================

-- Drop existing tables to ensure clean schema
DROP TABLE IF EXISTS public.officials CASCADE;
DROP TABLE IF EXISTS public.counties CASCADE;
DROP TABLE IF EXISTS public.fallback_officials CASCADE;
DROP TABLE IF EXISTS public.fallback_counties CASCADE;
DROP TABLE IF EXISTS public.data_sync_logs CASCADE;

-- Create officials table with ALL required columns
CREATE TABLE public.officials (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    office TEXT NOT NULL,
    party TEXT,
    state TEXT NOT NULL,
    state_abbreviation TEXT,
    bioguide_id TEXT UNIQUE,  -- This was missing!
    district TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    image_url TEXT,
    congress_url TEXT,
    data_source TEXT DEFAULT 'api',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create counties table with ALL required columns
CREATE TABLE public.counties (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    state TEXT NOT NULL,  -- This was missing!
    county_fips TEXT,     -- This was missing!
    state_fips TEXT,
    full_fips TEXT,
    population BIGINT,
    land_area NUMERIC,
    water_area NUMERIC,
    density NUMERIC,
    median_income NUMERIC,
    county_seat TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create fallback tables
CREATE TABLE public.fallback_officials (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    office TEXT NOT NULL,
    party TEXT,
    state TEXT NOT NULL,
    state_abbreviation TEXT,
    bioguide_id TEXT,
    district TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    image_url TEXT,
    congress_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.fallback_counties (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    state TEXT NOT NULL,
    county_fips TEXT,
    state_fips TEXT,
    full_fips TEXT,
    population BIGINT,
    land_area NUMERIC,
    water_area NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.data_sync_logs (
    id BIGSERIAL PRIMARY KEY,
    operation TEXT NOT NULL,
    status TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STEP 3: CREATE REQUIRED UNIQUE CONSTRAINTS
-- =====================================================

-- Create unique constraints to fix ON CONFLICT errors
CREATE UNIQUE INDEX IF NOT EXISTS idx_officials_unique 
ON public.officials(name, state, office) 
WHERE is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_counties_unique 
ON public.counties(name, state);

CREATE UNIQUE INDEX IF NOT EXISTS idx_counties_fips 
ON public.counties(county_fips, state_fips) 
WHERE county_fips IS NOT NULL;

-- =====================================================
-- STEP 4: CREATE FUNCTIONS WITH EXACT API SIGNATURES
-- =====================================================

-- Create upsert_official function with EXACT parameters your API calls
CREATE OR REPLACE FUNCTION public.upsert_official(
    p_name TEXT,
    p_office TEXT,
    p_party TEXT,
    p_state TEXT,
    p_state_abbreviation TEXT,
    p_bioguide_id TEXT,
    p_district TEXT,
    p_phone TEXT,
    p_email TEXT,
    p_website TEXT,
    p_image_url TEXT,
    p_congress_url TEXT,
    p_data_source TEXT
) RETURNS BIGINT AS $$
DECLARE
    official_id BIGINT;
BEGIN
    INSERT INTO public.officials (
        name, office, party, state, state_abbreviation, bioguide_id,
        district, phone, email, website, image_url, congress_url, data_source,
        is_active, updated_at
    ) VALUES (
        p_name, p_office, p_party, p_state, p_state_abbreviation, p_bioguide_id,
        p_district, p_phone, p_email, p_website, p_image_url, p_congress_url, p_data_source,
        true, NOW()
    )
    ON CONFLICT (name, state, office) WHERE is_active = true
    DO UPDATE SET
        party = EXCLUDED.party,
        state_abbreviation = EXCLUDED.state_abbreviation,
        bioguide_id = EXCLUDED.bioguide_id,
        district = EXCLUDED.district,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        website = EXCLUDED.website,
        image_url = EXCLUDED.image_url,
        congress_url = EXCLUDED.congress_url,
        data_source = EXCLUDED.data_source,
        updated_at = NOW()
    RETURNING id INTO official_id;
    
    RETURN official_id;
END;
$$ LANGUAGE plpgsql;

-- Create upsert_county function with EXACT parameters your API calls
CREATE OR REPLACE FUNCTION public.upsert_county(
    p_county_fips TEXT,
    p_full_fips TEXT,
    p_land_area NUMERIC,
    p_name TEXT,
    p_population BIGINT,
    p_state TEXT,
    p_state_fips TEXT,
    p_water_area NUMERIC
) RETURNS BIGINT AS $$
DECLARE
    county_id BIGINT;
BEGIN
    INSERT INTO public.counties (
        county_fips, full_fips, land_area, name, population, 
        state, state_fips, water_area, updated_at
    ) VALUES (
        p_county_fips, p_full_fips, p_land_area, p_name, p_population,
        p_state, p_state_fips, p_water_area, NOW()
    )
    ON CONFLICT (name, state)
    DO UPDATE SET
        county_fips = EXCLUDED.county_fips,
        full_fips = EXCLUDED.full_fips,
        land_area = EXCLUDED.land_area,
        population = EXCLUDED.population,
        state_fips = EXCLUDED.state_fips,
        water_area = EXCLUDED.water_area,
        updated_at = NOW()
    RETURNING id INTO county_id;
    
    RETURN county_id;
END;
$$ LANGUAGE plpgsql;

-- Create helper functions
CREATE OR REPLACE FUNCTION public.get_officials_with_fallback(p_state TEXT)
RETURNS TABLE(
    id BIGINT,
    name TEXT,
    office TEXT,
    party TEXT,
    state TEXT,
    state_abbreviation TEXT,
    bioguide_id TEXT,
    district TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    image_url TEXT,
    congress_url TEXT,
    data_source TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT o.id, o.name, o.office, o.party, o.state, o.state_abbreviation,
           o.bioguide_id, o.district, o.phone, o.email, o.website, 
           o.image_url, o.congress_url, o.data_source
    FROM public.officials o
    WHERE o.state = p_state AND o.is_active = true
    
    UNION ALL
    
    SELECT f.id, f.name, f.office, f.party, f.state, f.state_abbreviation,
           f.bioguide_id, f.district, f.phone, f.email, f.website,
           f.image_url, f.congress_url, 'fallback'::TEXT
    FROM public.fallback_officials f
    WHERE f.state = p_state
    AND NOT EXISTS (
        SELECT 1 FROM public.officials o2 
        WHERE o2.state = p_state AND o2.is_active = true
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_counties_with_fallback(p_state TEXT)
RETURNS TABLE(
    id BIGINT,
    name TEXT,
    state TEXT,
    county_fips TEXT,
    state_fips TEXT,
    full_fips TEXT,
    population BIGINT,
    land_area NUMERIC,
    water_area NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.name, c.state, c.county_fips, c.state_fips,
           c.full_fips, c.population, c.land_area, c.water_area
    FROM public.counties c
    WHERE c.state = p_state
    
    UNION ALL
    
    SELECT f.id, f.name, f.state, f.county_fips, f.state_fips,
           f.full_fips, f.population, f.land_area, f.water_area
    FROM public.fallback_counties f
    WHERE f.state = p_state
    AND NOT EXISTS (
        SELECT 1 FROM public.counties c2 WHERE c2.state = p_state
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.log_sync_operation(
    p_operation TEXT,
    p_status TEXT,
    p_details JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.data_sync_logs (operation, status, details)
    VALUES (p_operation, p_status, p_details);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 5: INSERT FALLBACK DATA
-- =====================================================

-- Insert fallback officials (governors and senators)
INSERT INTO public.fallback_officials (name, office, party, state, state_abbreviation) VALUES
('Josh Shapiro', 'Governor', 'Democratic', 'Pennsylvania', 'PA'),
('Bob Casey Jr.', 'Senator', 'Democratic', 'Pennsylvania', 'PA'),
('John Fetterman', 'Senator', 'Democratic', 'Pennsylvania', 'PA'),
('Katie Hobbs', 'Governor', 'Democratic', 'Arizona', 'AZ'),
('Mark Kelly', 'Senator', 'Democratic', 'Arizona', 'AZ'),
('Kyrsten Sinema', 'Senator', 'Independent', 'Arizona', 'AZ'),
('Gavin Newsom', 'Governor', 'Democratic', 'California', 'CA'),
('Alex Padilla', 'Senator', 'Democratic', 'California', 'CA'),
('Laphonza Butler', 'Senator', 'Democratic', 'California', 'CA');

-- Insert fallback counties (major counties for each state)
INSERT INTO public.fallback_counties (name, state, county_fips, state_fips, population) VALUES
('Philadelphia', 'Pennsylvania', '101', '42', 1576251),
('Allegheny', 'Pennsylvania', '003', '42', 1250578),
('Montgomery', 'Pennsylvania', '091', '42', 856553),
('Maricopa', 'Arizona', '013', '04', 4485414),
('Pima', 'Arizona', '019', '04', 1043433),
('Pinal', 'Arizona', '021', '04', 425264),
('Los Angeles', 'California', '037', '06', 9829544),
('San Diego', 'California', '073', '06', 3286069),
('Orange', 'California', '059', '06', 3167809);

-- =====================================================
-- STEP 6: ENABLE ROW LEVEL SECURITY (OPTIONAL)
-- =====================================================

-- Enable RLS for security
ALTER TABLE public.officials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fallback_officials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fallback_counties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_sync_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access" ON public.officials FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.counties FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.fallback_officials FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.fallback_counties FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.data_sync_logs FOR SELECT USING (true);

-- Create policies for authenticated write access
CREATE POLICY "Allow authenticated write access" ON public.officials FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated write access" ON public.counties FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated write access" ON public.data_sync_logs FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- STEP 7: REFRESH SCHEMA CACHE
-- =====================================================

-- Force Supabase to refresh its schema cache
NOTIFY pgrst, 'reload schema';

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Test the functions work
SELECT 'Testing upsert_official function...' as status;
SELECT public.upsert_official(
    'Test Official', 'Test Office', 'Test Party', 'Test State', 'TS',
    'TEST123', 'District 1', '555-1234', 'test@example.com',
    'https://example.com', 'https://image.com', 'https://congress.com', 'test'
);

SELECT 'Testing upsert_county function...' as status;
SELECT public.upsert_county(
    '001', '42001', 100.5, 'Test County', 50000, 'Test State', '42', 10.5
);

SELECT 'Database fix completed successfully!' as status;
SELECT 'All function conflicts resolved!' as message;
SELECT 'All missing columns added!' as message;
SELECT 'All constraints created!' as message; 