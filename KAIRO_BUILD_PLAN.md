# Kairo Platform - Strategic Build Plan

**Version:** 2.0
**Last Updated:** December 2, 2025 (Afternoon)
**Current Stage:** Stage 2 In Progress (AI Integration Complete)

---

## Mission Statement

Transform youth sports registration from an 18-20 minute painful process into a seamless sub-5-minute (targeting 3 minutes) conversational experience using AI-powered registration with voice and text support.

**Core Value Proposition:** "Registration in 3 Minutes, Not 20"

---

## Architecture Decisions

### AI Model Strategy
- **Primary Model:** Google Gemini Flash (`gemini-flash-latest`)
  - Fast response times (<500ms)
  - Cost-effective for high-volume conversations
  - Strong natural language understanding
  - Good at structured data extraction
  - 5000 max output tokens for comprehensive responses

### Integration Pattern
- **Supabase Edge Functions** for AI orchestration (Deno runtime)
- **Direct Gemini API calls** from Edge Functions
- **Frontend → Edge Function → Gemini → Response** flow
- **Supabase client** for data operations within Edge Functions
- **Real-time subscriptions** for live availability updates

### Database
- **Supabase PostgreSQL** with Row Level Security
- **Real-time subscriptions** for live availability
- **Multi-tenant architecture** at organization level

---

## 12-Stage Development Roadmap

### ✅ Stage 1: Foundation (COMPLETED)
**Status:** Complete
**Completion Date:** December 2, 2025

**Deliverables:**
- [x] Complete database schema (13 tables)
- [x] Row Level Security policies
- [x] Supabase client setup
- [x] Authentication system (AuthContext)
- [x] Core TypeScript types
- [x] Mobile-first UI components (Button, Input, Card)
- [x] Basic chat interface with Kai
- [x] Demo seed data (Soccer Shots Demo org)

**Files Created:**
- `src/types/database.ts` - Database types
- `src/types/conversation.ts` - Conversation types
- `src/types/registration.ts` - Registration types
- `src/lib/supabase.ts` - Supabase client
- `src/contexts/AuthContext.tsx` - Auth management
- `src/components/common/` - Reusable UI components
- `src/components/registration/ChatInterface.tsx` - Main chat UI
- `src/components/registration/MessageBubble.tsx` - Message display

**Database Tables:**
1. organizations
2. locations
3. programs
4. sessions
5. staff
6. families
7. children
8. registrations
9. conversations
10. waitlist
11. payments
12. abandoned_carts
13. communications

---

### 🚧 Stage 2: Kai Intelligence & Voice (IN PROGRESS)
**Target Completion:** [TBD]

**Goals:**
- AI-powered conversational registration
- Voice input capability
- Smart class recommendations
- Waitlist prevention intelligence
- Multi-language support (English, Spanish)

**Completed Features:**

#### 2.1 AI Integration ✅
- [x] Supabase Edge Function for Kai conversation management (`kai-conversation`)
- [x] Gemini Flash API integration (`gemini-flash-latest`)
- [x] Intent recognition and data extraction (regex-based)
- [x] Context preservation across turns (conversation state)
- [x] Conversation state machine implementation
- [x] SystemInstruction for consistent Kai personality
- [x] Error handling with fallback to guided forms
- [x] Age validation (2-18 years)

#### 2.2 Smart Recommendations ✅
- [x] Age-based class filtering
- [x] Schedule compatibility matching (day of week, time of day)
- [x] Real-time availability checking
- [x] Session detail presentation with SessionCard UI
- [x] Coach rating display
- [x] Spots remaining urgency indicators
- [x] Session quality scoring
- [x] Up to 3 top recommendations shown
- [ ] Location-based sorting (proximity) - Deferred to later stage

#### 2.3 Waitlist Prevention (In Progress)
- [x] Adjacent day suggestions (Wed full → Tue/Thu)
- [x] Alternative time slots (same location)
- [x] Alternative locations (same time)
- [x] Similar program fallback options
- [x] Match scoring algorithm (90 for adjacent days, 85 for alt times, etc.)
- [x] `find-alternatives` Edge Function deployed
- [ ] Integration with Kai conversation flow
- [ ] Waitlist as last resort (<20% target)

#### 2.4 Voice Registration
- [ ] Web Speech API integration
- [ ] Voice activity detection
- [ ] Speech-to-text transcription
- [ ] Text-to-speech responses
- [ ] Fallback to text input
- [ ] Visual waveform feedback

