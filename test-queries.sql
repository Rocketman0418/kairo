-- ========================================
-- QUICK TEST DATA QUERIES
-- Run these in Supabase SQL Editor
-- ========================================

-- 1. VIEW ALL SESSIONS WITH AVAILABILITY
-- Shows enrollment status for all sessions
SELECT
  p.name as program,
  CASE s.day_of_week
    WHEN 0 THEN 'Sunday'
    WHEN 1 THEN 'Monday'
    WHEN 2 THEN 'Tuesday'
    WHEN 3 THEN 'Wednesday'
    WHEN 4 THEN 'Thursday'
    WHEN 5 THEN 'Friday'
    WHEN 6 THEN 'Saturday'
  END as day,
  s.start_time,
  l.name as location,
  st.name as coach,
  st.rating as coach_rating,
  s.enrolled_count || '/' || s.capacity as enrollment,
  (s.capacity - s.enrolled_count) as spots_remaining,
  s.status
FROM sessions s
JOIN programs p ON s.program_id = p.id
JOIN locations l ON s.location_id = l.id
LEFT JOIN staff st ON s.coach_id = st.id
ORDER BY p.name, s.day_of_week, s.start_time;


-- 2. VIEW SESSION QUALITY SCORES
-- Shows session reviews and quality ratings
SELECT
  p.name as program,
  CASE s.day_of_week
    WHEN 0 THEN 'Sun' WHEN 1 THEN 'Mon' WHEN 2 THEN 'Tue'
    WHEN 3 THEN 'Wed' WHEN 4 THEN 'Thu' WHEN 5 THEN 'Fri' WHEN 6 THEN 'Sat'
  END as day,
  s.start_time,
  l.name as location,
  COUNT(sr.id) as review_count,
  ROUND(AVG(sr.overall_rating)::numeric, 2) as session_quality,
  ROUND(AVG(sr.coach_rating)::numeric, 2) as avg_coach_score,
  ROUND(AVG(sr.location_rating)::numeric, 2) as avg_location_score
FROM sessions s
JOIN programs p ON s.program_id = p.id
JOIN locations l ON s.location_id = l.id
LEFT JOIN session_reviews sr ON s.id = sr.session_id
GROUP BY p.name, s.day_of_week, s.start_time, l.name
HAVING COUNT(sr.id) > 0
ORDER BY session_quality DESC;


-- 3. VIEW COACH RATING VS SESSION QUALITY
-- Compare individual coach ratings to their session quality scores
SELECT
  st.name as coach,
  st.rating as coach_overall_rating,
  p.name as program,
  CASE s.day_of_week
    WHEN 0 THEN 'Sun' WHEN 1 THEN 'Mon' WHEN 2 THEN 'Tue'
    WHEN 3 THEN 'Wed' WHEN 4 THEN 'Thu' WHEN 5 THEN 'Fri' WHEN 6 THEN 'Sat'
  END as day,
  s.start_time,
  l.name as location,
  COUNT(sr.id) as reviews,
  ROUND(AVG(sr.overall_rating)::numeric, 2) as session_quality_score
FROM sessions s
JOIN programs p ON s.program_id = p.id
JOIN locations l ON s.location_id = l.id
JOIN staff st ON s.coach_id = st.id
LEFT JOIN session_reviews sr ON s.id = sr.session_id
GROUP BY st.name, st.rating, p.name, s.day_of_week, s.start_time, l.name
HAVING COUNT(sr.id) > 0
ORDER BY st.name, session_quality_score DESC;


-- 4. VIEW TEST FAMILIES
-- See all test families and their preferences
SELECT
  primary_contact_name,
  email,
  preferences->>'preferred_days' as preferred_days,
  preferences->>'preferred_times' as preferred_times,
  preferences->>'activity_types' as interests,
  preferences->>'max_distance_miles' as max_distance,
  address->>'city' as city,
  engagement_score
FROM families
ORDER BY primary_contact_name;


-- 5. VIEW REGISTRATIONS BY FAMILY
-- See who's registered for what
SELECT
  f.primary_contact_name as parent,
  c.first_name as child,
  c.date_of_birth,
  p.name as program,
  CASE s.day_of_week
    WHEN 0 THEN 'Sun' WHEN 1 THEN 'Mon' WHEN 2 THEN 'Tue'
    WHEN 3 THEN 'Wed' WHEN 4 THEN 'Thu' WHEN 5 THEN 'Fri' WHEN 6 THEN 'Sat'
  END as day,
  s.start_time,
  l.name as location,
  r.status,
  r.payment_status,
  r.registration_channel
FROM registrations r
JOIN families f ON r.family_id = f.id
JOIN children c ON r.child_id = c.id
JOIN sessions s ON r.session_id = s.id
JOIN programs p ON s.program_id = p.id
JOIN locations l ON s.location_id = l.id
ORDER BY f.primary_contact_name, c.first_name;


-- 6. VIEW LOCATIONS WITH COORDINATES
-- See all venue locations and their distances
SELECT
  name,
  address,
  capacity,
  amenities,
  CASE
    WHEN geo_coordinates IS NOT NULL
    THEN '(' || ST_Y(geo_coordinates) || ', ' || ST_X(geo_coordinates) || ')'
    ELSE 'No coordinates'
  END as coordinates
