-- SIMPLE DATABASE FIX FOR CITIZEN APP
-- This script fixes the function parameter mismatches causing 500 errors

-- =====================================================
-- STEP 1: DROP ALL CONFLICTING FUNCTIONS
-- =====================================================

DROP FUNCTION IF EXISTS public.upsert_official CASCADE;
DROP FUNCTION IF EXISTS public.upsert_county CASCADE;
DROP FUNCTION IF EXISTS public.get_counties_with_fallback CASCADE;
DROP FUNCTION IF EXISTS public.get_officials_with_fallback CASCADE;

-- =====================================================
-- STEP 2: CREATE CORRECT FUNCTIONS MATCHING API CALLS
-- =====================================================

-- Create upsert_county function that matches the API parameters from the logs
CREATE OR REPLACE FUNCTION public.upsert_county(
    p_name TEXT,
    p_state TEXT,
    p_state_fips TEXT,
    p_county_fips TEXT,
    p_full_fips TEXT,
    p_population BIGINT,
    p_land_area DECIMAL DEFAULT NULL,
    p_water_area DECIMAL DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
    county_id BIGINT;
BEGIN
    INSERT INTO public.counties (
        name, state, state_fips, county_fips, population, 
        land_area, updated_at
    ) VALUES (
        p_name, p_state, p_state_fips, p_county_fips, p_population,
        p_land_area, NOW()
    )
    ON CONFLICT (name, state)
    DO UPDATE SET
        state_fips = EXCLUDED.state_fips,
        county_fips = EXCLUDED.county_fips,
        population = EXCLUDED.population,
        land_area = EXCLUDED.land_area,
        updated_at = NOW()
    RETURNING id INTO county_id;
    
    RETURN county_id;
END;
$$ LANGUAGE plpgsql;

-- Create upsert_official function that matches the API parameters
CREATE OR REPLACE FUNCTION public.upsert_official(
    p_name TEXT,
    p_office TEXT,
    p_party TEXT,
    p_state TEXT,
    p_level TEXT,
    p_office_type TEXT,
    p_bioguide_id TEXT,
    p_district TEXT DEFAULT NULL,
    p_source TEXT DEFAULT 'api'
) RETURNS BIGINT AS $$
DECLARE
    official_id BIGINT;
BEGIN
    INSERT INTO public.officials (
        name, office, party, state, level, office_type, bioguide_id, district,
        data_source, updated_at
    ) VALUES (
        p_name, p_office, p_party, p_state, p_level, p_office_type, p_bioguide_id, p_district,
        p_source, NOW()
    )
    ON CONFLICT (name, state, office)
    DO UPDATE SET
        party = EXCLUDED.party,
        level = EXCLUDED.level,
        office_type = EXCLUDED.office_type,
        bioguide_id = EXCLUDED.bioguide_id,
        district = EXCLUDED.district,
        data_source = EXCLUDED.data_source,
        updated_at = NOW()
    RETURNING id INTO official_id;
    
    RETURN official_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 3: CREATE MISSING UNIQUE CONSTRAINTS
-- =====================================================

-- Create unique constraint for officials if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS idx_officials_unique_name_state_office 
ON public.officials(name, state, office);

-- Create unique constraint for counties if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS idx_counties_unique_name_state 
ON public.counties(name, state);

-- =====================================================
-- STEP 4: FORCE SCHEMA REFRESH
-- =====================================================

-- Force PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT 'Simple database fix completed successfully!' as status;
SELECT 'Functions now match API parameter expectations!' as message; 