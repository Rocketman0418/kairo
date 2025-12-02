# Kairo Platform - Strategic Build Plan

**Version:** 1.0
**Last Updated:** December 2, 2025
**Current Stage:** Stage 1 Complete → Moving to Stage 2

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

### Integration Pattern
- **N8N Workflows** for all AI orchestration
- **Webhook-based** communication (UI ↔ N8N ↔ AI)
- **Supabase Edge Functions** for lightweight operations
- **Direct Supabase calls** for data operations

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

**Planned Features:**

#### 2.1 AI Integration
- [ ] N8N workflow for Kai conversation management
- [ ] Gemini Flash API integration
- [ ] Intent recognition and data extraction
- [ ] Context preservation across turns
- [ ] Conversation state machine implementation

#### 2.2 Smart Recommendations
- [ ] Age-based class filtering
- [ ] Location-based sorting (proximity)
- [ ] Schedule compatibility matching
- [ ] Real-time availability checking
- [ ] Session detail presentation

#### 2.3 Waitlist Prevention
- [ ] Adjacent day suggestions (Wed full → Tue/Thu)
- [ ] Expanded radius suggestions (5mi → 7mi)
- [ ] Alternative time slots (same location)
- [ ] Alternative locations (same time)
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

**Key Files to Create:**
- `src/services/ai/kaiAgent.ts` - AI service layer
- `src/services/ai/geminiClient.ts` - Gemini API wrapper
- `src/hooks/useConversation.ts` - Conversation state hook
- `src/hooks/useVoiceInput.ts` - Voice capture hook
- `src/utils/recommendations.ts` - Recommendation logic
- `src/utils/waitlistIntelligence.ts` - Alternative suggestions

**N8N Workflows Needed:**
1. **Kai Conversation Flow**
   - Webhook: `/webhook/kai-message`
   - Input: user message, conversation context
   - Output: AI response, next state, extracted data

2. **Session Recommendations**
   - Webhook: `/webhook/recommend-sessions`
   - Input: child age, location preferences, schedule
   - Output: ranked session list

3. **Waitlist Alternatives**
   - Webhook: `/webhook/find-alternatives`
   - Input: preferred session details
   - Output: alternative sessions (adjacent days, expanded radius, etc.)

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

## N8N Webhook Architecture

### Pattern Overview
```
Frontend (React) → N8N Webhook → Gemini Flash → Data Processing → Response
                        ↓
                  Supabase Write
                        ↓
                  Real-time Update
```

### Webhook Structure

#### 1. Kai Conversation Webhook
**Endpoint:** `https://[n8n-instance]/webhook/kai-message`

**Request:**
```json
{
  "message": "My son Connor is 4 years old",
  "conversationId": "uuid",
  "context": {
    "state": "collecting_child_info",
    "organizationId": "uuid",
    "familyId": "uuid",
    "messages": [...],
    "extractedData": {}
  }
}
```

**Response:**
```json
{
  "success": true,
  "response": {
    "message": "Perfect! Connor is 4 years old. I found 3 classes...",
    "nextState": "showing_recommendations",
    "extractedData": {
      "childName": "Connor",
      "childAge": 4
    },
    "quickReplies": ["Show me Wednesday classes", "Show me Saturday classes"],
    "sessions": [...]
  }
}
```

#### 2. Session Recommendations Webhook
**Endpoint:** `https://[n8n-instance]/webhook/recommend-sessions`

**Request:**
```json
{
  "organizationId": "uuid",
  "childAge": 4,
  "preferences": {
    "location": null,
    "dayOfWeek": null,
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

#### 3. Waitlist Alternatives Webhook
**Endpoint:** `https://[n8n-instance]/webhook/find-alternatives`

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
    "code": "AI_TIMEOUT",
    "message": "I'm having trouble understanding. Let me show you the options directly.",
    "fallbackToForm": true
  }
}
```

---

## Environment Variables Setup

### Current Variables
```env
VITE_SUPABASE_URL=https://tatunnfxwfsyoiqoaenb.supabase.co
VITE_SUPABASE_ANON_KEY=[existing key]
```

### Required for Stage 2
```env
# Gemini AI
VITE_GEMINI_API_KEY=[to be provided]

# N8N Webhooks
VITE_N8N_WEBHOOK_BASE_URL=https://[your-n8n-instance]
VITE_N8N_KAI_WEBHOOK=/webhook/kai-message
VITE_N8N_RECOMMENDATIONS_WEBHOOK=/webhook/recommend-sessions
VITE_N8N_ALTERNATIVES_WEBHOOK=/webhook/find-alternatives

# Feature Flags
VITE_ENABLE_VOICE=true
VITE_ENABLE_SPANISH=true
```

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

1. **Set up Gemini API key** in `.env`
2. **Create N8N workflows** for Kai conversation
3. **Build conversation service layer** (`src/services/ai/`)
4. **Implement session recommendations** with real data
5. **Add voice input capability** (Web Speech API)
6. **Test complete registration flow** with mock data

---

## Notes & Decisions Log

### December 2, 2025
- ✅ Completed Stage 1 foundation
- ✅ Database schema with 13 tables
- ✅ RLS policies implemented
- ✅ Basic chat UI built
- 🎯 Decision: Use Gemini Flash for AI (speed + cost)
- 🎯 Decision: N8N webhooks for AI orchestration
- 🎯 Decision: Mobile-first development approach

---

**Document Owner:** Development Team
**Review Frequency:** After each stage completion
**Last Reviewed:** December 2, 2025
