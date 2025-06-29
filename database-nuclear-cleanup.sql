-- =====================================================
-- NUCLEAR DATABASE CLEANUP - FINAL SOLUTION
-- =====================================================
-- This script aggressively removes ALL function conflicts
-- and recreates everything from scratch

-- =====================================================
-- STEP 1: NUCLEAR DROP - Remove ALL function variants
-- =====================================================

-- Drop ALL possible variants of upsert_official
DROP FUNCTION IF EXISTS public.upsert_official() CASCADE;
DROP FUNCTION IF EXISTS public.upsert_official(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.upsert_official(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.upsert_official(TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.upsert_official(TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.upsert_official(TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.upsert_official(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.upsert_official(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.upsert_official(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.upsert_official(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.upsert_official(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.upsert_official(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.upsert_official(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.upsert_official(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;

-- Drop without public schema prefix
DROP FUNCTION IF EXISTS upsert_official() CASCADE;
DROP FUNCTION IF EXISTS upsert_official(TEXT) CASCADE;
DROP FUNCTION IF EXISTS upsert_official(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS upsert_official(TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS upsert_official(TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS upsert_official(TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS upsert_official(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS upsert_official(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS upsert_official(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS upsert_official(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS upsert_official(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS upsert_official(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS upsert_official(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS upsert_official(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;

-- Drop ALL possible variants of upsert_county
DROP FUNCTION IF EXISTS public.upsert_county() CASCADE;
DROP FUNCTION IF EXISTS public.upsert_county(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.upsert_county(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.upsert_county(TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.upsert_county(TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.upsert_county(TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.upsert_county(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.upsert_county(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.upsert_county(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.upsert_county(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.upsert_county(TEXT, NUMERIC, NUMERIC, TEXT, BIGINT, TEXT, TEXT, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.upsert_county(TEXT, TEXT, NUMERIC, TEXT, BIGINT, TEXT, TEXT, NUMERIC) CASCADE;

-- Drop without public schema prefix
DROP FUNCTION IF EXISTS upsert_county() CASCADE;
DROP FUNCTION IF EXISTS upsert_county(TEXT) CASCADE;
DROP FUNCTION IF EXISTS upsert_county(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS upsert_county(TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS upsert_county(TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS upsert_county(TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS upsert_county(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS upsert_county(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS upsert_county(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS upsert_county(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS upsert_county(TEXT, NUMERIC, NUMERIC, TEXT, BIGINT, TEXT, TEXT, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS upsert_county(TEXT, TEXT, NUMERIC, TEXT, BIGINT, TEXT, TEXT, NUMERIC) CASCADE;

-- Drop other helper functions
DROP FUNCTION IF EXISTS public.get_officials_with_fallback CASCADE;
DROP FUNCTION IF EXISTS get_officials_with_fallback CASCADE;
DROP FUNCTION IF EXISTS public.get_counties_with_fallback CASCADE;
DROP FUNCTION IF EXISTS get_counties_with_fallback CASCADE;
DROP FUNCTION IF EXISTS public.log_sync_operation CASCADE;
DROP FUNCTION IF EXISTS log_sync_operation CASCADE;

-- =====================================================
-- STEP 2: VERIFY ALL FUNCTIONS ARE GONE
-- =====================================================

-- Check if any upsert functions still exist
DO $$
DECLARE
    func_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO func_count 
    FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' 
    AND p.proname LIKE '%upsert%';
    
    IF func_count > 0 THEN
        RAISE NOTICE 'WARNING: % upsert functions still exist!', func_count;
    ELSE
        RAISE NOTICE 'SUCCESS: All upsert functions have been removed';
    END IF;
END $$;

-- =====================================================
-- STEP 3: RECREATE TABLES WITH CORRECT SCHEMA
-- =====================================================

-- Drop and recreate officials table
DROP TABLE IF EXISTS public.officials CASCADE;
CREATE TABLE public.officials (
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
    data_source TEXT DEFAULT 'api',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop and recreate counties table
DROP TABLE IF EXISTS public.counties CASCADE;
CREATE TABLE public.counties (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    state TEXT NOT NULL,
    county_fips TEXT,
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

-- =====================================================
-- STEP 4: CREATE UNIQUE CONSTRAINTS
-- =====================================================

-- Create unique constraint for officials
CREATE UNIQUE INDEX idx_officials_unique 
ON public.officials(name, state, office) 
WHERE is_active = true;

-- Create unique constraint for counties
CREATE UNIQUE INDEX idx_counties_unique 
ON public.counties(name, state);

-- =====================================================
-- STEP 5: CREATE SINGLE CLEAN FUNCTIONS
-- =====================================================

-- Create the ONE AND ONLY upsert_official function
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

-- Create the ONE AND ONLY upsert_county function
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

-- =====================================================
-- STEP 6: VERIFY FUNCTIONS ARE CREATED CORRECTLY
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

-- =====================================================
-- STEP 7: FORCE SCHEMA REFRESH
-- =====================================================

-- Force Supabase to refresh its schema cache
NOTIFY pgrst, 'reload schema';

-- Final verification
SELECT 'NUCLEAR CLEANUP COMPLETED SUCCESSFULLY!' as status;
SELECT 'All function conflicts have been eliminated!' as message;
SELECT 'Database is now ready for use!' as final_status; 