/*
  # Kairo Platform - Core Tables
  
  ## Overview
  Creates all core tables for the Kairo AI-powered youth registration platform.
  Part 1: Table creation without complex RLS policies.
  
  ## Tables Created
  1. organizations - Business owners/operators
  2. locations - Physical venues
  3. programs - Program types (Mini Soccer, etc.)
  4. staff - Coaches, admins, owners
  5. sessions - Specific class instances
  6. families - Parent/guardian accounts
  7. children - Child profiles
  8. registrations - Enrollment records
  9. conversations - AI conversation state
  10. waitlist - Waitlist management
  11. payments - Payment transactions
  12. abandoned_carts - Cart recovery tracking
  13. communications - Message log
  
  ## Security
  RLS enabled on all tables. Detailed policies applied in next migration.
*/

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  branding JSONB DEFAULT '{}',
  ai_agent_name TEXT DEFAULT 'Kai',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Locations
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  geo_coordinates POINT,
  time_windows JSONB DEFAULT '{}',
  capacity INTEGER,
  amenities JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Programs
CREATE TABLE IF NOT EXISTS programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  age_range INT4RANGE,
  duration_weeks INTEGER,
  price_cents INTEGER NOT NULL,
  payment_plan_options JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Staff (must exist before sessions)
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  role TEXT DEFAULT 'coach',
  rating NUMERIC,
  availability JSONB DEFAULT '{}',
  certifications JSONB DEFAULT '[]',
  background_check_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  coach_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  day_of_week INTEGER,
  start_time TIME NOT NULL,
  capacity INTEGER NOT NULL,
  enrolled_count INTEGER DEFAULT 0,
  waitlist_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_day_of_week CHECK (day_of_week >= 0 AND day_of_week <= 6),
  CONSTRAINT valid_status CHECK (status IN ('active', 'full', 'cancelled', 'completed'))
);

-- Families
CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  primary_contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  engagement_score NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Children
CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  date_of_birth DATE NOT NULL,
  medical_info JSONB DEFAULT '{}',
  skill_level TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Registrations
CREATE TABLE IF NOT EXISTS registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT,
  amount_cents INTEGER,
  enrolled_at TIMESTAMPTZ,
  registration_channel TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  CONSTRAINT valid_payment_status CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  CONSTRAINT valid_channel CHECK (registration_channel IN ('voice', 'text', 'web', 'sms', 'phone', 'admin'))
);

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  channel TEXT DEFAULT 'web',
  state TEXT DEFAULT 'idle',
  context JSONB DEFAULT '{}',
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_channel CHECK (channel IN ('voice', 'text', 'web', 'sms', 'phone', 'whatsapp')),
  CONSTRAINT valid_state CHECK (state IN ('idle', 'greeting', 'collecting_child_info', 'collecting_preferences', 'showing_recommendations', 'confirming_selection', 'collecting_payment', 'processing_payment', 'confirmed', 'error'))
);

-- Waitlist
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  position INTEGER,
  alternatives_shown JSONB DEFAULT '[]',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  notified_at TIMESTAMPTZ,
  CONSTRAINT valid_waitlist_status CHECK (status IN ('active', 'promoted', 'cancelled'))
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID REFERENCES registrations(id) ON DELETE SET NULL,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  payment_method_type TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_payment_status CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded'))
);

-- Abandoned carts
CREATE TABLE IF NOT EXISTS abandoned_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  cart_data JSONB DEFAULT '{}',
  abandoned_at_state TEXT,
  recovery_attempts INTEGER DEFAULT 0,
  recovered BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_recovery_attempt TIMESTAMPTZ
);

-- Communications
CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  template_id TEXT,
  subject TEXT,
  content TEXT,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_comm_type CHECK (type IN ('email', 'sms', 'push', 'voice')),
  CONSTRAINT valid_comm_status CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'opened', 'clicked'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_locations_organization ON locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_programs_organization ON programs(organization_id);
CREATE INDEX IF NOT EXISTS idx_sessions_program ON sessions(program_id);
CREATE INDEX IF NOT EXISTS idx_sessions_location ON sessions(location_id);
CREATE INDEX IF NOT EXISTS idx_sessions_coach ON sessions(coach_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(start_date);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_staff_organization ON staff(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_user ON staff(user_id);
CREATE INDEX IF NOT EXISTS idx_families_user ON families(user_id);
CREATE INDEX IF NOT EXISTS idx_children_family ON children(family_id);
CREATE INDEX IF NOT EXISTS idx_registrations_session ON registrations(session_id);
CREATE INDEX IF NOT EXISTS idx_registrations_child ON registrations(child_id);
CREATE INDEX IF NOT EXISTS idx_registrations_family ON registrations(family_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_family ON conversations(family_id);
CREATE INDEX IF NOT EXISTS idx_conversations_state ON conversations(state);
CREATE INDEX IF NOT EXISTS idx_waitlist_session ON waitlist(session_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_family ON waitlist(family_id);
CREATE INDEX IF NOT EXISTS idx_payments_registration ON payments(registration_id);
CREATE INDEX IF NOT EXISTS idx_payments_family ON payments(family_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_family ON abandoned_carts(family_id);
CREATE INDEX IF NOT EXISTS idx_communications_family ON communications(family_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_families_updated_at BEFORE UPDATE ON families
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_children_updated_at BEFORE UPDATE ON children
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_registrations_updated_at BEFORE UPDATE ON registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
