/*
  # Remove Unnecessary Session Review Columns

  ## Changes
  - Removes `time_slot_rating`, `value_rating`, and `would_recommend` columns from session_reviews table
  - These columns are no longer needed as session rating will only use overall_rating, coach_rating, and location_rating
  
  ## Important Notes
  - Existing review data for overall_rating, coach_rating, and location_rating will be preserved
  - The UI will display "Session Rating" based on overall_rating
  - Session quality calculation will only use coach_rating and location_rating averages
*/

-- Remove unnecessary columns from session_reviews table
DO $$
BEGIN
  -- Remove time_slot_rating column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'session_reviews' AND column_name = 'time_slot_rating'
  ) THEN
    ALTER TABLE session_reviews DROP COLUMN time_slot_rating;
  END IF;

  -- Remove value_rating column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'session_reviews' AND column_name = 'value_rating'
  ) THEN
    ALTER TABLE session_reviews DROP COLUMN value_rating;
  END IF;

  -- Remove would_recommend column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'session_reviews' AND column_name = 'would_recommend'
  ) THEN
    ALTER TABLE session_reviews DROP COLUMN would_recommend;
  END IF;
END $$;
