/*
  # Add Session Reviews for All Sessions
  
  Ensures every session has at least one review with a rating (1-5 scale)
*/

DO $$
DECLARE
  session_record RECORD;
  family_ids UUID[];
  child_ids UUID[];
  random_family UUID;
  random_child UUID;
  review_count INTEGER;
  base_rating NUMERIC;
  overall_val NUMERIC;
  coach_val NUMERIC;
  location_val NUMERIC;
BEGIN
  -- Get array of family and child IDs
  SELECT ARRAY_AGG(id) INTO family_ids FROM families LIMIT 20;
  SELECT ARRAY_AGG(id) INTO child_ids FROM children LIMIT 20;
  
  -- Loop through sessions without reviews
  FOR session_record IN 
    SELECT s.id 
    FROM sessions s
    LEFT JOIN session_reviews sr ON s.id = sr.session_id
    WHERE sr.id IS NULL
  LOOP
    -- Random number of reviews (1-3)
    review_count := 1 + floor(random() * 3)::INTEGER;
    
    -- Base rating for this session (4.0-5.0)
    base_rating := 4.0 + (random() * 1.0);
    
    -- Add reviews
    FOR i IN 1..review_count LOOP
      random_family := family_ids[1 + floor(random() * array_length(family_ids, 1))::INTEGER];
      random_child := child_ids[1 + floor(random() * array_length(child_ids, 1))::INTEGER];
      
      -- Calculate ratings with variations, ensuring they stay within 1-5 range
      overall_val := LEAST(5.0, GREATEST(1.0, ROUND((base_rating + (random() * 0.4 - 0.2))::NUMERIC, 1)));
      coach_val := LEAST(5.0, GREATEST(1.0, ROUND((base_rating + (random() * 0.6 - 0.3))::NUMERIC, 1)));
      location_val := LEAST(5.0, GREATEST(1.0, ROUND((base_rating + (random() * 0.4 - 0.2))::NUMERIC, 1)));
      
      INSERT INTO session_reviews (
        session_id,
        family_id,
        child_id,
        overall_rating,
        coach_rating,
        location_rating,
        comment,
        created_at
      ) VALUES (
        session_record.id,
        random_family,
        random_child,
        overall_val,
        coach_val,
        location_val,
        CASE 
          WHEN base_rating >= 4.7 THEN 'Excellent session! My child loved it.'
          WHEN base_rating >= 4.3 THEN 'Great experience overall.'
          ELSE 'Good session, some room for improvement.'
        END,
        now() - (random() * interval '60 days')
      );
    END LOOP;
  END LOOP;
END $$;