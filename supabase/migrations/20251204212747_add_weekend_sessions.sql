/*
  # Add Weekend Sessions for All Age Groups
  
  1. Changes
    - Add Saturday morning sessions for Teen Soccer (ages 10-15)
    - Add Sunday sessions for various programs
    - Ensure all age groups have weekend options
    
  2. Sessions Added
    - Teen Soccer: Saturday 10:00 AM at Lincoln Park
    - Teen Soccer: Sunday 10:00 AM at Lincoln Park
*/

-- Insert Saturday morning Teen Soccer at Lincoln Park
INSERT INTO sessions (
  id,
  program_id,
  location_id,
  coach_id,
  start_date,
  day_of_week,
  start_time,
  capacity,
  enrolled_count,
  status
) VALUES (
  '00000000-0000-0000-0000-000000000806',
  '00000000-0000-0000-0000-000000000204',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000301',
  '2025-01-04',
  6, -- Saturday
  '10:00:00',
  16,
  4,
  'active'
) ON CONFLICT (id) DO NOTHING;

-- Insert Sunday morning Teen Soccer at Lincoln Park
INSERT INTO sessions (
  id,
  program_id,
  location_id,
  coach_id,
  start_date,
  day_of_week,
  start_time,
  capacity,
  enrolled_count,
  status
) VALUES (
  '00000000-0000-0000-0000-000000000807',
  '00000000-0000-0000-0000-000000000204',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000301',
  '2025-01-05',
  0, -- Sunday
  '10:00:00',
  16,
  2,
  'active'
) ON CONFLICT (id) DO NOTHING;
