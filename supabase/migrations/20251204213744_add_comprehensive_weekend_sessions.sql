/*
  # Add Comprehensive Weekend Sessions for All Age Groups
  
  1. Changes
    - Add Sunday morning sessions for all age groups
    - Add Saturday morning sessions where missing
    - Ensure every program (Mini, Junior, Premier, Teen) has weekend options
    
  2. Coverage
    - Ages 2-4: Mini Soccer weekend sessions
    - Ages 4-7: Junior Soccer weekend sessions  
    - Ages 7-11: Premier Soccer weekend sessions (complete with Sunday)
    - Ages 10-15: Teen Soccer weekend sessions (already added)
*/

-- Get program and location IDs first
DO $$
DECLARE
  mini_program_id UUID;
  junior_program_id UUID;
  premier_program_id UUID;
  location_id UUID;
  coach_id UUID;
BEGIN
  -- Get program IDs
  SELECT id INTO mini_program_id FROM programs WHERE name = 'Mini Soccer' LIMIT 1;
  SELECT id INTO junior_program_id FROM programs WHERE name = 'Junior Soccer' LIMIT 1;
  SELECT id INTO premier_program_id FROM programs WHERE name = 'Premier Soccer' LIMIT 1;
  
  -- Get location and coach IDs
  SELECT id INTO location_id FROM locations LIMIT 1;
  SELECT id INTO coach_id FROM staff WHERE role = 'coach' LIMIT 1;

  -- Mini Soccer (ages 2-4) - Saturday morning
  INSERT INTO sessions (id, program_id, location_id, coach_id, start_date, day_of_week, start_time, capacity, enrolled_count, status)
  VALUES (
    '00000000-0000-0000-0000-000000000401',
    mini_program_id,
    location_id,
    coach_id,
    '2025-01-04',
    6, -- Saturday
    '09:00:00',
    12,
    3,
    'active'
  ) ON CONFLICT (id) DO NOTHING;

  -- Mini Soccer (ages 2-4) - Sunday morning
  INSERT INTO sessions (id, program_id, location_id, coach_id, start_date, day_of_week, start_time, capacity, enrolled_count, status)
  VALUES (
    '00000000-0000-0000-0000-000000000402',
    mini_program_id,
    location_id,
    coach_id,
    '2025-01-05',
    0, -- Sunday
    '09:00:00',
    12,
    5,
    'active'
  ) ON CONFLICT (id) DO NOTHING;

  -- Junior Soccer (ages 4-7) - Saturday morning
  INSERT INTO sessions (id, program_id, location_id, coach_id, start_date, day_of_week, start_time, capacity, enrolled_count, status)
  VALUES (
    '00000000-0000-0000-0000-000000000501',
    junior_program_id,
    location_id,
    coach_id,
    '2025-01-04',
    6, -- Saturday
    '09:30:00',
    14,
    6,
    'active'
  ) ON CONFLICT (id) DO NOTHING;

  -- Junior Soccer (ages 4-7) - Sunday morning
  INSERT INTO sessions (id, program_id, location_id, coach_id, start_date, day_of_week, start_time, capacity, enrolled_count, status)
  VALUES (
    '00000000-0000-0000-0000-000000000502',
    junior_program_id,
    location_id,
    coach_id,
    '2025-01-05',
    0, -- Sunday
    '09:30:00',
    14,
    4,
    'active'
  ) ON CONFLICT (id) DO NOTHING;

  -- Premier Soccer (ages 7-11) - Sunday morning (Saturday already exists)
  INSERT INTO sessions (id, program_id, location_id, coach_id, start_date, day_of_week, start_time, capacity, enrolled_count, status)
  VALUES (
    '00000000-0000-0000-0000-000000000604',
    premier_program_id,
    location_id,
    coach_id,
    '2025-01-05',
    0, -- Sunday
    '10:00:00',
    16,
    7,
    'active'
  ) ON CONFLICT (id) DO NOTHING;

END $$;
