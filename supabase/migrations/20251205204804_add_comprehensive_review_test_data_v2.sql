/*
  # Add Comprehensive Session Review Test Data
  
  1. Purpose
    - Populate session_reviews table with realistic review data
    - Ensure sessions have reviews for rating display
    - Provide variety in ratings (4.0-5.0 range)
  
  2. What We're Adding
    - Reviews for active/full sessions using existing families
    - Both session ratings and location ratings
    - Mix of ratings and comments
*/

-- Add reviews using existing families and children in a round-robin fashion
WITH 
  target_sessions AS (
    SELECT s.id, p.name, ROW_NUMBER() OVER (ORDER BY s.created_at) as rn
    FROM sessions s
    JOIN programs p ON s.program_id = p.id
    WHERE s.status IN ('active', 'full')
    LIMIT 50
  ),
  families_list AS (
    SELECT id as family_id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
    FROM families
    LIMIT 10
  ),
  children_list AS (
    SELECT id as child_id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
    FROM children
    LIMIT 10
  )
INSERT INTO session_reviews (session_id, family_id, child_id, overall_rating, coach_rating, location_rating, comment, created_at)
SELECT 
  ts.id as session_id,
  fl.family_id,
  cl.child_id,
  (4.0 + (random() * 1.0))::numeric(2,1) as overall_rating,
  (4.0 + (random() * 1.0))::numeric(2,1) as coach_rating,
  (4.0 + (random() * 1.0))::numeric(2,1) as location_rating,
  CASE 
    WHEN random() < 0.2 THEN 'Excellent program! Highly recommend.'
    WHEN random() < 0.4 THEN 'Great coach and wonderful facility.'
    WHEN random() < 0.6 THEN 'My child loves this program!'
    WHEN random() < 0.8 THEN 'Very professional and well-organized.'
    ELSE 'Amazing experience for our family.'
  END as comment,
  now() - (random() * interval '60 days') as created_at
FROM target_sessions ts
CROSS JOIN LATERAL (
  SELECT family_id FROM families_list WHERE rn = (ts.rn % 10) + 1
) fl
CROSS JOIN LATERAL (
  SELECT child_id FROM children_list WHERE rn = (ts.rn % 10) + 1
) cl
ON CONFLICT DO NOTHING;

-- Add second round of reviews for even better coverage
WITH 
  target_sessions_2 AS (
    SELECT s.id, p.name, ROW_NUMBER() OVER (ORDER BY s.start_date) as rn
    FROM sessions s
    JOIN programs p ON s.program_id = p.id
    WHERE s.status IN ('active', 'full')
    LIMIT 40
  ),
  families_list AS (
    SELECT id as family_id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
    FROM families
    LIMIT 10
  ),
  children_list AS (
    SELECT id as child_id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
    FROM children
    LIMIT 10
  )
INSERT INTO session_reviews (session_id, family_id, child_id, overall_rating, coach_rating, location_rating, comment, created_at)
SELECT 
  ts.id as session_id,
  fl.family_id,
  cl.child_id,
  (4.2 + (random() * 0.8))::numeric(2,1) as overall_rating,
  (4.2 + (random() * 0.8))::numeric(2,1) as coach_rating,
  (4.1 + (random() * 0.9))::numeric(2,1) as location_rating,
  CASE 
    WHEN random() < 0.25 THEN 'Fantastic program, will definitely return!'
    WHEN random() < 0.5 THEN 'Instructors are patient and skilled.'
    WHEN random() < 0.75 THEN 'Great value for the quality provided.'
    ELSE 'Our child has grown so much here!'
  END as comment,
  now() - (random() * interval '30 days') as created_at
FROM target_sessions_2 ts
CROSS JOIN LATERAL (
  SELECT family_id FROM families_list WHERE rn = ((ts.rn + 5) % 10) + 1
) fl
CROSS JOIN LATERAL (
  SELECT child_id FROM children_list WHERE rn = ((ts.rn + 5) % 10) + 1
) cl
ON CONFLICT DO NOTHING;
