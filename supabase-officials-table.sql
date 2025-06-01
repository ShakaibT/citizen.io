-- Create the officials table for storing real-time political officials data
CREATE TABLE officials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  office TEXT NOT NULL,
  party TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  photo_url TEXT,
  address TEXT,
  state TEXT NOT NULL,
  district TEXT,
  level TEXT NOT NULL CHECK (level IN ('federal', 'state', 'local')),
  office_type TEXT NOT NULL CHECK (office_type IN ('executive', 'legislative', 'judicial')),
  term_start TEXT,
  term_end TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source TEXT NOT NULL CHECK (source IN ('google_civic', 'ballotpedia', 'manual')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX idx_officials_state ON officials(state);
CREATE INDEX idx_officials_level ON officials(level);
CREATE INDEX idx_officials_office_type ON officials(office_type);
CREATE INDEX idx_officials_last_updated ON officials(last_updated);

-- Enable Row Level Security
ALTER TABLE officials ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Public read access" ON officials
  FOR SELECT USING (true);

-- Create policy for service role write access
CREATE POLICY "Service role write access" ON officials
  FOR ALL USING (auth.role() = 'service_role');

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_officials_updated_at 
  BEFORE UPDATE ON officials 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column(); 