FROM locations
ORDER BY name;


-- 7. FIND FULL OR ALMOST-FULL SESSIONS
-- Good for testing alternatives and waitlist
SELECT
  p.name as program,
  CASE s.day_of_week
    WHEN 0 THEN 'Sunday'
    WHEN 1 THEN 'Monday'
    WHEN 2 THEN 'Tuesday'
    WHEN 3 THEN 'Wednesday'
    WHEN 4 THEN 'Thursday'
    WHEN 5 THEN 'Friday'
    WHEN 6 THEN 'Saturday'
  END as day,
  s.start_time,
  l.name as location,
  s.enrolled_count,
  s.capacity,
  (s.capacity - s.enrolled_count) as spots_left,
  CASE
    WHEN s.enrolled_count >= s.capacity THEN '🔴 FULL'
    WHEN (s.capacity - s.enrolled_count) <= 2 THEN '🟠 ALMOST FULL'
    WHEN (s.capacity - s.enrolled_count) <= 5 THEN '🟡 FILLING UP'
    ELSE '🟢 AVAILABLE'
  END as status_indicator
FROM sessions s
JOIN programs p ON s.program_id = p.id
JOIN locations l ON s.location_id = l.id
WHERE (s.capacity - s.enrolled_count) <= 2
ORDER BY spots_left, p.name;


-- 8. VIEW SESSION REVIEWS WITH COMMENTS
-- See what parents are saying about sessions
SELECT
  f.primary_contact_name as reviewer,
  c.first_name as child,
  p.name as program,
  CASE s.day_of_week
    WHEN 0 THEN 'Sun' WHEN 1 THEN 'Mon' WHEN 2 THEN 'Tue'
    WHEN 3 THEN 'Wed' WHEN 4 THEN 'Thu' WHEN 5 THEN 'Fri' WHEN 6 THEN 'Sat'
  END as day,
  s.start_time,
  sr.overall_rating,
  sr.coach_rating,
  sr.location_rating,
  sr.comment,
  sr.would_recommend
FROM session_reviews sr
JOIN families f ON sr.family_id = f.id
JOIN children c ON sr.child_id = c.id
JOIN sessions s ON sr.session_id = s.id
JOIN programs p ON s.program_id = p.id
ORDER BY sr.created_at DESC;


-- 9. COUNT SUMMARY
-- Quick overview of test data
SELECT
  'Families' as entity,
  COUNT(*) as count
FROM families
UNION ALL
SELECT 'Children', COUNT(*) FROM children
UNION ALL
SELECT 'Programs', COUNT(*) FROM programs
UNION ALL
SELECT 'Locations', COUNT(*) FROM locations
UNION ALL
SELECT 'Staff/Coaches', COUNT(*) FROM staff
UNION ALL
SELECT 'Sessions', COUNT(*) FROM sessions
UNION ALL
SELECT 'Registrations', COUNT(*) FROM registrations
UNION ALL
SELECT 'Session Reviews', COUNT(*) FROM session_reviews
ORDER BY entity;


-- 10. TEST SCENARIO: FIND ALTERNATIVES FOR FULL WEDNESDAY SESSION
-- This simulates what the Find Alternatives edge function should do
WITH full_session AS (
  -- Wednesday 10 AM Mini Soccer (should be full)
  SELECT s.*, p.name as program_name, p.age_range
  FROM sessions s
  JOIN programs p ON s.program_id = p.id
  WHERE s.day_of_week = 3
  AND s.start_time = '10:00'
  AND p.name = 'Mini Soccer'
  LIMIT 1
)
SELECT
  p.name as program,
  CASE s.day_of_week
    WHEN 0 THEN 'Sunday'
    WHEN 1 THEN 'Monday'
    WHEN 2 THEN 'Tuesday'
    WHEN 3 THEN 'Wednesday'
    WHEN 4 THEN 'Thursday'
    WHEN 5 THEN 'Friday'
    WHEN 6 THEN 'Saturday'
  END as day,
  s.start_time,
  l.name as location,
  (s.capacity - s.enrolled_count) as spots_available,
  CASE
    WHEN s.day_of_week IN ((SELECT day_of_week FROM full_session) - 1, (SELECT day_of_week FROM full_session) + 1)
    THEN '✅ Adjacent Day'
    ELSE '⚠️ Different Day'
  END as day_match,
  CASE
    WHEN s.start_time = (SELECT start_time FROM full_session)
    THEN '✅ Same Time'
    ELSE '⚠️ Different Time'
  END as time_match
FROM sessions s
JOIN programs p ON s.program_id = p.id
JOIN locations l ON s.location_id = l.id
WHERE p.name = (SELECT program_name FROM full_session)
AND (s.capacity - s.enrolled_count) > 0
AND s.status = 'active'
AND s.id != (SELECT id FROM full_session)
ORDER BY
  -- Prioritize adjacent days
  CASE
    WHEN s.day_of_week IN ((SELECT day_of_week FROM full_session) - 1, (SELECT day_of_week FROM full_session) + 1)
    THEN 1 ELSE 2
  END,
  -- Then same time
  CASE
    WHEN s.start_time = (SELECT start_time FROM full_session)
    THEN 1 ELSE 2
  END,
  spots_available DESC
LIMIT 5;
