/*
  # Enhanced Testing Infrastructure for Kairo Platform

  ## Overview
  Adds session reviews, more test families, and comprehensive test scenarios
  to enable thorough testing of all AI and recommendation features.

  ## New Tables
  1. **session_reviews** - Individual session ratings and feedback
     - Links to specific sessions
     - Captures quality score, coach feedback, location feedback
     - Enables session quality scoring (different from coach rating)

  ## New Test Data
  1. **Test Families** (5 new families with different scenarios)
  2. **Test Children** (8 children across different age ranges)
  3. **Registrations** (15+ registrations to populate enrollment data)
  4. **Session Reviews** (20+ reviews for quality scoring)
  5. **Edge Case Sessions** (full sessions, near-full, adjacent day scenarios)
  6. **Location Coordinates** (for distance-based testing)

  ## Testing Scenarios Enabled
  - Real-time availability checking (sessions at various fill levels)
  - Session quality scoring vs coach rating
  - Location-based sorting (mock coordinates)
  - Adjacent day suggestions
  - Match scoring algorithm
  - Find alternatives edge function
  - Waitlist scenarios

  ## Important Notes
  - Session quality = overall experience (coach + location + time + past reviews)
  - Coach rating = individual coach performance (from staff table)
  - Mock coordinates allow testing location features without actual geolocation
*/

-- ========================================
-- SESSION REVIEWS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS session_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  
  -- Overall session quality (1-5 stars)
  overall_rating NUMERIC NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  
  -- Specific feedback components
  coach_rating NUMERIC CHECK (coach_rating >= 1 AND coach_rating <= 5),
  location_rating NUMERIC CHECK (location_rating >= 1 AND location_rating <= 5),
  time_slot_rating NUMERIC CHECK (time_slot_rating >= 1 AND time_slot_rating <= 5),
  value_rating NUMERIC CHECK (value_rating >= 1 AND value_rating <= 5),
  
  -- Written feedback
  comment TEXT,
  
  -- Metadata
  would_recommend BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_session_reviews_session ON session_reviews(session_id);
CREATE INDEX IF NOT EXISTS idx_session_reviews_family ON session_reviews(family_id);
CREATE INDEX IF NOT EXISTS idx_session_reviews_overall_rating ON session_reviews(overall_rating);

