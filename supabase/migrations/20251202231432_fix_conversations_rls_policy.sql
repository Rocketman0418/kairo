/*
  # Fix Conversations RLS Policy

  ## Changes
  - Drop existing restrictive policies that prevent conversation creation
  - Add new policies that allow:
    - Anyone (authenticated or not) to INSERT conversations
    - Users to SELECT their own conversations (matched by family_id)
    - Users to UPDATE their own conversations (matched by family_id)
  
  ## Security Notes
  - Conversations can be created by anyone to support anonymous registration flow
  - Once a family_id is set, only that family can access the conversation
  - Edge Functions use service_role key to bypass RLS for updates
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Families can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Families can manage own conversations" ON conversations;

-- Allow anyone to create conversations (for anonymous registration)
CREATE POLICY "Anyone can create conversations"
  ON conversations
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow users to view their own conversations
CREATE POLICY "Users can view own conversations"
  ON conversations
  FOR SELECT
  TO public
  USING (
    family_id IS NULL OR
    family_id IN (
      SELECT id FROM families WHERE user_id = auth.uid()
    )
  );

-- Allow users to update their own conversations
CREATE POLICY "Users can update own conversations"
  ON conversations
  FOR UPDATE
  TO public
  USING (
    family_id IS NULL OR
    family_id IN (
      SELECT id FROM families WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    family_id IS NULL OR
    family_id IN (
      SELECT id FROM families WHERE user_id = auth.uid()
    )
  );
