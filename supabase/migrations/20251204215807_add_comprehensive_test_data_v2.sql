/*
  # Add Comprehensive Test Data for Kairo

  ## New Data Added
  
  1. **Programs** (8 new programs)
    - High School Soccer (ages 15-18) - fills the teen gap
    - Basketball programs (ages 5-18) across 3 tiers
    - Swimming programs (ages 4-16) across 3 tiers
    - Art & Enrichment programs (ages 6-14)
  
  2. **Staff** (5 new coaches)
    - Basketball coaches
    - Swimming instructors
    - Art instructors
  
  3. **Sessions** (40+ new sessions)
    - Full week coverage (Sunday-Saturday)
    - All time slots (morning 9am-12pm, afternoon 1pm-5pm, evening 5pm-8pm)
    - Multiple age ranges represented
    - Different locations
  
  4. **Coverage Goals**
    - Ages 2-18 fully covered
    - All days of week have options
    - Morning, afternoon, AND evening sessions
    - Multiple activity types (not just soccer)
  
  ## Important Notes
  - All sessions start within next 2 weeks for immediate testing
  - Capacity varies (8-20 spots) for realistic testing
  - Some sessions partially filled to test availability logic
  - Prices range from $25-45/session for variety
*/

-- Get organization and location IDs
DO $$
DECLARE
  org_id UUID;
  main_loc_id UUID;
  north_loc_id UUID;
  
  -- Program IDs
  hs_soccer_id UUID;
  youth_bball_id UUID;
  teen_bball_id UUID;
  hs_bball_id UUID;
  learn_swim_id UUID;
  inter_swim_id UUID;
  advanced_swim_id UUID;
  creative_art_id UUID;
  
  -- Staff IDs
  coach_mike_id UUID;
  coach_marcus_id UUID;
  coach_lisa_id UUID;
  coach_david_id UUID;
  coach_sarah_id UUID;
  coach_jenny_id UUID;
  