#### 2.5 Multi-Language
- [ ] English (primary)
- [ ] Spanish (secondary)
- [ ] Language detection
- [ ] Translation layer

**Files Created:**
- `supabase/functions/kai-conversation/index.ts` - Kai AI Edge Function ✅
- `src/services/ai/kaiAgent.ts` - AI service layer ✅
- `src/hooks/useConversation.ts` - Conversation state hook ✅
- `supabase/functions/session-recommendations/index.ts` - Session matching Edge Function ✅
- `supabase/functions/find-alternatives/index.ts` - Waitlist alternatives Edge Function ✅
- `src/components/registration/SessionCard.tsx` - Session display component ✅

**Files to Create:**
- `src/hooks/useVoiceInput.ts` - Voice capture hook
- `src/utils/waitlistIntelligence.ts` - Frontend waitlist logic helper

**Edge Functions Architecture:**
1. **kai-conversation** ✅ (Deployed)
   - Endpoint: `/functions/v1/kai-conversation`
   - Handles: User messages, conversation state, AI responses
   - Gemini integration with systemInstruction
   - Data extraction (name, age, preferences)
   - State machine progression

2. **session-recommendations** ✅ (Deployed)
   - Endpoint: `/functions/v1/session-recommendations`
   - Input: child age, location preferences, schedule
   - Output: ranked session list with availability
   - Features: Quality scoring, urgency calculation, AI-powered messages

3. **find-alternatives** ✅ (Deployed)
   - Endpoint: `/functions/v1/find-alternatives`
   - Input: preferred session details, flexibility options
   - Output: alternative sessions with match scores
   - Strategies: Adjacent days (90 score), alternative times (85 score), alternative locations (80 score), similar programs (50 score)
   - Smart waitlist recommendation when <2 alternatives found

---

### ⏳ Stage 3: Payments & Retention (PLANNED)
**Target Start:** After Stage 2

**Goals:**
- Complete payment processing
- Cart abandonment recovery
- Re-enrollment automation
- Payment plans with clear monthly pricing

**Key Features:**
- [ ] Stripe integration
- [ ] Apple Pay / Google Pay
- [ ] Payment plans (monthly display)
- [ ] Failed payment recovery
- [ ] Abandoned cart detection
- [ ] Multi-touch recovery sequences
- [ ] Re-enrollment reminders
- [ ] One-click re-enroll

---

### ⏳ Stage 4: Business Intelligence (PLANNED)
**Goals:** Analytics, reporting, predictive insights

**Key Features:**
- [ ] Conversion funnel visualization
- [ ] Abandoned cart analytics
- [ ] Source/device tracking
- [ ] Drop-off analysis
- [ ] Revenue forecasting
- [ ] Churn prediction

---

### ⏳ Stage 5: Staff & Coach Tools (PLANNED)
**Goals:** Coach mobile app, curriculum management

**Key Features:**
- [ ] Coach mobile app
- [ ] Digital attendance
- [ ] Offline mode
- [ ] Parent messaging
- [ ] Lesson plan library

---

### ⏳ Stage 6: Advanced Scheduling (PLANNED)
**Goals:** Schedule creation, optimization, conflict detection

---

### ⏳ Stage 7: Upselling & Engagement (PLANNED)
**Goals:** Revenue maximization, lifecycle communications

---

### ⏳ Stage 8: Multi-Location & Franchise (PLANNED)
**Goals:** Multi-location operators, franchise support

---

### ⏳ Stage 9: Marketing Automation (PLANNED)
**Goals:** Social media, advertising, lead generation

---

### ⏳ Stage 10: White-Label & API (PLANNED)
**Goals:** Deep customization, third-party integrations

---

### ⏳ Stage 11: Data & Compliance (PLANNED)
**Goals:** COPPA/GDPR compliance, data portability

---

### ⏳ Stage 12: Advanced AI & Optimization (PLANNED)
**Goals:** Predictive models, optimization algorithms

---

## Edge Function Architecture

### Pattern Overview
```
Frontend (React) → Edge Function → Gemini Flash API → Response
                         ↓
                   Supabase Client
                         ↓
                   Database Update
                         ↓
                   Real-time Subscription
```

