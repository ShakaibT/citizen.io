-- Cleanup script for Pennsylvania senators
-- Remove outdated and duplicate entries

-- Remove Bob Casey Jr. (no longer a senator as of 2025)
DELETE FROM officials 
WHERE bioguide_id = 'C001070' 
AND name = 'Bob Casey Jr.' 
AND state = 'PA';

-- Remove duplicate John Fetterman entry with incorrect bioguide_id
DELETE FROM officials 
WHERE bioguide_id = 'F000479' 
AND name = 'John Fetterman' 
AND state = 'PA';

-- Verify the remaining Pennsylvania senators
SELECT 
  name, 
  office, 
  party, 
  bioguide_id, 
  created_at, 
  last_updated 
FROM officials 
WHERE state = 'PA' 
AND office = 'U.S. Senator' 
ORDER BY name;

-- Expected result should show:
-- Dave McCormick (Republican, M001243)
-- John Fetterman (Democratic, F000482) 