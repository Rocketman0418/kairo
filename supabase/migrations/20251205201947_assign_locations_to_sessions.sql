/*
  # Assign Locations to Sessions

  ## Changes
  - Updates all sessions that don't have a location assigned
  - Distributes sessions across available locations evenly
  
  ## Important Notes
  - Ensures every session has a valid location for testing
  - Uses round-robin distribution across existing locations
*/

-- Assign locations to sessions that don't have one
DO $$
DECLARE
  session_record RECORD;
  location_ids UUID[];
  location_index INTEGER := 0;
  location_count INTEGER;
BEGIN
  -- Get all location IDs
  SELECT ARRAY_AGG(id) INTO location_ids FROM locations;
  location_count := array_length(location_ids, 1);
  
  -- Update sessions without locations
  FOR session_record IN 
    SELECT id FROM sessions WHERE location_id IS NULL
  LOOP
    -- Assign location using round-robin
    UPDATE sessions 
    SET location_id = location_ids[(location_index % location_count) + 1]
    WHERE id = session_record.id;
    
    location_index := location_index + 1;
  END LOOP;
  
  RAISE NOTICE 'Assigned locations to % sessions', location_index;
END $$;