### Architecture Benefits
- **Serverless:** Auto-scaling Deno runtime
- **Secure:** API keys never exposed to frontend
- **Fast:** Edge deployment close to users
- **Type-safe:** TypeScript throughout
- **Integrated:** Direct Supabase client access

### Edge Function Structure

#### 1. kai-conversation (Deployed)
**Endpoint:** `https://[project].supabase.co/functions/v1/kai-conversation`

**Request:**
```json
{
  "message": "My son Connor is 4 years old",
  "conversationId": "uuid",
  "context": {
    "currentState": "collecting_child_info",
    "organizationId": "uuid",
    "familyId": "uuid",
    "children": [],
    "preferences": {}
  }
}
```

**Response:**
```json
{
  "success": true,
  "response": {
    "message": "Perfect! Connor is 4 years old. What days work best for you?",
    "nextState": "collecting_preferences",
    "extractedData": {
      "childName": "Connor",
      "childAge": 4
    },
    "quickReplies": ["Weekday afternoons", "Weekend mornings", "Show me all options"],
    "progress": 50
  }
}
```

**Implementation Details:**
- Gemini API integration with `systemInstruction`
- State machine: greeting → child_info → preferences → recommendations → confirmation
- Data extraction: name, age, days, times
- Conversation state persisted to Supabase
- 5000 max output tokens
- Comprehensive error handling

#### 2. session-recommendations (Planned)
**Endpoint:** `https://[project].supabase.co/functions/v1/session-recommendations`

**Request:**
```json
{
  "organizationId": "uuid",
  "childAge": 4,
  "preferences": {
    "location": null,
    "dayOfWeek": [1, 3, 5],
    "timeOfDay": "afternoon",
    "radius": 5
  }
}
```

**Response:**
```json
{
  "success": true,
  "sessions": [
    {
      "id": "uuid",
      "programName": "Junior Soccer",
      "locationName": "Lincoln Park",
      "distance": 2.3,
      "dayOfWeek": 3,
      "startTime": "16:00",
      "spotsRemaining": 4,
      "priceInCents": 16900,
      "coachName": "Coach Mike",
      "coachRating": 4.9
    }
  ],
  "totalCount": 12,
  "filteredCount": 3
}
```

#### 3. find-alternatives (Planned)
**Endpoint:** `https://[project].supabase.co/functions/v1/find-alternatives`

**Request:**
```json
{
  "sessionId": "uuid",
  "preferences": {
    "flexibleDays": true,
    "maxRadius": 10,
    "flexibleTime": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "alternatives": {
    "adjacentDays": [...],
    "expandedRadius": [...],
    "alternativeTimes": [...],
    "alternativeLocations": [...]
  },
  "recommendWaitlist": false
}
```

### Error Handling Pattern
```json
{
  "success": false,
  "error": {
    "code": "AI_ERROR",
    "message": "I'm having trouble understanding. Let me show you the options directly.",
    "fallbackToForm": true
  }
}
```

### Calling Edge Functions from Frontend
```typescript
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kai-conversation`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, conversationId, context }),
  }
);
```

---

## Environment Variables Setup

### Current Variables
```env
VITE_SUPABASE_URL=https://tatunnfxwfsyoiqoaenb.supabase.co
VITE_SUPABASE_ANON_KEY=[existing key]
```

### Edge Function Environment Variables (Server-side)
These are configured automatically in Supabase and do NOT need to be in `.env`:
```env
# Automatically available in Edge Functions
SUPABASE_URL=https://tatunnfxwfsyoiqoaenb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[auto-configured]
SUPABASE_ANON_KEY=[auto-configured]

