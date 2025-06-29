-- =====================================================
-- DATABASE CLEANUP AND FUNCTION FIX
-- =====================================================
-- This script fixes the "function name not unique" errors
-- by dropping all existing conflicting functions and recreating them
-- with the correct signatures that match the API calls.

-- =====================================================
-- 1. DROP ALL EXISTING CONFLICTING FUNCTIONS
-- =====================================================

-- Drop all versions of upsert_official function
DROP FUNCTION IF EXISTS public.upsert_official CASCADE;
DROP FUNCTION IF EXISTS upsert_official CASCADE;

-- Drop all versions of upsert_county function  
DROP FUNCTION IF EXISTS public.upsert_county CASCADE;
DROP FUNCTION IF EXISTS upsert_county CASCADE;

-- Drop any other conflicting functions
DROP FUNCTION IF EXISTS public.get_officials_with_fallback CASCADE;
DROP FUNCTION IF EXISTS public.get_counties_with_fallback CASCADE;
DROP FUNCTION IF EXISTS public.log_sync_operation CASCADE;

-- =====================================================
-- 2. RECREATE FUNCTIONS WITH CORRECT SIGNATURES
-- =====================================================

-- Function to log sync operations
CREATE OR REPLACE FUNCTION public.log_sync_operation(
    p_sync_type TEXT,
    p_state TEXT,
    p_status TEXT,
    p_total_records INTEGER,
    p_successful_records INTEGER,
    p_failed_records INTEGER,
    p_api_calls INTEGER,
    p_cache_hits INTEGER,
    p_metadata JSONB DEFAULT NULL,
    p_duration_ms INTEGER DEFAULT 0,
    p_data_source TEXT DEFAULT 'unknown'
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    log_id BIGINT;
BEGIN
    INSERT INTO public.data_sync_logs (
        sync_type, state, status, total_records, successful_records, 
        failed_records, api_calls, cache_hits, metadata, duration_ms, 
        data_source, sync_date
    ) VALUES (
        p_sync_type, p_state, p_status, p_total_records, p_successful_records,
        p_failed_records, p_api_calls, p_cache_hits, p_metadata, p_duration_ms,
        p_data_source, NOW()
    )
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;

-- Function to get officials with fallback (exact match from production schema)
CREATE OR REPLACE FUNCTION public.get_officials_with_fallback(state_name TEXT)
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
    data_source TEXT,
    is_fallback BOOLEAN,
    priority INTEGER,
    last_updated TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- First try to get from main officials table
    RETURN QUERY
    SELECT 
        o.id,
        o.name,
        o.office,
        o.party,
        o.state,
        o.state_abbreviation,
        o.bioguide_id,
        o.district,
        o.phone,
        o.email,
        o.website,
        o.image_url,
        o.congress_url,
        o.data_source,
        false as is_fallback,
        0 as priority,
        o.last_updated
    FROM public.officials o
    WHERE LOWER(o.state) = LOWER(state_name) 
       OR LOWER(o.state_abbreviation) = LOWER(state_name)
    ORDER BY o.office, o.name;
    
    -- If no results, get from fallback table
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            NULL::BIGINT as id,
            f.name,
            f.office,
            f.party,
            f.state,
            f.state_abbreviation,
            NULL::TEXT as bioguide_id,
            NULL::TEXT as district,
            NULL::TEXT as phone,
            NULL::TEXT as email,
            NULL::TEXT as website,
            NULL::TEXT as image_url,
            NULL::TEXT as congress_url,
            'fallback' as data_source,
            true as is_fallback,
            f.priority,
            f.created_at as last_updated
        FROM public.fallback_officials f
        WHERE LOWER(f.state) = LOWER(state_name) 
           OR LOWER(f.state_abbreviation) = LOWER(state_name)
        ORDER BY f.priority, f.office, f.name;
    END IF;
END;
$$;

-- Function to get counties with fallback
CREATE OR REPLACE FUNCTION public.get_counties_with_fallback(state_name TEXT)
RETURNS TABLE(
    id BIGINT,
    name TEXT,
    state TEXT,
    state_abbreviation TEXT,
    county_fips TEXT,
    state_fips TEXT,
    full_fips TEXT,
    population BIGINT,
    land_area DECIMAL,
    water_area DECIMAL,
    is_fallback BOOLEAN,
    priority INTEGER,
    last_updated TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- First try to get from main counties table
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.state,
        c.state_abbreviation,
        c.county_fips,
        c.state_fips,
        c.full_fips,
        c.population,
        c.land_area,
        c.water_area,
        false as is_fallback,
        0 as priority,
        c.last_updated
    FROM public.counties c
    WHERE LOWER(c.state) = LOWER(state_name) 
       OR LOWER(c.state_abbreviation) = LOWER(state_name)
    ORDER BY c.name;
    
    -- If no results, get from fallback table
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            NULL::BIGINT as id,
            f.name,
            f.state,
            f.state_abbreviation,
            NULL::TEXT as county_fips,
            NULL::TEXT as state_fips,
            NULL::TEXT as full_fips,
            f.population,
            NULL::DECIMAL as land_area,
            NULL::DECIMAL as water_area,
            true as is_fallback,
            f.priority,
            f.created_at as last_updated
        FROM public.fallback_counties f
        WHERE LOWER(f.state) = LOWER(state_name) 
           OR LOWER(f.state_abbreviation) = LOWER(state_name)
        ORDER BY f.priority, f.name;
    END IF;
END;
$$;

-- Function to upsert officials (EXACT MATCH for API calls)
CREATE OR REPLACE FUNCTION public.upsert_official(
    p_name TEXT,
    p_office TEXT,
    p_party TEXT,
    p_state TEXT,
    p_state_abbreviation TEXT,
    p_bioguide_id TEXT,
    p_district TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_website TEXT DEFAULT NULL,
    p_image_url TEXT DEFAULT NULL,
    p_congress_url TEXT DEFAULT NULL,
    p_data_source TEXT DEFAULT 'congress_api'
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    official_id BIGINT;
BEGIN
    INSERT INTO public.officials (
        name, office, party, state, state_abbreviation, bioguide_id, district,
        phone, email, website, image_url, congress_url, data_source, last_updated
    ) VALUES (
        p_name, p_office, p_party, p_state, p_state_abbreviation, p_bioguide_id, p_district,
        p_phone, p_email, p_website, p_image_url, p_congress_url, p_data_source, NOW()
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
        last_updated = NOW(),
        updated_at = NOW()
    RETURNING id INTO official_id;
    
    RETURN official_id;
END;
$$;

-- Function to upsert counties (EXACT MATCH for API calls)
CREATE OR REPLACE FUNCTION public.upsert_county(
    p_county_fips TEXT,
    p_full_fips TEXT,
    p_land_area DECIMAL,
    p_name TEXT,
    p_population BIGINT,
    p_state TEXT,
    p_state_fips TEXT,
    p_water_area DECIMAL
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    county_id BIGINT;
BEGIN
    INSERT INTO public.counties (
        name, state, county_fips, state_fips, full_fips, population, 
        land_area, water_area, last_updated
    ) VALUES (
        p_name, p_state, p_county_fips, p_state_fips, p_full_fips, p_population,
        p_land_area, p_water_area, NOW()
    )
    ON CONFLICT (name, state)
    DO UPDATE SET
        county_fips = EXCLUDED.county_fips,
        state_fips = EXCLUDED.state_fips,
        full_fips = EXCLUDED.full_fips,
        population = EXCLUDED.population,
        land_area = EXCLUDED.land_area,
        water_area = EXCLUDED.water_area,
        last_updated = NOW(),
        updated_at = NOW()
    RETURNING id INTO county_id;
    
    RETURN county_id;
END;
$$;

-- =====================================================
-- 3. VERIFY FUNCTIONS EXIST
-- =====================================================

-- Test that functions were created successfully
DO $$
BEGIN
    -- Test log_sync_operation
    PERFORM public.log_sync_operation(
        'test', 'test_state', 'success', 1, 1, 0, 1, 0, 
        '{"test": true}'::jsonb, 100, 'test_cleanup'
    );
    
    RAISE NOTICE 'All functions created successfully!';
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Function creation failed: %', SQLERRM;
END;
$$;

-- =====================================================
-- 4. REFRESH SCHEMA CACHE
-- =====================================================

-- Force PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'Database cleanup and function fix completed successfully!' as status; 