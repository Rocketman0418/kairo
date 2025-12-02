# N8N Integration Architecture

**Purpose:** Document N8N webhook patterns and Gemini Flash integration for Kairo platform
**Last Updated:** December 2, 2025

---

## Overview

Kairo uses N8N workflows to orchestrate AI conversations and backend processing. This keeps the frontend lightweight and allows us to modify AI behavior without code deployments.

### Benefits
- ✅ Separation of concerns (UI vs AI logic)
- ✅ Easy workflow updates without code changes
- ✅ Better error handling and retry logic
- ✅ Async processing for heavy tasks
- ✅ Centralized logging and monitoring
- ✅ Ability to chain multiple AI agents

---

## Architecture Pattern

```
┌─────────────┐
│   React UI  │
│  (Frontend) │
└──────┬──────┘
       │ HTTP POST
       ↓
┌─────────────┐
│  N8N Webhook│
│   Endpoint  │
└──────┬──────┘
       │
       ├──→ Gemini Flash API
       ├──→ Supabase Database
       ├──→ Data Processing
       └──→ Business Logic

       ↓
┌─────────────┐
│   Response  │
│   to UI     │
└─────────────┘
```

---

## Workflow 1: Kai Conversation Handler

### Purpose
Handle all conversational AI interactions for registration

### Webhook URL
`POST https://[n8n-instance]/webhook/kai-message`

### N8N Workflow Steps

#### Step 1: Webhook Trigger
- Method: POST
- Authentication: None (public endpoint)
- Validate required fields

#### Step 2: Load Conversation Context
```javascript
// Supabase query
SELECT * FROM conversations
WHERE id = {{$json.conversationId}}
```

#### Step 3: Build Gemini Prompt
```javascript
const systemPrompt = `You are Kai, a friendly AI assistant helping parents register their children for youth sports programs.

Your role:
- Guide parents through registration in under 5 minutes
- Ask ONE question at a time
- Be warm, efficient, and empathetic
- Extract key information: child name, age, location preferences, schedule preferences
- Recommend 2-3 suitable classes based on their needs
- Handle corrections gracefully

Current conversation state: {{$json.context.state}}
Organization: {{$json.context.organizationId}}

Previous messages:
{{$json.context.messages}}

Parent's latest message: "{{$json.message}}"

Respond naturally and move the conversation forward. Extract any relevant data about the child or preferences.`;

// Call Gemini Flash
{
  model: "gemini-flash-latest",
  prompt: systemPrompt,
  temperature: 0.7,
  maxTokens: 300
}
```

#### Step 4: Parse AI Response
```javascript
// Extract structured data from response
const extractedData = {
  childName: extractFromText(response, 'name'),
  childAge: extractFromText(response, 'age'),
  location: extractFromText(response, 'location'),
  dayPreference: extractFromText(response, 'day'),
  timePreference: extractFromText(response, 'time')
};

// Determine next state
const nextState = determineNextState(currentState, extractedData);
```

#### Step 5: Update Conversation in Database
```javascript
// Supabase update
UPDATE conversations
SET
  state = {{nextState}},
  context = {{updatedContext}},
  messages = {{allMessages}},
  updated_at = now()
WHERE id = {{conversationId}}
```

#### Step 6: Return Response
```json
{
  "success": true,
  "response": {
    "message": "Great! Connor is 4 years old. Let me find the perfect soccer class for him. What area do you live in?",
    "nextState": "collecting_preferences",
    "extractedData": {
      "childName": "Connor",
      "childAge": 4
    },
    "quickReplies": ["Lincoln Park area", "Riverside area", "Show me all locations"],
    "progress": 40
  }
}
```

### Error Handling
```javascript
if (geminiTimeout || geminiError) {
  return {
    "success": false,
    "error": {
      "code": "AI_UNAVAILABLE",
      "message": "I'm having trouble right now. Let me show you a form to continue.",
      "fallbackToForm": true
    }
  };
}
```

---

## Workflow 2: Session Recommendations

### Purpose
Find and rank suitable sessions based on child age and preferences

### Webhook URL
`POST https://[n8n-instance]/webhook/recommend-sessions`

### N8N Workflow Steps

