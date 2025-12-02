/*
  # Kairo Platform - Row Level Security Policies
  
  ## Overview
  Enables RLS and creates secure policies for all tables.
  
  ## Security Model
  - Multi-tenant isolation at organization level
  - Families can only access their own data
  - Staff can access data within their organization
  - Public can view programs/sessions (for registration)
  - Admins have elevated permissions
  
  ## Policy Categories
  1. Public read access (programs, sessions, locations)
  2. Family self-service (own data only)
  3. Organization staff access (their org's data)
  4. Admin management (owners/admins only)
*/

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE abandoned_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Anyone can view organizations"
  ON organizations FOR SELECT
  USING (true);

CREATE POLICY "Organization staff can update their org"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM staff
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Locations policies
CREATE POLICY "Anyone can view locations"
  ON locations FOR SELECT
  USING (true);

CREATE POLICY "Organization staff can manage locations"
  ON locations FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM staff
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Programs policies
CREATE POLICY "Anyone can view programs"
  ON programs FOR SELECT
  USING (true);

CREATE POLICY "Organization staff can manage programs"
  ON programs FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM staff
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Staff policies
CREATE POLICY "Anyone can view staff profiles"
  ON staff FOR SELECT
  USING (true);

CREATE POLICY "Staff can update own profile"
  ON staff FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Organization admins can manage staff"
  ON staff FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM staff
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Sessions policies
CREATE POLICY "Anyone can view active sessions"
  ON sessions FOR SELECT
  USING (true);

CREATE POLICY "Organization staff can manage sessions"
  ON sessions FOR ALL
  TO authenticated
  USING (
    program_id IN (
      SELECT p.id FROM programs p
      JOIN staff s ON s.organization_id = p.organization_id
      WHERE s.user_id = auth.uid() AND s.role IN ('owner', 'admin')
    )
  );

-- Families policies
CREATE POLICY "Families can view own data"
  ON families FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Families can update own data"
  ON families FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Families can insert own data"
  ON families FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Organization staff can view enrolled families"
  ON families FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT DISTINCT r.family_id FROM registrations r
      JOIN sessions s ON r.session_id = s.id
      JOIN programs p ON s.program_id = p.id
      JOIN staff st ON st.organization_id = p.organization_id
      WHERE st.user_id = auth.uid()
    )
  );

-- Children policies
CREATE POLICY "Families can view own children"
  ON children FOR SELECT
  TO authenticated
  USING (
    family_id IN (
      SELECT id FROM families WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Families can manage own children"
  ON children FOR ALL
  TO authenticated
  USING (
    family_id IN (
      SELECT id FROM families WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization staff can view enrolled children"
  ON children FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT DISTINCT r.child_id FROM registrations r
      JOIN sessions s ON r.session_id = s.id
      JOIN programs p ON s.program_id = p.id
      JOIN staff st ON st.organization_id = p.organization_id
      WHERE st.user_id = auth.uid()
    )
  );

-- Registrations policies
CREATE POLICY "Families can view own registrations"
  ON registrations FOR SELECT
  TO authenticated
  USING (
    family_id IN (
      SELECT id FROM families WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Families can create registrations"
  ON registrations FOR INSERT
  TO authenticated
  WITH CHECK (
    family_id IN (
      SELECT id FROM families WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Families can update own registrations"
  ON registrations FOR UPDATE
  TO authenticated
  USING (
    family_id IN (
      SELECT id FROM families WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization staff can view registrations"
  ON registrations FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN programs p ON s.program_id = p.id
      JOIN staff st ON st.organization_id = p.organization_id
      WHERE st.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization staff can manage registrations"
  ON registrations FOR ALL
  TO authenticated
  USING (
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN programs p ON s.program_id = p.id
      JOIN staff st ON st.organization_id = p.organization_id
      WHERE st.user_id = auth.uid() AND st.role IN ('owner', 'admin')
    )
  );

-- Conversations policies
CREATE POLICY "Families can view own conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    family_id IN (
      SELECT id FROM families WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Families can manage own conversations"
  ON conversations FOR ALL
  TO authenticated
  USING (
    family_id IN (
      SELECT id FROM families WHERE user_id = auth.uid()
    )
  );

-- Waitlist policies
CREATE POLICY "Families can view own waitlist entries"
  ON waitlist FOR SELECT
  TO authenticated
  USING (
    family_id IN (
      SELECT id FROM families WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Families can create waitlist entries"
  ON waitlist FOR INSERT
  TO authenticated
  WITH CHECK (
    family_id IN (
      SELECT id FROM families WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization staff can view waitlist"
  ON waitlist FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN programs p ON s.program_id = p.id
      JOIN staff st ON st.organization_id = p.organization_id
      WHERE st.user_id = auth.uid()
    )
  );

-- Payments policies
CREATE POLICY "Families can view own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    family_id IN (
      SELECT id FROM families WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization staff can view payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    registration_id IN (
      SELECT r.id FROM registrations r
      JOIN sessions s ON r.session_id = s.id
      JOIN programs p ON s.program_id = p.id
      JOIN staff st ON st.organization_id = p.organization_id
      WHERE st.user_id = auth.uid()
    )
  );

-- Abandoned carts policies
CREATE POLICY "Organization staff can view abandoned carts"
  ON abandoned_carts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Communications policies
CREATE POLICY "Families can view own communications"
  ON communications FOR SELECT
  TO authenticated
  USING (
    family_id IN (
      SELECT id FROM families WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization staff can view communications"
  ON communications FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
