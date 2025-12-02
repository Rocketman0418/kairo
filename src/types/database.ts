export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          settings: Json
          branding: Json
          ai_agent_name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          settings?: Json
          branding?: Json
          ai_agent_name?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          settings?: Json
          branding?: Json
          ai_agent_name?: string
          created_at?: string
          updated_at?: string
        }
      }
      locations: {
        Row: {
          id: string
          organization_id: string
          name: string
          address: string | null
          geo_coordinates: unknown | null
          time_windows: Json
          capacity: number | null
          amenities: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          address?: string | null
          geo_coordinates?: unknown | null
          time_windows?: Json
          capacity?: number | null
          amenities?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          address?: string | null
          geo_coordinates?: unknown | null
          time_windows?: Json
          capacity?: number | null
          amenities?: Json
          created_at?: string
          updated_at?: string
        }
      }
      programs: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string | null
          age_range: string | null
          duration_weeks: number | null
          price_cents: number
          payment_plan_options: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          description?: string | null
          age_range?: string | null
          duration_weeks?: number | null
          price_cents: number
          payment_plan_options?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          description?: string | null
          age_range?: string | null
          duration_weeks?: number | null
          price_cents?: number
          payment_plan_options?: Json
          created_at?: string
          updated_at?: string
        }
      }
      staff: {
        Row: {
          id: string
          organization_id: string
          user_id: string | null
          name: string
          role: string
          rating: number | null
          availability: Json
          certifications: Json
          background_check_status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id?: string | null
          name: string
          role?: string
          rating?: number | null
          availability?: Json
          certifications?: Json
          background_check_status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string | null
          name?: string
          role?: string
          rating?: number | null
          availability?: Json
          certifications?: Json
          background_check_status?: string
          created_at?: string
          updated_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          program_id: string
          location_id: string | null
          coach_id: string | null
          start_date: string
          end_date: string | null
          day_of_week: number | null
          start_time: string
          capacity: number
          enrolled_count: number
          waitlist_count: number
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          program_id: string
          location_id?: string | null
          coach_id?: string | null
          start_date: string
          end_date?: string | null
          day_of_week?: number | null
          start_time: string
          capacity: number
          enrolled_count?: number
          waitlist_count?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          program_id?: string
          location_id?: string | null
          coach_id?: string | null
          start_date?: string
          end_date?: string | null
          day_of_week?: number | null
          start_time?: string
          capacity?: number
          enrolled_count?: number
          waitlist_count?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      families: {
        Row: {
          id: string
          user_id: string | null
          primary_contact_name: string
          email: string
          phone: string | null
          address: Json
          preferences: Json
          engagement_score: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          primary_contact_name: string
          email: string
          phone?: string | null
          address?: Json
          preferences?: Json
          engagement_score?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          primary_contact_name?: string
          email?: string
          phone?: string | null
          address?: Json
          preferences?: Json
          engagement_score?: number
          created_at?: string
          updated_at?: string
        }
      }
      children: {
        Row: {
          id: string
          family_id: string
          first_name: string
          last_name: string | null
          date_of_birth: string
          medical_info: Json
          skill_level: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          family_id: string
          first_name: string
          last_name?: string | null
          date_of_birth: string
          medical_info?: Json
          skill_level?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          first_name?: string
          last_name?: string | null
          date_of_birth?: string
          medical_info?: Json
          skill_level?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      registrations: {
        Row: {
          id: string
          session_id: string
          child_id: string
          family_id: string
          status: string
          payment_status: string
          payment_method: string | null
          amount_cents: number | null
          enrolled_at: string | null
          registration_channel: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          child_id: string
          family_id: string
          status?: string
          payment_status?: string
          payment_method?: string | null
          amount_cents?: number | null
          enrolled_at?: string | null
          registration_channel?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          child_id?: string
          family_id?: string
          status?: string
          payment_status?: string
          payment_method?: string | null
          amount_cents?: number | null
          enrolled_at?: string | null
          registration_channel?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          family_id: string | null
          channel: string
          state: string
          context: Json
          messages: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          family_id?: string | null
          channel?: string
          state?: string
          context?: Json
          messages?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          family_id?: string | null
          channel?: string
          state?: string
          context?: Json
          messages?: Json
          created_at?: string
          updated_at?: string
        }
      }
      waitlist: {
        Row: {
          id: string
          session_id: string
          child_id: string
          family_id: string
          position: number | null
          alternatives_shown: Json
          status: string
          created_at: string
          notified_at: string | null
        }
        Insert: {
          id?: string
          session_id: string
          child_id: string
          family_id: string
          position?: number | null
          alternatives_shown?: Json
          status?: string
          created_at?: string
          notified_at?: string | null
        }
        Update: {
          id?: string
          session_id?: string
          child_id?: string
          family_id?: string
          position?: number | null
          alternatives_shown?: Json
          status?: string
          created_at?: string
          notified_at?: string | null
        }
      }
      payments: {
        Row: {
          id: string
          registration_id: string | null
          family_id: string
          amount_cents: number
          status: string
          stripe_payment_intent_id: string | null
          payment_method_type: string | null
          receipt_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          registration_id?: string | null
          family_id: string
          amount_cents: number
          status?: string
          stripe_payment_intent_id?: string | null
          payment_method_type?: string | null
          receipt_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          registration_id?: string | null
          family_id?: string
          amount_cents?: number
          status?: string
          stripe_payment_intent_id?: string | null
          payment_method_type?: string | null
          receipt_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      abandoned_carts: {
        Row: {
          id: string
          family_id: string
          conversation_id: string | null
          cart_data: Json
          abandoned_at_state: string | null
          recovery_attempts: number
          recovered: boolean
          created_at: string
          last_recovery_attempt: string | null
        }
        Insert: {
          id?: string
          family_id: string
          conversation_id?: string | null
          cart_data?: Json
          abandoned_at_state?: string | null
          recovery_attempts?: number
          recovered?: boolean
          created_at?: string
          last_recovery_attempt?: string | null
        }
        Update: {
          id?: string
          family_id?: string
          conversation_id?: string | null
          cart_data?: Json
          abandoned_at_state?: string | null
          recovery_attempts?: number
          recovered?: boolean
          created_at?: string
          last_recovery_attempt?: string | null
        }
      }
      communications: {
        Row: {
          id: string
          family_id: string
          type: string
          template_id: string | null
          subject: string | null
          content: string | null
          status: string
          sent_at: string | null
          opened_at: string | null
          clicked_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          family_id: string
          type: string
          template_id?: string | null
          subject?: string | null
          content?: string | null
          status?: string
          sent_at?: string | null
          opened_at?: string | null
          clicked_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          type?: string
          template_id?: string | null
          subject?: string | null
          content?: string | null
          status?: string
          sent_at?: string | null
          opened_at?: string | null
          clicked_at?: string | null
          created_at?: string
        }
      }
    }
  }
}