#### Step 1: Webhook Trigger
```json
{
  "organizationId": "uuid",
  "childAge": 4,
  "preferences": {
    "location": "Lincoln Park",
    "dayOfWeek": [3, 4],
    "timeOfDay": "afternoon",
    "radius": 5
  }
}
```

#### Step 2: Query Available Sessions
```sql
SELECT
  s.id,
  s.start_date,
  s.end_date,
  s.day_of_week,
  s.start_time,
  s.capacity,
  s.enrolled_count,
  (s.capacity - s.enrolled_count) as spots_remaining,
  p.name as program_name,
  p.description as program_description,
  p.price_cents,
  p.duration_weeks,
  p.age_range,
  l.name as location_name,
  l.address as location_address,
  st.name as coach_name,
  st.rating as coach_rating
FROM sessions s
JOIN programs p ON s.program_id = p.id
JOIN locations l ON s.location_id = l.id
LEFT JOIN staff st ON s.coach_id = st.id
WHERE
  p.organization_id = {{organizationId}}
  AND s.status = 'active'
  AND (s.capacity - s.enrolled_count) > 0
  AND p.age_range @> {{childAge}}::integer
  AND ({{dayOfWeek}} IS NULL OR s.day_of_week = ANY({{dayOfWeek}}))
ORDER BY
  spots_remaining DESC,
  st.rating DESC NULLS LAST,
  s.start_date ASC
LIMIT 10;
```

#### Step 3: Apply AI Ranking (Optional)
```javascript
// Use Gemini to provide personalized ranking
const rankingPrompt = `Given these sessions and parent preferences:
Preferences: ${JSON.stringify(preferences)}
Sessions: ${JSON.stringify(sessions)}

Rank the top 3 sessions that best match the parent's needs. Consider:
- Location proximity
- Day/time fit
- Spots remaining (create urgency)
- Coach rating

Return JSON: { "rankedSessionIds": ["uuid1", "uuid2", "uuid3"], "reasoning": "..." }`;
```

#### Step 4: Return Ranked Results
```json
{
  "success": true,
  "sessions": [
    {
      "id": "uuid",
      "programName": "Junior Soccer",
      "programDescription": "...",
      "locationName": "Lincoln Park",
      "locationAddress": "123 Park Ave",
      "dayOfWeek": 3,
      "dayName": "Wednesday",
      "startTime": "16:00",
      "displayTime": "4:00 PM",
      "spotsRemaining": 4,
      "priceInCents": 16900,
      "displayPrice": "$169",
      "monthlyPrice": "$89",
      "durationWeeks": 8,
      "coachName": "Coach Mike",
      "coachRating": 4.9,
      "urgency": "high"
    }
  ],
  "totalCount": 12,
  "displayedCount": 3,
  "reasoning": "These Wednesday and Thursday afternoon classes are closest to you and have great coaches."
}
```

---

## Workflow 3: Waitlist Alternatives

### Purpose
When preferred session is full, suggest alternatives before offering waitlist

### Webhook URL
`POST https://[n8n-instance]/webhook/find-alternatives`

### N8N Workflow Steps

#### Step 1: Get Original Session Details
```sql
SELECT
  s.*,
  p.name,
  l.name as location_name,
  l.geo_coordinates
FROM sessions s
JOIN programs p ON s.program_id = p.id
JOIN locations l ON s.location_id = l.id
WHERE s.id = {{sessionId}}
```

#### Step 2: Find Adjacent Day Alternatives
```sql
-- Same location, same time, +/- 1 day
SELECT * FROM sessions s
WHERE
  s.location_id = {{originalLocationId}}
  AND s.start_time = {{originalStartTime}}
  AND s.day_of_week IN ({{originalDay - 1}}, {{originalDay + 1}})
  AND (s.capacity - s.enrolled_count) > 0
  AND s.status = 'active'
LIMIT 3;
```

#### Step 3: Find Expanded Radius Alternatives
```sql
-- Same day/time, nearby locations (within 10 miles)
SELECT
  s.*,
  l.name as location_name,
  ST_Distance(l.geo_coordinates, {{originalGeoCoordinates}}) as distance
FROM sessions s
JOIN locations l ON s.location_id = l.id
WHERE
  s.day_of_week = {{originalDay}}
  AND s.start_time = {{originalStartTime}}
  AND s.location_id != {{originalLocationId}}
  AND (s.capacity - s.enrolled_count) > 0
  AND s.status = 'active'
  AND ST_Distance(l.geo_coordinates, {{originalGeoCoordinates}}) < 16093.4 -- 10 miles in meters
ORDER BY distance ASC
LIMIT 3;
```