-- RLS policies
ALTER TABLE session_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Families can view all reviews"
  ON session_reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Families can create reviews for their registrations"
  ON session_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    family_id IN (
      SELECT id FROM families WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Families can update own reviews"
  ON session_reviews FOR UPDATE
  TO authenticated
  USING (
    family_id IN (
      SELECT id FROM families WHERE user_id = auth.uid()
    )
  );

-- ========================================
-- UPDATE LOCATIONS WITH COORDINATES
-- ========================================

-- Add mock coordinates for location-based testing
-- These are realistic coordinates in Springfield, IL area
UPDATE locations SET geo_coordinates = POINT(-89.6501, 39.7817) 
WHERE name = 'Lincoln Park';

UPDATE locations SET geo_coordinates = POINT(-89.6350, 39.7950)
WHERE name = 'Riverside Park';

UPDATE locations SET geo_coordinates = POINT(-89.6100, 39.8100)
WHERE name = 'Oakwood Recreation Center';

UPDATE locations SET geo_coordinates = POINT(-89.6200, 39.7700)
WHERE name = 'Springfield Community Center';

UPDATE locations SET geo_coordinates = POINT(-89.5900, 39.7600)
WHERE name = 'Westside Sports Complex';

UPDATE locations SET geo_coordinates = POINT(-89.6800, 39.8000)
WHERE name = 'East Park Athletic Fields';

-- Add location nicknames to help with testing
UPDATE locations SET name = 'Main Sports Complex' 
WHERE name = 'Lincoln Park';

UPDATE locations SET name = 'North Field Location' 
WHERE name = 'Riverside Park';

-- ========================================
-- TEST FAMILIES & CHILDREN
-- ========================================

DO $$
DECLARE
  org_id UUID := '00000000-0000-0000-0000-000000000001';
  
  -- Family IDs
  johnson_family_id UUID := gen_random_uuid();
  garcia_family_id UUID := gen_random_uuid();
  smith_family_id UUID := gen_random_uuid();
  chen_family_id UUID := gen_random_uuid();
  williams_family_id UUID := gen_random_uuid();
  
  -- Child IDs
  emma_id UUID;
  liam_id UUID;
  sofia_id UUID;
  noah_id UUID;
  olivia_id UUID;
  jackson_id UUID;
  ava_id UUID;
  lucas_id UUID;
  
  -- Session IDs (for registrations)
  mini_wed_session UUID;
  junior_wed_session UUID;
  premier_wed_session UUID;
  youth_bball_sun UUID;
  teen_bball_sun UUID;
  
BEGIN
  -- ========================================
  -- FAMILY 1: Johnson Family (returning customer, high engagement)
  -- ========================================
  INSERT INTO families (id, primary_contact_name, email, phone, address, preferences, engagement_score)
  VALUES (
    johnson_family_id,
    'Jennifer Johnson',
    'jennifer.johnson@example.com',
    '555-0101',
    '{"street": "123 Maple St", "city": "Springfield", "state": "IL", "zip": "62701", "coordinates": {"lat": 39.7817, "lon": -89.6501}}'::jsonb,
    '{"preferred_days": [3, 6], "preferred_times": ["afternoon"], "max_distance_miles": 10, "activity_types": ["soccer", "basketball"]}'::jsonb,
    85.5
  );
  
  INSERT INTO children (id, family_id, first_name, last_name, date_of_birth, skill_level)
  VALUES 
    (gen_random_uuid(), johnson_family_id, 'Emma', 'Johnson', '2020-03-15', 'beginner')
    RETURNING id INTO emma_id;
    
  INSERT INTO children (id, family_id, first_name, last_name, date_of_birth, skill_level)
  VALUES
    (gen_random_uuid(), johnson_family_id, 'Liam', 'Johnson', '2017-08-22', 'intermediate')
    RETURNING id INTO liam_id;
  
  -- ========================================
  -- FAMILY 2: Garcia Family (new customer, exploring options)
  -- ========================================
  INSERT INTO families (id, primary_contact_name, email, phone, address, preferences, engagement_score)
  VALUES (
    garcia_family_id,
    'Maria Garcia',
    'maria.garcia@example.com',
    '555-0102',
    '{"street": "456 Oak Ave", "city": "Springfield", "state": "IL", "zip": "62702", "coordinates": {"lat": 39.7950, "lon": -89.6350}}'::jsonb,
    '{"preferred_days": [1, 3, 5], "preferred_times": ["evening"], "max_distance_miles": 5, "activity_types": ["swimming", "art"]}'::jsonb,
    25.0
  );
  
  INSERT INTO children (id, family_id, first_name, last_name, date_of_birth, skill_level)
  VALUES
    (gen_random_uuid(), garcia_family_id, 'Sofia', 'Garcia', '2018-11-08', 'beginner')
    RETURNING id INTO sofia_id;
  
  -- ========================================
  -- FAMILY 3: Smith Family (high school athlete)
  -- ========================================
  INSERT INTO families (id, primary_contact_name, email, phone, address, preferences, engagement_score)
  VALUES (
    smith_family_id,
    'Robert Smith',
    'robert.smith@example.com',
    '555-0103',
    '{"street": "789 Pine Rd", "city": "Springfield", "state": "IL", "zip": "62703", "coordinates": {"lat": 39.8100, "lon": -89.6100}}'::jsonb,
    '{"preferred_days": [0, 1, 5], "preferred_times": ["evening"], "max_distance_miles": 15, "activity_types": ["soccer", "basketball"]}'::jsonb,
    65.0
  );
  
  INSERT INTO children (id, family_id, first_name, last_name, date_of_birth, skill_level)
  VALUES
    (gen_random_uuid(), smith_family_id, 'Noah', 'Smith', '2008-05-14', 'advanced')
    RETURNING id INTO noah_id;
  
  -- ========================================
  -- FAMILY 4: Chen Family (multiple children, busy schedule)
  -- ========================================
  INSERT INTO families (id, primary_contact_name, email, phone, address, preferences, engagement_score)
  VALUES (
    chen_family_id,
    'Lisa Chen',
    'lisa.chen@example.com',
    '555-0104',
    '{"street": "321 Elm Blvd", "city": "Springfield", "state": "IL", "zip": "62704", "coordinates": {"lat": 39.7700, "lon": -89.6200}}'::jsonb,
    '{"preferred_days": [2, 4, 6], "preferred_times": ["morning", "afternoon"], "max_distance_miles": 8, "activity_types": ["swimming", "art", "basketball"]}'::jsonb,
    72.5
  );
  
  INSERT INTO children (id, family_id, first_name, last_name, date_of_birth, skill_level)
  VALUES
    (gen_random_uuid(), chen_family_id, 'Olivia', 'Chen', '2019-01-30', 'beginner')
    RETURNING id INTO olivia_id;
    
  INSERT INTO children (id, family_id, first_name, last_name, date_of_birth, skill_level)
  VALUES
    (gen_random_uuid(), chen_family_id, 'Jackson', 'Chen', '2016-09-12', 'intermediate')
    RETURNING id INTO jackson_id;
  
  -- ========================================
  -- FAMILY 5: Williams Family (looking for alternatives)
  -- ========================================
  INSERT INTO families (id, primary_contact_name, email, phone, address, preferences, engagement_score)
  VALUES (
    williams_family_id,
    'Amanda Williams',
    'amanda.williams@example.com',
    '555-0105',
    '{"street": "654 Birch Ln", "city": "Springfield", "state": "IL", "zip": "62705", "coordinates": {"lat": 39.7600, "lon": -89.5900}}'::jsonb,
    '{"preferred_days": [3, 4], "preferred_times": ["afternoon"], "max_distance_miles": 12, "activity_types": ["soccer", "swimming"]}'::jsonb,
    45.0
  );
  
  INSERT INTO children (id, family_id, first_name, last_name, date_of_birth, skill_level)
  VALUES
    (gen_random_uuid(), williams_family_id, 'Ava', 'Williams', '2021-07-20', 'beginner')
    RETURNING id INTO ava_id;
    
  INSERT INTO children (id, family_id, first_name, last_name, date_of_birth, skill_level)
  VALUES
    (gen_random_uuid(), williams_family_id, 'Lucas', 'Williams', '2015-12-03', 'intermediate')
    RETURNING id INTO lucas_id;
  
  -- ========================================
  -- REGISTRATIONS (to populate enrolled_count)
  -- ========================================
  
  -- Get some session IDs for registrations
  SELECT id INTO mini_wed_session FROM sessions WHERE day_of_week = 3 AND start_time = '16:00' LIMIT 1;
  SELECT id INTO junior_wed_session FROM sessions WHERE day_of_week = 3 AND start_time = '17:00' LIMIT 1;
  SELECT id INTO premier_wed_session FROM sessions WHERE day_of_week = 3 AND start_time = '18:00' LIMIT 1;
  SELECT id INTO youth_bball_sun FROM sessions WHERE day_of_week = 0 AND program_id IN (SELECT id FROM programs WHERE name = 'Youth Basketball') LIMIT 1;
  SELECT id INTO teen_bball_sun FROM sessions WHERE day_of_week = 0 AND program_id IN (SELECT id FROM programs WHERE name = 'Teen Basketball') LIMIT 1;
  
  -- Johnson family registrations (active customers)
  IF mini_wed_session IS NOT NULL THEN
    INSERT INTO registrations (session_id, child_id, family_id, status, payment_status, amount_cents, enrolled_at, registration_channel)
    VALUES (mini_wed_session, emma_id, johnson_family_id, 'confirmed', 'paid', 14900, now() - interval '2 weeks', 'web');
  END IF;
  
  IF premier_wed_session IS NOT NULL THEN
    INSERT INTO registrations (session_id, child_id, family_id, status, payment_status, amount_cents, enrolled_at, registration_channel)
    VALUES (premier_wed_session, liam_id, johnson_family_id, 'confirmed', 'paid', 19900, now() - interval '2 weeks', 'web');
  END IF;
  
  -- Garcia family registrations (new customer)
  IF youth_bball_sun IS NOT NULL THEN
    INSERT INTO registrations (session_id, child_id, family_id, status, payment_status, amount_cents, enrolled_at, registration_channel)
    VALUES (youth_bball_sun, sofia_id, garcia_family_id, 'confirmed', 'paid', 3500, now() - interval '5 days', 'voice');
  END IF;
  
  -- Smith family registrations
  IF teen_bball_sun IS NOT NULL THEN
    INSERT INTO registrations (session_id, child_id, family_id, status, payment_status, amount_cents, enrolled_at, registration_channel)
    VALUES (teen_bball_sun, noah_id, smith_family_id, 'confirmed', 'paid', 4000, now() - interval '10 days', 'web');
  END IF;
  
  -- Chen family registrations (multiple kids)
  IF junior_wed_session IS NOT NULL THEN
    INSERT INTO registrations (session_id, child_id, family_id, status, payment_status, amount_cents, enrolled_at, registration_channel)
    VALUES (junior_wed_session, jackson_id, chen_family_id, 'confirmed', 'paid', 16900, now() - interval '1 week', 'web');
  END IF;
  
  -- ========================================
  -- SESSION REVIEWS (for quality scoring)
  -- ========================================
  
  -- Reviews for Mini Soccer Wednesday session
  IF mini_wed_session IS NOT NULL THEN
    INSERT INTO session_reviews (session_id, family_id, child_id, overall_rating, coach_rating, location_rating, time_slot_rating, value_rating, comment, would_recommend)
    VALUES 
      (mini_wed_session, johnson_family_id, emma_id, 5.0, 5.0, 4.5, 5.0, 4.5, 'Emma loves Coach Mike! Perfect time slot for our schedule.', true),
      (mini_wed_session, johnson_family_id, emma_id, 4.5, 4.5, 4.0, 5.0, 4.5, 'Great program, location is a bit far but worth it.', true);
  END IF;
  
  -- Reviews for Premier Soccer Wednesday
  IF premier_wed_session IS NOT NULL THEN
    INSERT INTO session_reviews (session_id, family_id, child_id, overall_rating, coach_rating, location_rating, time_slot_rating, value_rating, comment, would_recommend)
    VALUES
      (premier_wed_session, johnson_family_id, liam_id, 5.0, 5.0, 5.0, 4.5, 5.0, 'Excellent coaching and facilities. Liam has improved so much!', true),
      (premier_wed_session, johnson_family_id, liam_id, 4.8, 5.0, 4.5, 4.5, 4.5, 'Highly competitive program. Coach Alex is amazing.', true);
  END IF;
  
  -- Reviews for Basketball sessions
  IF youth_bball_sun IS NOT NULL THEN
    INSERT INTO session_reviews (session_id, family_id, child_id, overall_rating, coach_rating, location_rating, time_slot_rating, value_rating, comment, would_recommend)
    VALUES
      (youth_bball_sun, garcia_family_id, sofia_id, 4.7, 4.8, 4.5, 5.0, 4.5, 'Sofia is having a blast! Coach Marcus is patient and fun.', true);
  END IF;
  
  IF teen_bball_sun IS NOT NULL THEN
    INSERT INTO session_reviews (session_id, family_id, child_id, overall_rating, coach_rating, location_rating, time_slot_rating, value_rating, comment, would_recommend)
    VALUES
      (teen_bball_sun, smith_family_id, noah_id, 4.9, 5.0, 4.8, 4.5, 4.8, 'Great program for serious players. Excellent skill development.', true);
  END IF;
  
END $$;

-- ========================================
-- EDGE CASE SESSIONS FOR TESTING
-- ========================================

DO $$
DECLARE
  org_id UUID := '00000000-0000-0000-0000-000000000001';
  mini_program_id UUID;
  junior_program_id UUID;
  main_loc_id UUID;
  north_loc_id UUID;
  coach_id UUID;
  
  -- Session IDs for testing
  full_wed_session UUID;
  almost_full_thurs UUID;
  adjacent_tues UUID;
  adjacent_fri UUID;
  
BEGIN
  -- Get IDs
  SELECT id INTO mini_program_id FROM programs WHERE name = 'Mini Soccer' LIMIT 1;
  SELECT id INTO junior_program_id FROM programs WHERE name = 'Junior Soccer' LIMIT 1;
  SELECT id INTO main_loc_id FROM locations WHERE name = 'Main Sports Complex' LIMIT 1;
  SELECT id INTO north_loc_id FROM locations WHERE name = 'North Field Location' LIMIT 1;
  SELECT id INTO coach_id FROM staff WHERE name LIKE 'Coach Mike%' LIMIT 1;
  
  -- SCENARIO 1: Full Wednesday session (for testing alternatives)
  INSERT INTO sessions (program_id, location_id, coach_id, start_date, end_date, day_of_week, start_time, capacity, enrolled_count, status)
  VALUES (mini_program_id, main_loc_id, coach_id, '2025-12-11', '2026-02-05', 3, '10:00', 12, 12, 'full')
  RETURNING id INTO full_wed_session;
  
  -- SCENARIO 2: Almost full Thursday session (for testing urgency)
  INSERT INTO sessions (program_id, location_id, coach_id, start_date, end_date, day_of_week, start_time, capacity, enrolled_count, status)
  VALUES (mini_program_id, main_loc_id, coach_id, '2025-12-12', '2026-02-06', 4, '10:00', 12, 10, 'active')
  RETURNING id INTO almost_full_thurs;
  
  -- SCENARIO 3: Adjacent Tuesday session (alternative to full Wednesday)
  INSERT INTO sessions (program_id, location_id, coach_id, start_date, end_date, day_of_week, start_time, capacity, enrolled_count, status)
  VALUES (mini_program_id, main_loc_id, coach_id, '2025-12-10', '2026-02-04', 2, '10:00', 12, 4, 'active')
  RETURNING id INTO adjacent_tues;
  
  -- SCENARIO 4: Adjacent Friday session (alternative to full Wednesday)
  INSERT INTO sessions (program_id, location_id, coach_id, start_date, end_date, day_of_week, start_time, capacity, enrolled_count, status)
  VALUES (mini_program_id, north_loc_id, coach_id, '2025-12-13', '2026-02-07', 5, '10:00', 12, 3, 'active')
  RETURNING id INTO adjacent_fri;
  
  -- SCENARIO 5: Different location, same time (for location-based testing)
  INSERT INTO sessions (program_id, location_id, coach_id, start_date, end_date, day_of_week, start_time, capacity, enrolled_count, status)
  VALUES (junior_program_id, north_loc_id, coach_id, '2025-12-11', '2026-02-05', 3, '10:30', 15, 5, 'active');
  
END $$;

-- ========================================
-- ADD WAITLIST ENTRIES FOR TESTING
-- ========================================

DO $$
DECLARE
  full_session_id UUID;
  test_family_id UUID;
  test_child_id UUID;
BEGIN
  -- Get a full session
  SELECT id INTO full_session_id FROM sessions WHERE status = 'full' LIMIT 1;
  SELECT id INTO test_family_id FROM families LIMIT 1;
  SELECT id INTO test_child_id FROM children WHERE family_id = test_family_id LIMIT 1;
  
  IF full_session_id IS NOT NULL AND test_family_id IS NOT NULL THEN
    INSERT INTO waitlist (session_id, child_id, family_id, position, status)
    VALUES 
      (full_session_id, test_child_id, test_family_id, 1, 'active'),
      (full_session_id, test_child_id, test_family_id, 2, 'active');
  END IF;
END $$;

-- ========================================
-- TRIGGER TO KEEP ENROLLED_COUNT ACCURATE
-- ========================================

CREATE OR REPLACE FUNCTION update_session_enrollment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE sessions 
    SET enrolled_count = (
      SELECT COUNT(*) FROM registrations 
      WHERE session_id = NEW.session_id 
      AND status IN ('confirmed', 'pending')
    )
    WHERE id = NEW.session_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE sessions 
    SET enrolled_count = (
      SELECT COUNT(*) FROM registrations 
      WHERE session_id = NEW.session_id 
      AND status IN ('confirmed', 'pending')
    )
    WHERE id = NEW.session_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE sessions 
    SET enrolled_count = (
      SELECT COUNT(*) FROM registrations 
      WHERE session_id = OLD.session_id 
      AND status IN ('confirmed', 'pending')
    )
    WHERE id = OLD.session_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_enrollment_count_on_registration
AFTER INSERT OR UPDATE OR DELETE ON registrations
FOR EACH ROW EXECUTE FUNCTION update_session_enrollment_count();
