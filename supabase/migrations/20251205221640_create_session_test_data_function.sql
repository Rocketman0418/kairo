/*
  # Create Session Test Data Function
  
  1. Purpose
    - Create stored procedure to aggregate session data with ratings
    - Used by Test Data Dashboard to display session quality metrics
  
  2. Returns
    - Session details with calculated ratings:
      - overall_rating: Average of all review ratings for this session
      - review_count: Number of reviews for this session
      - coach_rating: Coach's average rating
      - location_rating: Location's average rating
*/

CREATE OR REPLACE FUNCTION get_session_test_data()
RETURNS TABLE (
  session_id UUID,
  program_name TEXT,
  session_time TEXT,
  location_name TEXT,
  coach_name TEXT,
  capacity INTEGER,
  enrolled_count INTEGER,
  overall_rating NUMERIC,
  review_count BIGINT,
  coach_rating NUMERIC,
  location_rating NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id AS session_id,
    p.name AS program_name,
    CONCAT(
      CASE s.day_of_week
        WHEN 0 THEN 'Sundays'
        WHEN 1 THEN 'Mondays'
        WHEN 2 THEN 'Tuesdays'
        WHEN 3 THEN 'Wednesdays'
        WHEN 4 THEN 'Thursdays'
        WHEN 5 THEN 'Fridays'
        WHEN 6 THEN 'Saturdays'
      END,
      ' at ',
      TO_CHAR(s.start_time, 'HH:MI AM')
    ) AS session_time,
    l.name AS location_name,
    st.name AS coach_name,
    s.capacity,
    s.enrolled_count,
    COALESCE(AVG(sr.overall_rating), 0) AS overall_rating,
    COUNT(sr.id) AS review_count,
    COALESCE(st.rating, 0) AS coach_rating,
    COALESCE(
      (SELECT AVG(sr2.location_rating)
       FROM session_reviews sr2
       JOIN sessions s2 ON sr2.session_id = s2.id
       WHERE s2.location_id = l.id),
      0
    ) AS location_rating
  FROM sessions s
  JOIN programs p ON s.program_id = p.id
  JOIN locations l ON s.location_id = l.id
  LEFT JOIN staff st ON s.coach_id = st.id
  LEFT JOIN session_reviews sr ON sr.session_id = s.id
  GROUP BY s.id, p.name, l.name, st.name, st.rating, s.day_of_week, s.start_time, s.capacity, s.enrolled_count, l.id
  ORDER BY p.name, s.day_of_week, s.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;