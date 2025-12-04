/*
  # Add More Test Location Data

  1. Purpose
    - Add additional test locations with realistic addresses
    - Provide more variety for testing location detail modals
  
  2. Locations Added
    - Oakwood Recreation Center
    - Springfield Community Center  
    - Westside Sports Complex
    - East Park Athletic Fields
*/

-- Add more test locations
INSERT INTO locations (id, organization_id, name, address, capacity, amenities, created_at, updated_at)
VALUES 
  (
    '00000000-0000-0000-0000-000000000103',
    '00000000-0000-0000-0000-000000000001',
    'Oakwood Recreation Center',
    '789 Oak Street, Springfield, IL 62703',
    150,
    '{"parking": true, "indoor": true, "restrooms": true, "water_fountains": true}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000104',
    '00000000-0000-0000-0000-000000000001',
    'Springfield Community Center',
    '321 Main Street, Springfield, IL 62704',
    200,
    '{"parking": true, "indoor": true, "restrooms": true, "water_fountains": true, "air_conditioning": true}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000105',
    '00000000-0000-0000-0000-000000000001',
    'Westside Sports Complex',
    '555 West Ave, Springfield, IL 62705',
    300,
    '{"parking": true, "outdoor": true, "restrooms": true, "water_fountains": true, "concessions": true}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000106',
    '00000000-0000-0000-0000-000000000001',
    'East Park Athletic Fields',
    '888 East Boulevard, Springfield, IL 62706',
    250,
    '{"parking": true, "outdoor": true, "restrooms": true, "water_fountains": true, "bleachers": true}'::jsonb,
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;