# Configured via Supabase Dashboard > Edge Functions > Secrets
GEMINI_API_KEY=[configured via dashboard]
```

### Frontend Environment Variables
```env
# Feature Flags (optional)
VITE_ENABLE_VOICE=true
VITE_ENABLE_SPANISH=false
```

### Configuring Edge Function Secrets
Edge Function secrets are configured via Supabase dashboard, not in `.env`:
1. Go to Supabase Dashboard
2. Navigate to Edge Functions
3. Click "Manage secrets"
4. Add `GEMINI_API_KEY`

---

## Performance Targets

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Page Load (Mobile 4G) | < 3 seconds | > 5 seconds |
| Voice Response Latency | < 500ms | > 1 second |
| Kai Response Time | < 2 seconds | > 5 seconds |
| Registration Completion | < 5 minutes | > 8 minutes |
| Payment Processing | < 3 seconds | > 5 seconds |

---

## Testing Strategy

### Stage 1 Testing (Completed)
- [x] Database schema creation
- [x] RLS policy verification
- [x] Seed data insertion
- [x] TypeScript compilation
- [x] Build success

### Stage 2 Testing (Upcoming)
- [ ] AI conversation flow (happy path)
- [ ] Error handling and fallback
- [ ] Voice input/output
- [ ] Session recommendations accuracy
- [ ] Waitlist prevention logic
- [ ] Mobile device testing (iOS Safari, Chrome)
- [ ] One-handed operation verification
- [ ] Network interruption handling

---

## Development Principles

### S.C.A.T.E. Framework
Every development task follows:
- **S**cope - Precise boundaries
- **C**ontext - Why this matters
- **A**ction - Clear imperatives
- **T**echnology - Specific tools
- **E**xpectation - Definition of done

### Preservation Philosophy
- Protect existing working code
- Default to minimal changes
- Extend, don't replace
- Explicit preservation instructions

### Mobile-First Always
- 48px+ touch targets
- One-handed operation
- Works offline where possible
- Fast on 4G networks

---

## Quick Reference

### Demo Credentials
- Organization: Soccer Shots Demo
- Slug: `soccer-shots-demo`
- Programs: Mini Soccer (2-3yo), Junior Soccer (4-6yo), Premier Soccer (7-10yo)
- Locations: Lincoln Park, Riverside Park

### Key Commands
```bash
# Development
npm run dev

# Build
npm run build

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Database Access
```bash
# Via Supabase Dashboard
https://tatunnfxwfsyoiqoaenb.supabase.co

# Via code
import { supabase } from './lib/supabase'
```

---

## Next Immediate Steps

1. ✅ **Gemini API integration** - Edge Function deployed
2. ✅ **Kai conversation Edge Function** - `kai-conversation` live
3. ✅ **Conversation service layer** - `src/services/ai/kaiAgent.ts` created
4. **Implement session recommendations** - Create `session-recommendations` Edge Function
5. **Add voice input capability** - Web Speech API integration
6. **Test complete registration flow** - Full flow from greeting to payment

---

## Notes & Decisions Log

### December 2, 2025 - Morning
- ✅ Completed Stage 1 foundation
- ✅ Database schema with 13 tables
- ✅ RLS policies implemented
- ✅ Basic chat UI built
- 🎯 Decision: Use Gemini Flash for AI (speed + cost)
- 🎯 Decision: Mobile-first development approach

### December 2, 2025 - Afternoon
- ✅ Kai conversation Edge Function deployed
- ✅ Gemini Flash API integration (`gemini-flash-latest`)
- ✅ SystemInstruction for consistent Kai personality
- ✅ Data extraction logic (name, age, preferences)
- ✅ Conversation state machine (greeting → confirmation)
- ✅ Error handling with fallback to forms
- 🎯 **Major Decision: Supabase Edge Functions instead of N8N**
  - Rationale: Simpler architecture, better integration, type-safe
  - Edge Functions provide serverless Deno runtime
  - Direct Gemini API calls from Edge Functions
  - No external orchestration service needed
  - Secrets managed via Supabase dashboard
- 🎯 Decision: 5000 max output tokens for optimal UX (not cost-optimized)

### December 4, 2025
- ✅ Comprehensive test data added (12 programs, 8 coaches, 64 sessions)
- ✅ Full age coverage 2-18 across all activity types
- ✅ Section 2.2 (Smart Recommendations) completed
  - Age-based filtering working
  - Schedule compatibility matching working
  - SessionCard UI displaying recommendations beautifully
  - Quality scoring with coach ratings and urgency
- ✅ Section 2.3 (Waitlist Prevention) - Backend Complete
  - `find-alternatives` Edge Function deployed
  - 4 alternative strategies implemented:
    1. Adjacent days (same time, ±1 day)
    2. Alternative times (same day, different time)
    3. Alternative locations (same day/time, different location)
    4. Similar programs (age-appropriate fallback)
  - Match scoring algorithm (90-50 points based on similarity)
  - Smart waitlist recommendation when <2 alternatives
- 🎯 **Next: Integrate find-alternatives into Kai conversation flow**
- 🎯 **Next: Voice registration (Section 2.4)**

---

**Document Owner:** Development Team
**Review Frequency:** After each stage completion
**Last Reviewed:** December 2, 2025
