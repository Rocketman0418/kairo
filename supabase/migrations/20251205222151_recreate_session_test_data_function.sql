/*
  # Recreate Session Test Data Function with Correct Fields
  
  Drop and recreate function to return fields that match UI expectations
*/

-- Drop existing function
DROP FUNCTION IF EXISTS get_session_test_data();

-- Create with correct return structure
CREATE OR REPLACE FUNCTION get_session_test_data()
RETURNS TABLE (
  id UUID,
  program_name TEXT,
  day_of_week INTEGER,
  start_time TEXT,
  capacity INTEGER,
  enrolled_count INTEGER,
  spots_remaining INTEGER,
  status TEXT,
  location_name TEXT,
  coach_name TEXT,
  coach_rating NUMERIC,
  review_count BIGINT,
  avg_quality_score NUMERIC,
  avg_coach_score NUMERIC,
  avg_location_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    p.name AS program_name,
    s.day_of_week,
    s.start_time::TEXT,
    s.capacity,
    s.enrolled_count,
    (s.capacity - s.enrolled_count) AS spots_remaining,
    CASE 
      WHEN s.enrolled_count >= s.capacity THEN 'full'
      ELSE COALESCE(s.status, 'active')
    END AS status,
    l.name AS location_name,
    COALESCE(st.name, 'Unassigned') AS coach_name,
    COALESCE(st.rating, 0) AS coach_rating,
    COUNT(sr.id) AS review_count,
    COALESCE(AVG(sr.overall_rating), 0) AS avg_quality_score,
    COALESCE(AVG(sr.coach_rating), 0) AS avg_coach_score,
    COALESCE(AVG(sr.location_rating), 0) AS avg_location_score
  FROM sessions s
  JOIN programs p ON s.program_id = p.id
  JOIN locations l ON s.location_id = l.id
  LEFT JOIN staff st ON s.coach_id = st.id
  LEFT JOIN session_reviews sr ON sr.session_id = s.id
  GROUP BY s.id, p.name, l.name, st.name, st.rating, s.day_of_week, s.start_time, s.capacity, s.enrolled_count, s.status
  ORDER BY p.name, s.day_of_week, s.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;