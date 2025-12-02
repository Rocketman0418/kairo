/*
  # Seed Demo Data for Kairo Platform
  
  ## Overview
  Creates sample organization, programs, locations, sessions, and staff for testing.
  This demonstrates the complete data structure for a youth sports organization.
  
  ## Demo Organization: "Soccer Shots Demo"
  - 2 locations (Lincoln Park, Riverside Park)
  - 3 programs (Mini Soccer, Junior Soccer, Premier Soccer)
  - Multiple sessions across different days/times
  - Demo coach/admin accounts
  
  ## Note
  This is demo data for development. Remove before production deployment.
*/

-- Insert demo organization
INSERT INTO organizations (id, name, slug, ai_agent_name, branding, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Soccer Shots Demo',
  'soccer-shots-demo',
  'Kai',
  '{"primaryColor": "#2563eb", "secondaryColor": "#10b981", "logo": null}',
  '{"timezone": "America/New_York", "currency": "USD"}'
)
ON CONFLICT (id) DO NOTHING;

-- Insert demo locations
INSERT INTO locations (id, organization_id, name, address, capacity, amenities)
VALUES 
(
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000001',
  'Lincoln Park',
  '123 Park Ave, Springfield, IL 62701',
  50,
  '{"parking": true, "restrooms": true, "indoor": false, "covered": false}'
),
(
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000001',
  'Riverside Park',
  '456 River Road, Springfield, IL 62702',
  40,
  '{"parking": true, "restrooms": true, "indoor": false, "covered": true}'
)
ON CONFLICT (id) DO NOTHING;

-- Insert demo programs
INSERT INTO programs (id, organization_id, name, description, age_range, duration_weeks, price_cents, payment_plan_options)
VALUES
(
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000001',
  'Mini Soccer',
  'Perfect for first-time players ages 2-3. Focus on fun, basic motor skills, and introduction to soccer.',
  '[2,4)',
  8,
  14900,
  '[{"name": "Full Payment", "installments": 1, "amount_cents": 14900}, {"name": "Monthly Plan", "installments": 2, "amount_cents": 7900}]'
),
(
  '00000000-0000-0000-0000-000000000202',
  '00000000-0000-0000-0000-000000000001',
  'Junior Soccer',
  'For ages 4-6. Develops fundamental skills, teamwork, and game understanding.',
  '[4,7)',
  8,
  16900,
  '[{"name": "Full Payment", "installments": 1, "amount_cents": 16900}, {"name": "Monthly Plan", "installments": 2, "amount_cents": 8900}]'
),
(
  '00000000-0000-0000-0000-000000000203',
  '00000000-0000-0000-0000-000000000001',
  'Premier Soccer',
  'Advanced training for ages 7-10. Competitive skills and strategic play.',
  '[7,11)',
  8,
  19900,
  '[{"name": "Full Payment", "installments": 1, "amount_cents": 19900}, {"name": "Monthly Plan", "installments": 2, "amount_cents": 10450}]'
)
ON CONFLICT (id) DO NOTHING;

-- Insert demo staff
INSERT INTO staff (id, organization_id, name, role, rating, certifications, background_check_status)
VALUES
(
  '00000000-0000-0000-0000-000000000301',
  '00000000-0000-0000-0000-000000000001',
  'Coach Mike',
  'coach',
  4.9,
  '["USSF Licensed", "First Aid Certified", "CPR Certified"]',
  'approved'
),
(
  '00000000-0000-0000-0000-000000000302',
  '00000000-0000-0000-0000-000000000001',
  'Coach Sarah',
  'coach',
  4.8,
  '["USSF Licensed", "First Aid Certified"]',
  'approved'
),
(
  '00000000-0000-0000-0000-000000000303',
  '00000000-0000-0000-0000-000000000001',
  'Coach Alex',
  'coach',
  4.7,
  '["USSF Licensed", "First Aid Certified", "CPR Certified"]',
  'approved'
)
ON CONFLICT (id) DO NOTHING;

-- Insert demo sessions for Mini Soccer (ages 2-3)
INSERT INTO sessions (id, program_id, location_id, coach_id, start_date, end_date, day_of_week, start_time, capacity, enrolled_count, status)
VALUES
(
  '00000000-0000-0000-0000-000000000401',
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000301',
  '2025-01-08',
  '2025-02-26',
  3,
  '16:00:00',
  12,
  10,
  'active'
),
(
  '00000000-0000-0000-0000-000000000402',
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000301',
  '2025-01-09',
  '2025-02-27',
  4,
  '16:00:00',
  12,
  8,
  'active'
),
(
  '00000000-0000-0000-0000-000000000403',
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000302',
  '2025-01-11',
  '2025-03-01',
  6,
  '09:00:00',
  10,
  5,
  'active'
)
ON CONFLICT (id) DO NOTHING;

-- Insert demo sessions for Junior Soccer (ages 4-6)
INSERT INTO sessions (id, program_id, location_id, coach_id, start_date, end_date, day_of_week, start_time, capacity, enrolled_count, status)
VALUES
(
  '00000000-0000-0000-0000-000000000501',
  '00000000-0000-0000-0000-000000000202',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000302',
  '2025-01-08',
  '2025-02-26',
  3,
  '17:00:00',
  15,
  13,
  'active'
),
(
  '00000000-0000-0000-0000-000000000502',
  '00000000-0000-0000-0000-000000000202',
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000303',
  '2025-01-09',
  '2025-02-27',
  4,
  '17:00:00',
  15,
  11,
  'active'
),
(
  '00000000-0000-0000-0000-000000000503',
  '00000000-0000-0000-0000-000000000202',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000302',
  '2025-01-11',
  '2025-03-01',
  6,
  '10:00:00',
  15,
  7,
  'active'
)
ON CONFLICT (id) DO NOTHING;

-- Insert demo sessions for Premier Soccer (ages 7-10)
INSERT INTO sessions (id, program_id, location_id, coach_id, start_date, end_date, day_of_week, start_time, capacity, enrolled_count, status)
VALUES
(
  '00000000-0000-0000-0000-000000000601',
  '00000000-0000-0000-0000-000000000203',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000303',
  '2025-01-08',
  '2025-02-26',
  3,
  '18:00:00',
  18,
  15,
  'active'
),
(
  '00000000-0000-0000-0000-000000000602',
  '00000000-0000-0000-0000-000000000203',
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000303',
  '2025-01-09',
  '2025-02-27',
  4,
  '18:00:00',
  18,
  16,
  'active'
),
(
  '00000000-0000-0000-0000-000000000603',
  '00000000-0000-0000-0000-000000000203',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000301',
  '2025-01-11',
  '2025-03-01',
  6,
  '11:00:00',
  18,
  12,
  'active'
)
ON CONFLICT (id) DO NOTHING;