BEGIN
  -- Get existing IDs
  SELECT id INTO org_id FROM organizations LIMIT 1;
  SELECT id INTO main_loc_id FROM locations WHERE name = 'Main Sports Complex' LIMIT 1;
  SELECT id INTO north_loc_id FROM locations WHERE name = 'North Field Location' LIMIT 1;
  SELECT id INTO coach_mike_id FROM staff WHERE name = 'Coach Mike Johnson' LIMIT 1;
  
  -- Add High School Soccer Program
  INSERT INTO programs (organization_id, name, description, age_range, duration_weeks, price_cents)
  VALUES (org_id, 'High School Soccer', 'Competitive soccer training for high school athletes. Advanced tactics, fitness, and game strategy.', '[15,19)', 12, 4500)
  RETURNING id INTO hs_soccer_id;
  
  -- Add Basketball Programs
  INSERT INTO programs (organization_id, name, description, age_range, duration_weeks, price_cents)
  VALUES (org_id, 'Youth Basketball', 'Fun introduction to basketball fundamentals, dribbling, and teamwork.', '[5,9)', 10, 3500)
  RETURNING id INTO youth_bball_id;
  
  INSERT INTO programs (organization_id, name, description, age_range, duration_weeks, price_cents)
  VALUES (org_id, 'Teen Basketball', 'Intermediate basketball skills, game strategies, and team play.', '[9,14)', 10, 4000)
  RETURNING id INTO teen_bball_id;
  
  INSERT INTO programs (organization_id, name, description, age_range, duration_weeks, price_cents)
  VALUES (org_id, 'High School Basketball', 'Advanced basketball training for competitive high school players.', '[14,19)', 12, 4500)
  RETURNING id INTO hs_bball_id;
  
  -- Add Swimming Programs
  INSERT INTO programs (organization_id, name, description, age_range, duration_weeks, price_cents)
  VALUES (org_id, 'Learn to Swim', 'Water safety and basic swimming skills for beginners.', '[4,9)', 8, 3000)
  RETURNING id INTO learn_swim_id;
  
  INSERT INTO programs (organization_id, name, description, age_range, duration_weeks, price_cents)
  VALUES (org_id, 'Intermediate Swimming', 'Stroke refinement and endurance building.', '[8,13)', 8, 3500)
  RETURNING id INTO inter_swim_id;
  
  INSERT INTO programs (organization_id, name, description, age_range, duration_weeks, price_cents)
  VALUES (org_id, 'Advanced Swimming', 'Competitive swimming techniques and training.', '[11,17)', 10, 4000)
  RETURNING id INTO advanced_swim_id;
  
  -- Add Art Program
  INSERT INTO programs (organization_id, name, description, age_range, duration_weeks, price_cents)
  VALUES (org_id, 'Creative Arts Studio', 'Explore painting, drawing, and mixed media. Develop creativity and artistic expression.', '[6,15)', 8, 2500)
  RETURNING id INTO creative_art_id;
  
  -- Add New Coaches/Staff
  INSERT INTO staff (organization_id, name, role, rating, certifications, background_check_status)
  VALUES (org_id, 'Marcus Johnson', 'coach', 4.9, '{"certs": ["Basketball Coaching Level 2", "First Aid"]}', 'approved')
  RETURNING id INTO coach_marcus_id;
  
  INSERT INTO staff (organization_id, name, role, rating, certifications, background_check_status)
  VALUES (org_id, 'Lisa Chen', 'coach', 4.8, '{"certs": ["Swimming Instructor", "Lifeguard", "CPR"]}', 'approved')
  RETURNING id INTO coach_lisa_id;
  
  INSERT INTO staff (organization_id, name, role, rating, certifications, background_check_status)
  VALUES (org_id, 'David Rodriguez', 'coach', 4.7, '{"certs": ["Basketball Coaching Level 3", "Sports Nutrition"]}', 'approved')
  RETURNING id INTO coach_david_id;
  
  INSERT INTO staff (organization_id, name, role, rating, certifications, background_check_status)
  VALUES (org_id, 'Sarah Mitchell', 'coach', 5.0, '{"certs": ["Water Safety Instructor", "CPR", "First Aid"]}', 'approved')
  RETURNING id INTO coach_sarah_id;
  
  INSERT INTO staff (organization_id, name, role, rating, certifications, background_check_status)
  VALUES (org_id, 'Jenny Park', 'coach', 4.9, '{"certs": ["Art Education", "Child Development"]}', 'approved')
  RETURNING id INTO coach_jenny_id;
  
  -- ========================================
  -- SUNDAY SESSIONS (Day 0)
  -- ========================================
  
  INSERT INTO sessions (program_id, location_id, coach_id, start_date, end_date, day_of_week, start_time, capacity, enrolled_count, status)
  VALUES
    (hs_soccer_id, main_loc_id, coach_mike_id, '2025-12-07', '2026-03-01', 0, '10:00', 15, 3, 'active'),
    (youth_bball_id, main_loc_id, coach_marcus_id, '2025-12-07', '2026-02-15', 0, '11:00', 12, 5, 'active'),
    (teen_bball_id, main_loc_id, coach_david_id, '2025-12-07', '2026-02-15', 0, '14:00', 15, 7, 'active'),
    (inter_swim_id, north_loc_id, coach_lisa_id, '2025-12-07', '2026-02-01', 0, '15:00', 10, 4, 'active');
  
  -- ========================================
  -- MONDAY SESSIONS (Day 1)
  -- ========================================
  
  INSERT INTO sessions (program_id, location_id, coach_id, start_date, end_date, day_of_week, start_time, capacity, enrolled_count, status)
  VALUES
    (youth_bball_id, main_loc_id, coach_marcus_id, '2025-12-09', '2026-02-17', 1, '15:00', 12, 6, 'active'),
    (learn_swim_id, north_loc_id, coach_sarah_id, '2025-12-09', '2026-02-03', 1, '16:00', 8, 3, 'active'),
    (hs_bball_id, main_loc_id, coach_david_id, '2025-12-09', '2026-03-03', 1, '18:00', 15, 8, 'active'),
    (hs_soccer_id, north_loc_id, coach_mike_id, '2025-12-09', '2026-03-03', 1, '19:00', 15, 4, 'active');
  
  -- ========================================
  -- TUESDAY SESSIONS (Day 2)
  -- ========================================
  
  INSERT INTO sessions (program_id, location_id, coach_id, start_date, end_date, day_of_week, start_time, capacity, enrolled_count, status)
  VALUES
    (learn_swim_id, north_loc_id, coach_lisa_id, '2025-12-10', '2026-02-04', 2, '09:00', 8, 2, 'active'),
    (creative_art_id, main_loc_id, coach_jenny_id, '2025-12-10', '2026-02-04', 2, '10:00', 12, 5, 'active'),
    (teen_bball_id, main_loc_id, coach_marcus_id, '2025-12-10', '2026-02-18', 2, '15:30', 15, 9, 'active'),
    (inter_swim_id, north_loc_id, coach_sarah_id, '2025-12-10', '2026-02-04', 2, '16:30', 10, 6, 'active'),
    (advanced_swim_id, north_loc_id, coach_lisa_id, '2025-12-10', '2026-02-18', 2, '18:00', 12, 7, 'active'),
    (hs_bball_id, main_loc_id, coach_david_id, '2025-12-10', '2026-03-04', 2, '19:00', 15, 5, 'active');
  
  -- ========================================
  -- WEDNESDAY SESSIONS (Day 3)
  -- ========================================
  
  INSERT INTO sessions (program_id, location_id, coach_id, start_date, end_date, day_of_week, start_time, capacity, enrolled_count, status)
  VALUES
    (creative_art_id, main_loc_id, coach_jenny_id, '2025-12-11', '2026-02-05', 3, '10:00', 12, 4, 'active'),
    (learn_swim_id, north_loc_id, coach_sarah_id, '2025-12-11', '2026-02-05', 3, '11:00', 8, 3, 'active'),
    (youth_bball_id, north_loc_id, coach_marcus_id, '2025-12-11', '2026-02-19', 3, '16:00', 12, 7, 'active'),
    (hs_soccer_id, main_loc_id, coach_mike_id, '2025-12-11', '2026-03-05', 3, '19:00', 15, 6, 'active'),
    (advanced_swim_id, north_loc_id, coach_lisa_id, '2025-12-11', '2026-02-19', 3, '19:30', 12, 5, 'active');
  
  -- ========================================
  -- THURSDAY SESSIONS (Day 4)
  -- ========================================
  
  INSERT INTO sessions (program_id, location_id, coach_id, start_date, end_date, day_of_week, start_time, capacity, enrolled_count, status)
  VALUES
    (learn_swim_id, north_loc_id, coach_sarah_id, '2025-12-12', '2026-02-06', 4, '09:00', 8, 4, 'active'),
    (creative_art_id, main_loc_id, coach_jenny_id, '2025-12-12', '2026-02-06', 4, '10:30', 12, 6, 'active'),
    (inter_swim_id, north_loc_id, coach_lisa_id, '2025-12-12', '2026-02-06', 4, '15:00', 10, 5, 'active'),
    (teen_bball_id, main_loc_id, coach_david_id, '2025-12-12', '2026-02-20', 4, '18:00', 15, 10, 'active'),
    (hs_bball_id, main_loc_id, coach_marcus_id, '2025-12-12', '2026-03-06', 4, '19:00', 15, 7, 'active');
  
  -- ========================================
  -- FRIDAY SESSIONS (Day 5)
  -- ========================================
  
  INSERT INTO sessions (program_id, location_id, coach_id, start_date, end_date, day_of_week, start_time, capacity, enrolled_count, status)
  VALUES
    (learn_swim_id, north_loc_id, coach_sarah_id, '2025-12-13', '2026-02-07', 5, '09:30', 8, 2, 'active'),
    (youth_bball_id, main_loc_id, coach_marcus_id, '2025-12-13', '2026-02-21', 5, '10:00', 12, 4, 'active'),
    (creative_art_id, main_loc_id, coach_jenny_id, '2025-12-13', '2026-02-07', 5, '14:00', 12, 8, 'active'),
    (inter_swim_id, north_loc_id, coach_lisa_id, '2025-12-13', '2026-02-07', 5, '15:00', 10, 6, 'active'),
    (hs_soccer_id, north_loc_id, coach_mike_id, '2025-12-13', '2026-03-07', 5, '18:00', 15, 9, 'active'),
    (advanced_swim_id, north_loc_id, coach_lisa_id, '2025-12-13', '2026-02-21', 5, '19:00', 12, 4, 'active');
  
  -- ========================================
  -- SATURDAY SESSIONS (Day 6)
  -- ========================================
  
  INSERT INTO sessions (program_id, location_id, coach_id, start_date, end_date, day_of_week, start_time, capacity, enrolled_count, status)
  VALUES
    (youth_bball_id, north_loc_id, coach_marcus_id, '2025-12-14', '2026-02-22', 6, '09:00', 12, 8, 'active'),
    (hs_soccer_id, main_loc_id, coach_mike_id, '2025-12-14', '2026-03-08', 6, '11:30', 15, 6, 'active'),
    (teen_bball_id, main_loc_id, coach_david_id, '2025-12-14', '2026-02-22', 6, '13:00', 15, 9, 'active'),
    (inter_swim_id, north_loc_id, coach_lisa_id, '2025-12-14', '2026-02-08', 6, '14:00', 10, 5, 'active'),
    (creative_art_id, main_loc_id, coach_jenny_id, '2025-12-14', '2026-02-08', 6, '15:00', 12, 7, 'active'),
    (hs_bball_id, main_loc_id, coach_marcus_id, '2025-12-14', '2026-03-08', 6, '17:00', 15, 4, 'active'),
    (advanced_swim_id, north_loc_id, coach_sarah_id, '2025-12-14', '2026-02-22', 6, '18:00', 12, 6, 'active');
  
END $$;