#### Step 4: Find Alternative Time Slots
```sql
-- Same location, same day, different times
SELECT * FROM sessions s
WHERE
  s.location_id = {{originalLocationId}}
  AND s.day_of_week = {{originalDay}}
  AND s.start_time != {{originalStartTime}}
  AND (s.capacity - s.enrolled_count) > 0
  AND s.status = 'active'
ORDER BY s.start_time
LIMIT 3;
```

#### Step 5: AI-Powered Recommendation
```javascript
const alternativesPrompt = `The parent wanted this session but it's full:
- ${originalSession.programName}
- ${originalSession.locationName}
- ${dayName} at ${startTime}

Here are alternatives:
Adjacent Days: ${JSON.stringify(adjacentDays)}
Nearby Locations: ${JSON.stringify(expandedRadius)}
Different Times: ${JSON.stringify(alternativeTimes)}

Write a friendly message suggesting the BEST 2 alternatives. Be enthusiastic and create urgency. Keep it under 3 sentences.`;
```

#### Step 6: Return Alternatives
```json
{
  "success": true,
  "originalSession": {...},
  "alternatives": {
    "adjacentDays": [
      {
        "id": "uuid",
        "message": "How about Tuesday at 4pm instead? Same location, Coach Mike!",
        "type": "adjacent_day",
        "spotsRemaining": 5
      }
    ],
    "expandedRadius": [...],
    "alternativeTimes": [...],
    "alternativeLocations": [...]
  },
  "recommendWaitlist": false,
  "aiMessage": "Great news! I found Tuesday at 4pm with Coach Mike at the same location—only 5 spots left! Or Thursday at the same time works too. Both are perfect for Connor!"
}
```

---

## Gemini Flash Integration

### API Configuration
```javascript
// N8N HTTP Request Node
{
  "method": "POST",
  "url": "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent",
  "headers": {
    "Content-Type": "application/json",
    "x-goog-api-key": "{{$env.GEMINI_API_KEY}}"
  },
  "body": {
    "contents": [{
      "parts": [{
        "text": "{{systemPrompt}}"
      }]
    }],
    "generationConfig": {
      "temperature": 0.7,
      "maxOutputTokens": 300,
      "topP": 0.95,
      "topK": 40
    },
    "safetySettings": [
      {
        "category": "HARM_CATEGORY_HARASSMENT",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
      }
    ]
  }
}
```

### Response Parsing
```javascript
// Extract text from Gemini response
const aiResponse = $json.candidates[0].content.parts[0].text;

// Optional: Extract structured data with regex or second Gemini call
const dataExtractionPrompt = `From this conversation: "${aiResponse}"
Extract JSON: {"childName": "...", "childAge": null, "location": null}`;
```

### Error Handling
```javascript
// Retry logic
if (geminiResponse.statusCode !== 200) {
  if (retryCount < 3) {
    wait(1000 * retryCount);
    retry();
  } else {
    return fallbackResponse();
  }
}

// Timeout handling
const timeout = 5000; // 5 seconds
if (responseTime > timeout) {
  return {
    success: false,
    error: "AI_TIMEOUT",
    fallbackToForm: true
  };
}
```

---

## Frontend Integration

### Service Layer Example
```typescript
// src/services/ai/kaiAgent.ts

interface KaiMessageRequest {
  message: string;
  conversationId: string;
  context: ConversationContext;
}

interface KaiMessageResponse {
  success: boolean;
  response?: {
    message: string;
    nextState: ConversationState;
    extractedData: Record<string, any>;
    quickReplies?: string[];
    progress?: number;
  };
  error?: {
    code: string;
    message: string;
    fallbackToForm?: boolean;
  };
}

export async function sendMessageToKai(
  request: KaiMessageRequest
): Promise<KaiMessageResponse> {
  const n8nUrl = `${import.meta.env.VITE_N8N_WEBHOOK_BASE_URL}${import.meta.env.VITE_N8N_KAI_WEBHOOK}`;

  try {
    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`N8N webhook failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Kai service error:', error);
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: "I'm having trouble connecting. Let me show you a form instead.",
        fallbackToForm: true,
      },
    };
  }
}

