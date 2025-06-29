-- Additional tables for the Interactive Officials Data Pipeline
-- Run this in your Supabase SQL editor to set up the required tables

-- Table to store checksums for tracking changes
CREATE TABLE IF NOT EXISTS official_checksums (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  official_id TEXT NOT NULL UNIQUE,
  last_checksum TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_official_checksums_official_id ON official_checksums(official_id);

-- Table to store change requests for review
CREATE TABLE IF NOT EXISTS change_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id TEXT NOT NULL,
  office_id UUID REFERENCES officials(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'applied')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Create indexes for change_requests
CREATE INDEX IF NOT EXISTS idx_change_requests_external_id ON change_requests(external_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_status ON change_requests(status);
CREATE INDEX IF NOT EXISTS idx_change_requests_created_at ON change_requests(created_at);

-- Enable Row Level Security
ALTER TABLE official_checksums ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for official_checksums
CREATE POLICY "Service role full access on official_checksums" ON official_checksums
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Public read access on official_checksums" ON official_checksums
  FOR SELECT USING (true);

-- Create policies for change_requests  
CREATE POLICY "Service role full access on change_requests" ON change_requests
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Public read access on change_requests" ON change_requests
  FOR SELECT USING (true);

-- Create function to update the updated_at timestamp for official_checksums
CREATE OR REPLACE FUNCTION update_official_checksums_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create function to update the updated_at timestamp for change_requests
CREATE OR REPLACE FUNCTION update_change_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_official_checksums_updated_at_trigger
  BEFORE UPDATE ON official_checksums 
  FOR EACH ROW 
  EXECUTE FUNCTION update_official_checksums_updated_at();

CREATE TRIGGER update_change_requests_updated_at_trigger
  BEFORE UPDATE ON change_requests 
  FOR EACH ROW 
  EXECUTE FUNCTION update_change_requests_updated_at(); 