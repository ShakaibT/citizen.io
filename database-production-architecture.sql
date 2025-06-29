-- =====================================================
-- PRODUCTION DATABASE ARCHITECTURE FOR CITIZEN ENGAGEMENT APP
-- Fixed version that resolves all function conflicts and parameter mismatches
-- =====================================================

-- Drop all existing functions and tables to start fresh
DROP FUNCTION IF EXISTS upsert_official CASCADE;
DROP FUNCTION IF EXISTS upsert_county CASCADE;
DROP FUNCTION IF EXISTS log_sync_operation CASCADE;
DROP FUNCTION IF EXISTS get_officials_with_fallback CASCADE;
DROP FUNCTION IF EXISTS get_counties_with_fallback CASCADE;

DROP TABLE IF EXISTS officials CASCADE;
DROP TABLE IF EXISTS counties CASCADE;
DROP TABLE IF EXISTS fallback_officials CASCADE;
DROP TABLE IF EXISTS fallback_counties CASCADE;
DROP TABLE IF EXISTS data_sync_logs CASCADE;

-- =====================================================
-- 1. MAIN DATA TABLES
-- =====================================================

-- Officials table (live data from Congress.gov API)
CREATE TABLE public.officials (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    office TEXT NOT NULL,
    party TEXT,
    state TEXT NOT NULL,
    state_abbreviation TEXT,
    bioguide_id TEXT UNIQUE,
    district TEXT,
    level TEXT DEFAULT 'federal',
    office_type TEXT DEFAULT 'legislative',
    source TEXT DEFAULT 'congress_api',
    phone TEXT,
    email TEXT,
    website TEXT,
    image_url TEXT,
    congress_url TEXT,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    data_source TEXT DEFAULT 'congress_api',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Counties table (live data from Census API)
CREATE TABLE public.counties (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    state TEXT NOT NULL,
    state_abbreviation TEXT,
    county_fips TEXT,
    state_fips TEXT,
    full_fips TEXT,
    population BIGINT,
    land_area DECIMAL,
    water_area DECIMAL,
    density DECIMAL,
    median_income INTEGER,
    county_seat TEXT,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    data_source TEXT DEFAULT 'census_api',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. FALLBACK DATA TABLES
-- =====================================================

-- Fallback officials (reliable backup data)
CREATE TABLE public.fallback_officials (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    office TEXT NOT NULL,
    party TEXT,
    state TEXT NOT NULL,
    state_abbreviation TEXT,
    priority INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fallback counties (reliable backup data)
CREATE TABLE public.fallback_counties (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    state TEXT NOT NULL,
    state_abbreviation TEXT,
    population BIGINT,
    priority INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. MONITORING TABLE
-- =====================================================

-- Data sync logs (tracks all operations)
CREATE TABLE public.data_sync_logs (
    id BIGSERIAL PRIMARY KEY,
    sync_date DATE NOT NULL DEFAULT CURRENT_DATE,
    sync_type TEXT NOT NULL, -- 'officials', 'counties', 'full_sync'
    state TEXT,
    status TEXT NOT NULL, -- 'success', 'partial', 'failed'
    records_processed BIGINT DEFAULT 0,
    records_updated BIGINT DEFAULT 0,
    records_failed BIGINT DEFAULT 0,
    api_calls_made BIGINT DEFAULT 0,
    api_errors BIGINT DEFAULT 0,
    error_details JSONB,
    execution_time_seconds BIGINT,
    data_source TEXT, -- 'congress_api', 'census_api', 'fallback'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. INDEXES FOR PERFORMANCE
-- =====================================================

-- Officials indexes
CREATE INDEX idx_officials_state ON public.officials(state);
CREATE INDEX idx_officials_state_abbr ON public.officials(state_abbreviation);
CREATE INDEX idx_officials_bioguide_id ON public.officials(bioguide_id);
CREATE INDEX idx_officials_office ON public.officials(office);
CREATE INDEX idx_officials_active ON public.officials(is_active);
CREATE INDEX idx_officials_updated ON public.officials(last_updated);

-- Counties indexes
CREATE INDEX idx_counties_state ON public.counties(state);
CREATE INDEX idx_counties_state_abbr ON public.counties(state_abbreviation);
CREATE INDEX idx_counties_fips ON public.counties(county_fips, state_fips);
CREATE INDEX idx_counties_full_fips ON public.counties(full_fips);
CREATE INDEX idx_counties_updated ON public.counties(last_updated);

-- Fallback indexes
CREATE INDEX idx_fallback_officials_state ON public.fallback_officials(state);
CREATE INDEX idx_fallback_officials_priority ON public.fallback_officials(priority DESC);
CREATE INDEX idx_fallback_counties_state ON public.fallback_counties(state);

-- Sync logs indexes
CREATE INDEX idx_sync_logs_date ON public.data_sync_logs(sync_date);
CREATE INDEX idx_sync_logs_type ON public.data_sync_logs(sync_type);
CREATE INDEX idx_sync_logs_status ON public.data_sync_logs(status);
CREATE INDEX idx_sync_logs_state ON public.data_sync_logs(state);

-- =====================================================
-- 5. UNIQUE CONSTRAINTS
-- =====================================================

-- Prevent duplicate officials
CREATE UNIQUE INDEX idx_officials_unique ON public.officials(name, state, office) WHERE is_active = true;

-- Prevent duplicate counties
CREATE UNIQUE INDEX idx_counties_unique ON public.counties(name, state);
CREATE UNIQUE INDEX idx_counties_fips_unique ON public.counties(full_fips);

-- Prevent duplicate fallback data
CREATE UNIQUE INDEX idx_fallback_officials_unique ON public.fallback_officials(name, state, office);
CREATE UNIQUE INDEX idx_fallback_counties_unique ON public.fallback_counties(name, state);

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Function to get officials with automatic fallback
CREATE OR REPLACE FUNCTION get_officials_with_fallback(state_name TEXT)
RETURNS TABLE (
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
    last_updated TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- First try to get live data
    RETURN QUERY
    SELECT o.id, o.name, o.office, o.party, o.state, o.state_abbreviation, 
           o.bioguide_id, o.district, o.phone, o.email, o.website, 
           o.image_url, o.congress_url, o.data_source, o.last_updated
    FROM officials o
    WHERE o.state ILIKE state_name 
       OR o.state_abbreviation ILIKE state_name
       AND o.is_active = true
    ORDER BY o.office, o.name;
    
    -- If no live data found, use fallback
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT f.id, f.name, f.office, f.party, f.state, f.state_abbreviation,
               NULL::TEXT as bioguide_id, NULL::TEXT as district, 
               NULL::TEXT as phone, NULL::TEXT as email, NULL::TEXT as website,
               NULL::TEXT as image_url, NULL::TEXT as congress_url,
               'fallback'::TEXT as data_source, f.created_at as last_updated
        FROM fallback_officials f
        WHERE f.state ILIKE state_name 
           OR f.state_abbreviation ILIKE state_name
        ORDER BY f.priority, f.office, f.name;
    END IF;
END;
$$;

-- Function to get counties with automatic fallback
CREATE OR REPLACE FUNCTION get_counties_with_fallback(state_name TEXT)
RETURNS TABLE (
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
    density DECIMAL,
    median_income INTEGER,
    county_seat TEXT,
    data_source TEXT,
    last_updated TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- First try to get live data
    RETURN QUERY
    SELECT c.id, c.name, c.state, c.state_abbreviation, c.county_fips, 
           c.state_fips, c.full_fips, c.population, c.land_area, c.water_area,
           c.density, c.median_income, c.county_seat, c.data_source, c.last_updated
    FROM counties c
    WHERE c.state ILIKE state_name 
       OR c.state_abbreviation ILIKE state_name
    ORDER BY c.population DESC NULLS LAST, c.name;
    
    -- If no live data found, use fallback
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT f.id, f.name, f.state, f.state_abbreviation,
               NULL::TEXT as county_fips, NULL::TEXT as state_fips, NULL::TEXT as full_fips,
               f.population, NULL::DECIMAL as land_area, NULL::DECIMAL as water_area,
               NULL::DECIMAL as density, NULL::INTEGER as median_income, NULL::TEXT as county_seat,
               'fallback'::TEXT as data_source, f.created_at as last_updated
        FROM fallback_counties f
        WHERE f.state ILIKE state_name 
           OR f.state_abbreviation ILIKE state_name
        ORDER BY f.priority, f.population DESC NULLS LAST, f.name;
    END IF;
END;
$$;

-- =====================================================
-- 7. UPSERT FUNCTIONS (MATCHING API EXPECTATIONS)
-- =====================================================

-- Function to log sync operations
CREATE OR REPLACE FUNCTION log_sync_operation(
    p_sync_type TEXT,
    p_state TEXT,
    p_status TEXT,
    p_records_processed BIGINT DEFAULT 0,
    p_records_updated BIGINT DEFAULT 0,
    p_records_failed BIGINT DEFAULT 0,
    p_api_calls BIGINT DEFAULT 0,
    p_api_errors BIGINT DEFAULT 0,
    p_error_details JSONB DEFAULT NULL,
    p_execution_time BIGINT DEFAULT 0,
    p_data_source TEXT DEFAULT 'mixed'
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    log_id BIGINT;
BEGIN
    INSERT INTO data_sync_logs (
        sync_type, state, status, records_processed, records_updated, 
        records_failed, api_calls_made, api_errors, error_details, 
        execution_time_seconds, data_source
    ) VALUES (
        p_sync_type, p_state, p_status, p_records_processed, p_records_updated,
        p_records_failed, p_api_calls, p_api_errors, p_error_details,
        p_execution_time, p_data_source
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;

-- Function to upsert officials (matching API call parameters)
CREATE OR REPLACE FUNCTION upsert_official(
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
    INSERT INTO officials (
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

-- Function to upsert counties (matching API call parameters)
CREATE OR REPLACE FUNCTION upsert_county(
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
    INSERT INTO counties (
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
-- 8. INITIAL FALLBACK DATA
-- =====================================================

-- Insert fallback officials for all 50 states
INSERT INTO fallback_officials (name, office, party, state, state_abbreviation, priority) VALUES
('Joe Biden', 'President', 'Democratic', 'United States', 'US', 1),
('Kamala Harris', 'Vice President', 'Democratic', 'United States', 'US', 1),
('Kay Ivey', 'Governor', 'Republican', 'Alabama', 'AL', 1),
('Tommy Tuberville', 'Senator', 'Republican', 'Alabama', 'AL', 2),
('Katie Britt', 'Senator', 'Republican', 'Alabama', 'AL', 3),
('Mike Dunleavy', 'Governor', 'Republican', 'Alaska', 'AK', 1),
('Lisa Murkowski', 'Senator', 'Republican', 'Alaska', 'AK', 2),
('Dan Sullivan', 'Senator', 'Republican', 'Alaska', 'AK', 3),
('Katie Hobbs', 'Governor', 'Democratic', 'Arizona', 'AZ', 1),
('Kyrsten Sinema', 'Senator', 'Independent', 'Arizona', 'AZ', 2),
('Mark Kelly', 'Senator', 'Democratic', 'Arizona', 'AZ', 3),
('Sarah Huckabee Sanders', 'Governor', 'Republican', 'Arkansas', 'AR', 1),
('John Boozman', 'Senator', 'Republican', 'Arkansas', 'AR', 2),
('Tom Cotton', 'Senator', 'Republican', 'Arkansas', 'AR', 3),
('Gavin Newsom', 'Governor', 'Democratic', 'California', 'CA', 1),
('Dianne Feinstein', 'Senator', 'Democratic', 'California', 'CA', 2),
('Alex Padilla', 'Senator', 'Democratic', 'California', 'CA', 3),
('Jared Polis', 'Governor', 'Democratic', 'Colorado', 'CO', 1),
('John Hickenlooper', 'Senator', 'Democratic', 'Colorado', 'CO', 2),
('Michael Bennet', 'Senator', 'Democratic', 'Colorado', 'CO', 3),
('Ned Lamont', 'Governor', 'Democratic', 'Connecticut', 'CT', 1),
('Richard Blumenthal', 'Senator', 'Democratic', 'Connecticut', 'CT', 2),
('Chris Murphy', 'Senator', 'Democratic', 'Connecticut', 'CT', 3),
('John Carney', 'Governor', 'Democratic', 'Delaware', 'DE', 1),
('Tom Carper', 'Senator', 'Democratic', 'Delaware', 'DE', 2),
('Chris Coons', 'Senator', 'Democratic', 'Delaware', 'DE', 3),
('Ron DeSantis', 'Governor', 'Republican', 'Florida', 'FL', 1),
('Marco Rubio', 'Senator', 'Republican', 'Florida', 'FL', 2),
('Rick Scott', 'Senator', 'Republican', 'Florida', 'FL', 3),
('Brian Kemp', 'Governor', 'Republican', 'Georgia', 'GA', 1),
('Jon Ossoff', 'Senator', 'Democratic', 'Georgia', 'GA', 2),
('Raphael Warnock', 'Senator', 'Democratic', 'Georgia', 'GA', 3),
('Josh Green', 'Governor', 'Democratic', 'Hawaii', 'HI', 1),
('Brian Schatz', 'Senator', 'Democratic', 'Hawaii', 'HI', 2),
('Mazie Hirono', 'Senator', 'Democratic', 'Hawaii', 'HI', 3),
('Brad Little', 'Governor', 'Republican', 'Idaho', 'ID', 1),
('Mike Crapo', 'Senator', 'Republican', 'Idaho', 'ID', 2),
('Jim Risch', 'Senator', 'Republican', 'Idaho', 'ID', 3),
('J.B. Pritzker', 'Governor', 'Democratic', 'Illinois', 'IL', 1),
('Dick Durbin', 'Senator', 'Democratic', 'Illinois', 'IL', 2),
('Tammy Duckworth', 'Senator', 'Democratic', 'Illinois', 'IL', 3),
('Eric Holcomb', 'Governor', 'Republican', 'Indiana', 'IN', 1),
('Todd Young', 'Senator', 'Republican', 'Indiana', 'IN', 2),
('Mike Braun', 'Senator', 'Republican', 'Indiana', 'IN', 3),
('Kim Reynolds', 'Governor', 'Republican', 'Iowa', 'IA', 1),
('Chuck Grassley', 'Senator', 'Republican', 'Iowa', 'IA', 2),
('Joni Ernst', 'Senator', 'Republican', 'Iowa', 'IA', 3),
('Laura Kelly', 'Governor', 'Democratic', 'Kansas', 'KS', 1),
('Jerry Moran', 'Senator', 'Republican', 'Kansas', 'KS', 2),
('Roger Marshall', 'Senator', 'Republican', 'Kansas', 'KS', 3),
('Andy Beshear', 'Governor', 'Democratic', 'Kentucky', 'KY', 1),
('Mitch McConnell', 'Senator', 'Republican', 'Kentucky', 'KY', 2),
('Rand Paul', 'Senator', 'Republican', 'Kentucky', 'KY', 3),
('John Bel Edwards', 'Governor', 'Democratic', 'Louisiana', 'LA', 1),
('Bill Cassidy', 'Senator', 'Republican', 'Louisiana', 'LA', 2),
('John Kennedy', 'Senator', 'Republican', 'Louisiana', 'LA', 3),
('Janet Mills', 'Governor', 'Democratic', 'Maine', 'ME', 1),
('Susan Collins', 'Senator', 'Republican', 'Maine', 'ME', 2),
('Angus King', 'Senator', 'Independent', 'Maine', 'ME', 3),
('Wes Moore', 'Governor', 'Democratic', 'Maryland', 'MD', 1),
('Ben Cardin', 'Senator', 'Democratic', 'Maryland', 'MD', 2),
('Chris Van Hollen', 'Senator', 'Democratic', 'Maryland', 'MD', 3),
('Maura Healey', 'Governor', 'Democratic', 'Massachusetts', 'MA', 1),
('Elizabeth Warren', 'Senator', 'Democratic', 'Massachusetts', 'MA', 2),
('Ed Markey', 'Senator', 'Democratic', 'Massachusetts', 'MA', 3),
('Gretchen Whitmer', 'Governor', 'Democratic', 'Michigan', 'MI', 1),
('Debbie Stabenow', 'Senator', 'Democratic', 'Michigan', 'MI', 2),
('Gary Peters', 'Senator', 'Democratic', 'Michigan', 'MI', 3),
('Tim Walz', 'Governor', 'Democratic', 'Minnesota', 'MN', 1),
('Amy Klobuchar', 'Senator', 'Democratic', 'Minnesota', 'MN', 2),
('Tina Smith', 'Senator', 'Democratic', 'Minnesota', 'MN', 3),
('Tate Reeves', 'Governor', 'Republican', 'Mississippi', 'MS', 1),
('Roger Wicker', 'Senator', 'Republican', 'Mississippi', 'MS', 2),
('Cindy Hyde-Smith', 'Senator', 'Republican', 'Mississippi', 'MS', 3),
('Mike Parson', 'Governor', 'Republican', 'Missouri', 'MO', 1),
('Josh Hawley', 'Senator', 'Republican', 'Missouri', 'MO', 2),
('Eric Schmitt', 'Senator', 'Republican', 'Missouri', 'MO', 3),
('Greg Gianforte', 'Governor', 'Republican', 'Montana', 'MT', 1),
('Jon Tester', 'Senator', 'Democratic', 'Montana', 'MT', 2),
('Steve Daines', 'Senator', 'Republican', 'Montana', 'MT', 3),
('Pete Ricketts', 'Governor', 'Republican', 'Nebraska', 'NE', 1),
('Deb Fischer', 'Senator', 'Republican', 'Nebraska', 'NE', 2),
('Ben Sasse', 'Senator', 'Republican', 'Nebraska', 'NE', 3),
('Joe Lombardo', 'Governor', 'Republican', 'Nevada', 'NV', 1),
('Catherine Cortez Masto', 'Senator', 'Democratic', 'Nevada', 'NV', 2),
('Jacky Rosen', 'Senator', 'Democratic', 'Nevada', 'NV', 3),
('Chris Sununu', 'Governor', 'Republican', 'New Hampshire', 'NH', 1),
('Jeanne Shaheen', 'Senator', 'Democratic', 'New Hampshire', 'NH', 2),
('Maggie Hassan', 'Senator', 'Democratic', 'New Hampshire', 'NH', 3),
('Phil Murphy', 'Governor', 'Democratic', 'New Jersey', 'NJ', 1),
('Bob Menendez', 'Senator', 'Democratic', 'New Jersey', 'NJ', 2),
('Cory Booker', 'Senator', 'Democratic', 'New Jersey', 'NJ', 3),
('Michelle Lujan Grisham', 'Governor', 'Democratic', 'New Mexico', 'NM', 1),
('Martin Heinrich', 'Senator', 'Democratic', 'New Mexico', 'NM', 2),
('Ben Ray Luján', 'Senator', 'Democratic', 'New Mexico', 'NM', 3),
('Kathy Hochul', 'Governor', 'Democratic', 'New York', 'NY', 1),
('Chuck Schumer', 'Senator', 'Democratic', 'New York', 'NY', 2),
('Kirsten Gillibrand', 'Senator', 'Democratic', 'New York', 'NY', 3),
('Roy Cooper', 'Governor', 'Democratic', 'North Carolina', 'NC', 1),
('Richard Burr', 'Senator', 'Republican', 'North Carolina', 'NC', 2),
('Thom Tillis', 'Senator', 'Republican', 'North Carolina', 'NC', 3),
('Doug Burgum', 'Governor', 'Republican', 'North Dakota', 'ND', 1),
('John Hoeven', 'Senator', 'Republican', 'North Dakota', 'ND', 2),
('Kevin Cramer', 'Senator', 'Republican', 'North Dakota', 'ND', 3),
('Mike DeWine', 'Governor', 'Republican', 'Ohio', 'OH', 1),
('Sherrod Brown', 'Senator', 'Democratic', 'Ohio', 'OH', 2),
('J.D. Vance', 'Senator', 'Republican', 'Ohio', 'OH', 3),
('Kevin Stitt', 'Governor', 'Republican', 'Oklahoma', 'OK', 1),
('James Lankford', 'Senator', 'Republican', 'Oklahoma', 'OK', 2),
('Markwayne Mullin', 'Senator', 'Republican', 'Oklahoma', 'OK', 3),
('Tina Kotek', 'Governor', 'Democratic', 'Oregon', 'OR', 1),
('Ron Wyden', 'Senator', 'Democratic', 'Oregon', 'OR', 2),
('Jeff Merkley', 'Senator', 'Democratic', 'Oregon', 'OR', 3),
('Josh Shapiro', 'Governor', 'Democratic', 'Pennsylvania', 'PA', 1),
('Bob Casey Jr.', 'Senator', 'Democratic', 'Pennsylvania', 'PA', 2),
('John Fetterman', 'Senator', 'Democratic', 'Pennsylvania', 'PA', 3),
('Dan McKee', 'Governor', 'Democratic', 'Rhode Island', 'RI', 1),
('Jack Reed', 'Senator', 'Democratic', 'Rhode Island', 'RI', 2),
('Sheldon Whitehouse', 'Senator', 'Democratic', 'Rhode Island', 'RI', 3),
('Henry McMaster', 'Governor', 'Republican', 'South Carolina', 'SC', 1),
('Lindsey Graham', 'Senator', 'Republican', 'South Carolina', 'SC', 2),
('Tim Scott', 'Senator', 'Republican', 'South Carolina', 'SC', 3),
('Kristi Noem', 'Governor', 'Republican', 'South Dakota', 'SD', 1),
('John Thune', 'Senator', 'Republican', 'South Dakota', 'SD', 2),
('Mike Rounds', 'Senator', 'Republican', 'South Dakota', 'SD', 3),
('Bill Lee', 'Governor', 'Republican', 'Tennessee', 'TN', 1),
('Marsha Blackburn', 'Senator', 'Republican', 'Tennessee', 'TN', 2),
('Bill Hagerty', 'Senator', 'Republican', 'Tennessee', 'TN', 3),
('Greg Abbott', 'Governor', 'Republican', 'Texas', 'TX', 1),
('John Cornyn', 'Senator', 'Republican', 'Texas', 'TX', 2),
('Ted Cruz', 'Senator', 'Republican', 'Texas', 'TX', 3),
('Spencer Cox', 'Governor', 'Republican', 'Utah', 'UT', 1),
('Mike Lee', 'Senator', 'Republican', 'Utah', 'UT', 2),
('Mitt Romney', 'Senator', 'Republican', 'Utah', 'UT', 3),
('Phil Scott', 'Governor', 'Republican', 'Vermont', 'VT', 1),
('Bernie Sanders', 'Senator', 'Independent', 'Vermont', 'VT', 2),
('Peter Welch', 'Senator', 'Democratic', 'Vermont', 'VT', 3),
('Glenn Youngkin', 'Governor', 'Republican', 'Virginia', 'VA', 1),
('Mark Warner', 'Senator', 'Democratic', 'Virginia', 'VA', 2),
('Tim Kaine', 'Senator', 'Democratic', 'Virginia', 'VA', 3),
('Jay Inslee', 'Governor', 'Democratic', 'Washington', 'WA', 1),
('Patty Murray', 'Senator', 'Democratic', 'Washington', 'WA', 2),
('Maria Cantwell', 'Senator', 'Democratic', 'Washington', 'WA', 3),
('Jim Justice', 'Governor', 'Republican', 'West Virginia', 'WV', 1),
('Joe Manchin', 'Senator', 'Democratic', 'West Virginia', 'WV', 2),
('Shelley Moore Capito', 'Senator', 'Republican', 'West Virginia', 'WV', 3),
('Tony Evers', 'Governor', 'Democratic', 'Wisconsin', 'WI', 1),
('Ron Johnson', 'Senator', 'Republican', 'Wisconsin', 'WI', 2),
('Tammy Baldwin', 'Senator', 'Democratic', 'Wisconsin', 'WI', 3),
('Mark Gordon', 'Governor', 'Republican', 'Wyoming', 'WY', 1),
('John Barrasso', 'Senator', 'Republican', 'Wyoming', 'WY', 2),
('Cynthia Lummis', 'Senator', 'Republican', 'Wyoming', 'WY', 3)
ON CONFLICT (name, state, office) DO UPDATE SET
    party = EXCLUDED.party,
    state_abbreviation = EXCLUDED.state_abbreviation,
    priority = EXCLUDED.priority;

-- Insert fallback counties for major population centers
INSERT INTO fallback_counties (name, state, state_abbreviation, population, priority) VALUES
('Jefferson', 'Alabama', 'AL', 674721, 1),
('Mobile', 'Alabama', 'AL', 414809, 2),
('Madison', 'Alabama', 'AL', 395867, 3),
('Anchorage', 'Alaska', 'AK', 291247, 1),
('Fairbanks North Star', 'Alaska', 'AK', 95655, 2),
('Matanuska-Susitna', 'Alaska', 'AK', 107081, 3),
('Maricopa', 'Arizona', 'AZ', 4420568, 1),
('Pima', 'Arizona', 'AZ', 1043433, 2),
('Pinal', 'Arizona', 'AZ', 425264, 3),
('Pulaski', 'Arkansas', 'AR', 399125, 1),
('Washington', 'Arkansas', 'AR', 245871, 2),
('Benton', 'Arkansas', 'AR', 284333, 3),
('Los Angeles', 'California', 'CA', 10014009, 1),
('San Diego', 'California', 'CA', 3298634, 2),
('Orange', 'California', 'CA', 3186989, 3),
('Denver', 'Colorado', 'CO', 715522, 1),
('Jefferson', 'Colorado', 'CO', 582910, 2),
('Arapahoe', 'Colorado', 'CO', 655070, 3),
('Fairfield', 'Connecticut', 'CT', 957419, 1),
('Hartford', 'Connecticut', 'CT', 899498, 2),
('New Haven', 'Connecticut', 'CT', 864835, 3),
('New Castle', 'Delaware', 'DE', 570719, 1),
('Kent', 'Delaware', 'DE', 181851, 2),
('Sussex', 'Delaware', 'DE', 237378, 3),
('Miami-Dade', 'Florida', 'FL', 2701767, 1),
('Broward', 'Florida', 'FL', 1944375, 2),
('Palm Beach', 'Florida', 'FL', 1492191, 3),
('Fulton', 'Georgia', 'GA', 1066710, 1),
('Gwinnett', 'Georgia', 'GA', 957062, 2),
('Cobb', 'Georgia', 'GA', 766149, 3),
('Honolulu', 'Hawaii', 'HI', 1016508, 1),
('Hawaii', 'Hawaii', 'HI', 200629, 2),
('Maui', 'Hawaii', 'HI', 164754, 3),
('Ada', 'Idaho', 'ID', 494967, 1),
('Canyon', 'Idaho', 'ID', 231105, 2),
('Kootenai', 'Idaho', 'ID', 171362, 3),
('Cook', 'Illinois', 'IL', 5275541, 1),
('DuPage', 'Illinois', 'IL', 932877, 2),
('Lake', 'Illinois', 'IL', 714342, 3),
('Marion', 'Indiana', 'IN', 977203, 1),
('Lake', 'Indiana', 'IN', 498700, 2),
('Allen', 'Indiana', 'IN', 385410, 3),
('Polk', 'Iowa', 'IA', 492401, 1),
('Linn', 'Iowa', 'IA', 230299, 2),
('Scott', 'Iowa', 'IA', 174669, 3),
('Johnson', 'Kansas', 'KS', 609863, 1),
('Sedgwick', 'Kansas', 'KS', 523824, 2),
('Shawnee', 'Kansas', 'KS', 178909, 3),
('Jefferson', 'Kentucky', 'KY', 782969, 1),
('Fayette', 'Kentucky', 'KY', 322570, 2),
('Kenton', 'Kentucky', 'KY', 169064, 3),
('East Baton Rouge', 'Louisiana', 'LA', 456781, 1),
('Jefferson', 'Louisiana', 'LA', 440781, 2),
('Orleans', 'Louisiana', 'LA', 383997, 3),
('Cumberland', 'Maine', 'ME', 303069, 1),
('York', 'Maine', 'ME', 211972, 2),
('Penobscot', 'Maine', 'ME', 152199, 3),
('Montgomery', 'Maryland', 'MD', 1062061, 1),
('Prince Georges', 'Maryland', 'MD', 967201, 2),
('Baltimore', 'Maryland', 'MD', 854535, 3),
('Middlesex', 'Massachusetts', 'MA', 1632002, 1),
('Worcester', 'Massachusetts', 'MA', 862111, 2),
('Norfolk', 'Massachusetts', 'MA', 725981, 3),
('Wayne', 'Michigan', 'MI', 1793561, 1),
('Oakland', 'Michigan', 'MI', 1274395, 2),
('Macomb', 'Michigan', 'MI', 881217, 3),
('Hennepin', 'Minnesota', 'MN', 1281565, 1),
('Ramsey', 'Minnesota', 'MN', 552352, 2),
('Dakota', 'Minnesota', 'MN', 439882, 3),
('Hinds', 'Mississippi', 'MS', 594733, 1),
('Harrison', 'Mississippi', 'MS', 208621, 2),
('DeSoto', 'Mississippi', 'MS', 185314, 3),
('St. Louis', 'Missouri', 'MO', 1004367, 1),
('Jackson', 'Missouri', 'MO', 717204, 2),
('St. Charles', 'Missouri', 'MO', 405262, 3),
('Yellowstone', 'Montana', 'MT', 164731, 1),
('Missoula', 'Montana', 'MT', 119600, 2),
('Gallatin', 'Montana', 'MT', 118960, 3),
('Douglas', 'Nebraska', 'NE', 584526, 1),
('Lancaster', 'Nebraska', 'NE', 322608, 2),
('Sarpy', 'Nebraska', 'NE', 190604, 3),
('Clark', 'Nevada', 'NV', 2265461, 1),
('Washoe', 'Nevada', 'NV', 486492, 2),
('Carson City', 'Nevada', 'NV', 58639, 3),
('Hillsborough', 'New Hampshire', 'NH', 422937, 1),
('Rockingham', 'New Hampshire', 'NH', 314176, 2),
('Merrimack', 'New Hampshire', 'NH', 153808, 3),
('Bergen', 'New Jersey', 'NJ', 955732, 1),
('Middlesex', 'New Jersey', 'NJ', 863162, 2),
('Essex', 'New Jersey', 'NJ', 863728, 3),
('Bernalillo', 'New Mexico', 'NM', 679121, 1),
('Dona Ana', 'New Mexico', 'NM', 219561, 2),
('Santa Fe', 'New Mexico', 'NM', 154823, 3),
('Kings', 'New York', 'NY', 2736074, 1),
('Queens', 'New York', 'NY', 2405464, 2),
('New York', 'New York', 'NY', 1694251, 3),
('Mecklenburg', 'North Carolina', 'NC', 1115482, 1),
('Wake', 'North Carolina', 'NC', 1129410, 2),
('Guilford', 'North Carolina', 'NC', 541299, 3),
('Cass', 'North Dakota', 'ND', 184525, 1),
('Burleigh', 'North Dakota', 'ND', 98458, 2),
('Grand Forks', 'North Dakota', 'ND', 73181, 3),
('Cuyahoga', 'Ohio', 'OH', 1264817, 1),
('Franklin', 'Ohio', 'OH', 1323807, 2),
('Hamilton', 'Ohio', 'OH', 830639, 3),
('Oklahoma', 'Oklahoma', 'OK', 695662, 1),
('Tulsa', 'Oklahoma', 'OK', 669279, 2),
('Cleveland', 'Oklahoma', 'OK', 295528, 3),
('Multnomah', 'Oregon', 'OR', 815428, 1),
('Washington', 'Oregon', 'OR', 600372, 2),
('Clackamas', 'Oregon', 'OR', 421401, 3),
('Philadelphia', 'Pennsylvania', 'PA', 1603797, 1),
('Allegheny', 'Pennsylvania', 'PA', 1250578, 2),
('Montgomery', 'Pennsylvania', 'PA', 856553, 3),
('Providence', 'Rhode Island', 'RI', 660741, 1),
('Kent', 'Rhode Island', 'RI', 170363, 2),
('Washington', 'Rhode Island', 'RI', 126979, 3),
('Greenville', 'South Carolina', 'SC', 525534, 1),
('Richland', 'South Carolina', 'SC', 416147, 2),
('Charleston', 'South Carolina', 'SC', 408235, 3),
('Minnehaha', 'South Dakota', 'SD', 197214, 1),
('Pennington', 'South Dakota', 'SD', 109222, 2),
('Lincoln', 'South Dakota', 'SD', 65161, 3),
('Davidson', 'Tennessee', 'TN', 715884, 1),
('Shelby', 'Tennessee', 'TN', 929744, 2),
('Knox', 'Tennessee', 'TN', 478971, 3),
('Harris', 'Texas', 'TX', 4731145, 1),
('Dallas', 'Texas', 'TX', 2613539, 2),
('Tarrant', 'Texas', 'TX', 2110640, 3),
('Salt Lake', 'Utah', 'UT', 1185238, 1),
('Utah', 'Utah', 'UT', 665665, 2),
('Davis', 'Utah', 'UT', 362679, 3),
('Chittenden', 'Vermont', 'VT', 168323, 1),
('Rutland', 'Vermont', 'VT', 60572, 2),
('Washington', 'Vermont', 'VT', 59807, 3),
('Fairfax', 'Virginia', 'VA', 1150309, 1),
('Virginia Beach', 'Virginia', 'VA', 459470, 2),
('Norfolk', 'Virginia', 'VA', 238005, 3),
('King', 'Washington', 'WA', 2269675, 1),
('Pierce', 'Washington', 'WA', 921130, 2),
('Snohomish', 'Washington', 'WA', 827957, 3),
('Kanawha', 'West Virginia', 'WV', 180745, 1),
('Berkeley', 'West Virginia', 'WV', 122076, 2),
('Jefferson', 'West Virginia', 'WV', 57701, 3),
('Milwaukee', 'Wisconsin', 'WI', 939489, 1),
('Dane', 'Wisconsin', 'WI', 561504, 2),
('Waukesha', 'Wisconsin', 'WI', 406978, 3),
('Laramie', 'Wyoming', 'WY', 100512, 1),
('Natrona', 'Wyoming', 'WY', 79955, 2),
('Campbell', 'Wyoming', 'WY', 47026, 3)
ON CONFLICT (name, state) DO UPDATE SET
    population = EXCLUDED.population,
    priority = EXCLUDED.priority;

-- Log initial setup
SELECT log_sync_operation(
    'initial_setup',
    NULL,
    'success',
    (SELECT COUNT(*) FROM fallback_officials) + (SELECT COUNT(*) FROM fallback_counties),
    (SELECT COUNT(*) FROM fallback_officials) + (SELECT COUNT(*) FROM fallback_counties),
    0,
    0,
    0,
    '{"message": "Initial fallback data loaded"}'::jsonb,
    0,
    'manual_setup'
); 