export async function getSessionRecommendations(
  organizationId: string,
  childAge: number,
  preferences: SessionPreferences
): Promise<SessionRecommendation[]> {
  const n8nUrl = `${import.meta.env.VITE_N8N_WEBHOOK_BASE_URL}${import.meta.env.VITE_N8N_RECOMMENDATIONS_WEBHOOK}`;

  const response = await fetch(n8nUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ organizationId, childAge, preferences }),
  });

  const data = await response.json();
  return data.sessions || [];
}
```

### Usage in Components
```typescript
// src/components/registration/ChatInterface.tsx

import { sendMessageToKai } from '../../services/ai/kaiAgent';

const handleSendMessage = async () => {
  const userMessage = { id: Date.now().toString(), role: 'user', content: inputValue, timestamp: new Date() };
  setMessages(prev => [...prev, userMessage]);
  setInputValue('');
  setIsLoading(true);

  const response = await sendMessageToKai({
    message: inputValue,
    conversationId: conversationId,
    context: conversationContext,
  });

  if (response.success && response.response) {
    const aiMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant' as const,
      content: response.response.message,
      timestamp: new Date(),
      metadata: {
        quickReplies: response.response.quickReplies,
      },
    };
    setMessages(prev => [...prev, aiMessage]);
    setConversationState(response.response.nextState);
  } else if (response.error?.fallbackToForm) {
    showFormFallback();
  }

  setIsLoading(false);
};
```

---

## Environment Variables

Add to `.env`:
```env
# Gemini AI
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# N8N Webhooks
VITE_N8N_WEBHOOK_BASE_URL=https://your-n8n-instance.com
VITE_N8N_KAI_WEBHOOK=/webhook/kai-message
VITE_N8N_RECOMMENDATIONS_WEBHOOK=/webhook/recommend-sessions
VITE_N8N_ALTERNATIVES_WEBHOOK=/webhook/find-alternatives
```

Add to N8N environment:
```env
GEMINI_API_KEY=your_gemini_api_key_here
SUPABASE_URL=https://tatunnfxwfsyoiqoaenb.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
```

---

## Testing N8N Workflows

### Test with curl
```bash
# Test Kai conversation
curl -X POST https://your-n8n-instance/webhook/kai-message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "My son Connor is 4 years old",
    "conversationId": "test-123",
    "context": {
      "state": "collecting_child_info",
      "organizationId": "00000000-0000-0000-0000-000000000001"
    }
  }'

# Test session recommendations
curl -X POST https://your-n8n-instance/webhook/recommend-sessions \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "00000000-0000-0000-0000-000000000001",
    "childAge": 4,
    "preferences": {
      "dayOfWeek": [3, 4],
      "timeOfDay": "afternoon"
    }
  }'
```

---

## Security Considerations

1. **API Key Protection**
   - Never expose Gemini API key in frontend
   - Store in N8N environment variables
   - Use Supabase service role key (not anon key) in N8N

2. **Webhook Authentication** (Future)
   - Add HMAC signature verification
   - Rate limiting on webhooks
   - IP allowlisting if needed

3. **Data Validation**
   - Validate all webhook inputs
   - Sanitize user messages before AI processing
   - Validate AI responses before returning to frontend

---

## Monitoring & Logging

### N8N Execution Logs
- Monitor execution time
- Track success/failure rates
- Alert on >5 second response times
- Log all AI responses for quality review

### Frontend Error Tracking
```typescript
if (!response.success) {
  // Log to Sentry or similar
  console.error('Kai service error:', response.error);

  // Track analytics
  analytics.track('kai_error', {
    code: response.error?.code,
    conversationState: context.state,
  });
}
```

---

## Next Steps

1. ✅ Create this documentation
2. ⏳ Set up N8N instance (or provide existing URL)
3. ⏳ Get Gemini API key from user
4. ⏳ Build N8N workflows (3 webhooks)
5. ⏳ Test workflows with sample data
6. ⏳ Integrate with React frontend
7. ⏳ End-to-end testing

---

**Document Owner:** Development Team
**Last Updated:** December 2, 2025
