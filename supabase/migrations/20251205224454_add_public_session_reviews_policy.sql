/*
  # Add public read access to session reviews

  1. Changes
    - Add policy allowing public (anon) users to read session reviews
    - Reviews are public information that helps parents make informed decisions
    
  2. Security
    - Read-only access for anonymous users
    - Insert/Update policies remain restricted to authenticated family members
*/

-- Allow anonymous users to view all session reviews
CREATE POLICY "Anyone can view session reviews"
  ON session_reviews
  FOR SELECT
  TO anon
  USING (true);
