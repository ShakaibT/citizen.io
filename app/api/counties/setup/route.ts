import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET() {
  try {
    console.log('🔄 Setting up counties tables...')
    
    // Create county_representatives table
    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create county_representatives table to store the many-to-many relationship
        CREATE TABLE IF NOT EXISTS county_representatives (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          county_id UUID REFERENCES counties(id) ON DELETE CASCADE,
          official_id UUID REFERENCES officials(id) ON DELETE CASCADE,
          district TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(county_id, official_id)
        );

        -- Create indexes for fast queries
        CREATE INDEX IF NOT EXISTS idx_county_representatives_county_id ON county_representatives(county_id);
        CREATE INDEX IF NOT EXISTS idx_county_representatives_official_id ON county_representatives(official_id);

        -- Enable Row Level Security
        ALTER TABLE county_representatives ENABLE ROW LEVEL SECURITY;

        -- Create policies for public read access
        CREATE POLICY "Public read access on county_representatives" ON county_representatives
          FOR SELECT USING (true);

        -- Create policies for service role write access
        CREATE POLICY "Service role write access on county_representatives" ON county_representatives
          FOR ALL USING (auth.role() = 'service_role');
      `
    })
    
    if (tableError) {
      console.error('Error creating table:', tableError)
      // Try alternative approach
      const { error: altError } = await supabase
        .from('county_representatives')
        .select('id')
        .limit(1)
      
      if (altError && altError.message.includes('does not exist')) {
        return NextResponse.json({
          error: 'County representatives table needs to be created manually in Supabase',
          sql: `
            CREATE TABLE county_representatives (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              county_id UUID REFERENCES counties(id) ON DELETE CASCADE,
              official_id UUID REFERENCES officials(id) ON DELETE CASCADE,
              district TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              UNIQUE(county_id, official_id)
            );
            
            CREATE INDEX idx_county_representatives_county_id ON county_representatives(county_id);
            CREATE INDEX idx_county_representatives_official_id ON county_representatives(official_id);
            
            ALTER TABLE county_representatives ENABLE ROW LEVEL SECURITY;
            
            CREATE POLICY "Public read access on county_representatives" ON county_representatives
              FOR SELECT USING (true);
              
            CREATE POLICY "Service role write access on county_representatives" ON county_representatives
              FOR ALL USING (auth.role() = 'service_role');
          `
        }, { status: 500 })
      }
    }
    
    // Create the helper functions
    const { error: functionError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create function to link county with representative
        CREATE OR REPLACE FUNCTION link_county_representative(
          p_county_fips TEXT,
          p_official_bioguide_id TEXT,
          p_district TEXT DEFAULT NULL
        ) RETURNS BOOLEAN AS $$
        DECLARE
          county_uuid UUID;
          official_uuid UUID;
        BEGIN
          -- Find county by FIPS code
          SELECT id INTO county_uuid FROM counties WHERE full_fips = p_county_fips;
          
          -- Find official by bioguide_id
          SELECT id INTO official_uuid FROM officials WHERE bioguide_id = p_official_bioguide_id;
          
          -- If both exist, create the link
          IF county_uuid IS NOT NULL AND official_uuid IS NOT NULL THEN
            INSERT INTO county_representatives (county_id, official_id, district)
            VALUES (county_uuid, official_uuid, p_district)
            ON CONFLICT (county_id, official_id) 
            DO UPDATE SET district = p_district, created_at = NOW();
            
            RETURN TRUE;
          END IF;
          
          RETURN FALSE;
        END;
        $$ LANGUAGE plpgsql;
      `
    })
    
    if (functionError) {
      console.error('Error creating function:', functionError)
    }
    
    console.log('✅ Counties tables setup completed')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Counties tables setup completed successfully',
      tableError: tableError?.message || null,
      functionError: functionError?.message || null
    })
  } catch (error) {
    console.error('Error setting up counties tables:', error)
    return NextResponse.json(
      { error: 'Failed to setup counties tables' },
      { status: 500 }
    )
  }
} 