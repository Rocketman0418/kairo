# Edge Function Deployment Guide

**Quick guide to deploy Kairo's Supabase Edge Functions**

---

## Overview

We've created 2 Edge Functions that use Gemini API securely:

1. **kai-conversation** - Main AI conversation handler
2. **session-recommendations** - Smart class recommendations

Both functions call Gemini API server-side, keeping your API key secure.

---

## Prerequisites

1. Supabase CLI installed
2. Logged into your Supabase project
3. Gemini API key (already have: `AIzaSyB_2g061bsMyFNMpIaiB2R6FrmfUik2MqQ`)

---

## Installation Steps

### 1. Install Supabase CLI (if not already installed)

**macOS/Linux:**
```bash
brew install supabase/tap/supabase
```

**Windows:**
```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Or use npm:**
```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

This will open a browser window for authentication.

### 3. Link Your Project

```bash
supabase link --project-ref tatunnfxwfsyoiqoaenb
```

**Your project ref:** `tatunnfxwfsyoiqoaenb` (from your Supabase URL)

### 4. Set Environment Variables (Secrets)

The Edge Functions need access to your Gemini API key. Set it as a secret:

```bash
supabase secrets set GEMINI_API_KEY=AIzaSyB_2g061bsMyFNMpIaiB2R6FrmfUik2MqQ
```

**Note:** These secrets are stored securely in Supabase and never exposed to the frontend.

You can verify secrets are set:
```bash
supabase secrets list
```

### 5. Deploy the Edge Functions

Deploy both functions at once:

```bash
supabase functions deploy kai-conversation
supabase functions deploy session-recommendations
```

**Or deploy both with one command:**
```bash
supabase functions deploy
```

### 6. Verify Deployment

Check that functions are deployed:

```bash
supabase functions list
```

You should see:
```
┌──────────────────────────┬────────┬─────────────────────┐
│ NAME                     │ STATUS │ VERSION             │
├──────────────────────────┼────────┼─────────────────────┤
│ kai-conversation         │ ACTIVE │ v1                  │
│ session-recommendations  │ ACTIVE │ v1                  │
└──────────────────────────┴────────┴─────────────────────┘
```

---

## Testing the Deployment

### Test Kai Conversation Function

```bash
curl -X POST https://tatunnfxwfsyoiqoaenb.supabase.co/functions/v1/kai-conversation \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhdHVubmZ4d2ZzeW9pcW9hZW5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MDg4ODYsImV4cCI6MjA4MDI4NDg4Nn0.yqU0Jm0BolGTw-RXHLtKYnvOndAof_iq5CixhvbIaRs" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "My son Connor is 4 years old",
    "conversationId": "test-123",
    "context": {
      "conversationId": "test-123",
      "organizationId": "00000000-0000-0000-0000-000000000001",
      "currentState": "collecting_child_info"
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "response": {
    "message": "That's wonderful! Connor is 4 years old. What area do you live in, so I can find the closest classes?",
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

### Test Session Recommendations Function

```bash
curl -X POST https://tatunnfxwfsyoiqoaenb.supabase.co/functions/v1/session-recommendations \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhdHVubmZ4d2ZzeW9pcW9hZW5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MDg4ODYsImV4cCI6MjA4MDI4NDg4Nn0.yqU0Jm0BolGTw-RXHLtKYnvOndAof_iq5CixhvbIaRs" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "00000000-0000-0000-0000-000000000001",
    "childAge": 4,
    "preferences": {
      "dayOfWeek": [2, 4],
      "timeOfDay": "afternoon"
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "sessions": [
    {
      "id": "...",
      "programName": "Mini Kickers",
      "dayName": "Tuesday",
      "displayTime": "4:00 PM",
      "spotsRemaining": 5,
      "displayPrice": "$150",
      "urgency": "medium"
    }
  ],
  "count": 1,
  "aiMessage": "Perfect! I found a great Tuesday afternoon class with 5 spots left..."
}
```

---

## Frontend Integration

The frontend is already configured to call these Edge Functions. No changes needed!

**Current Flow:**
```
User types message in chat
  ↓
React ChatInterface
  ↓
src/services/ai/kaiAgent.ts
  ↓
Supabase Edge Function (kai-conversation)
  ↓
Gemini API (secure server-side call)
  ↓
Response back to user
```

---

## Monitoring & Debugging

### View Function Logs

```bash
supabase functions logs kai-conversation
```

**Or view in Supabase Dashboard:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **Edge Functions**
4. Click on function name
5. View **Logs** tab

### View Function Invocations

In Supabase Dashboard:
- Navigate to **Edge Functions**
- See invocation count, success rate, average duration
- Monitor errors and performance

### Common Issues

**Issue: Function not found (404)**
- Solution: Make sure functions are deployed: `supabase functions list`

**Issue: Gemini API key error**
- Solution: Verify secret is set: `supabase secrets list`
- Re-set if needed: `supabase secrets set GEMINI_API_KEY=...`

**Issue: CORS errors**
- Solution: Edge Functions already include CORS headers, but verify `OPTIONS` request is handled

**Issue: Timeout errors**
- Solution: Edge Functions have 10 second timeout (sufficient for Gemini calls)
- Check function logs for slow operations

---

## Updating Functions

When you make changes to the Edge Function code:

```bash
# Deploy specific function
supabase functions deploy kai-conversation

# Or deploy all functions
supabase functions deploy
```

Changes take effect immediately (no app redeployment needed).

---

## Local Development & Testing

### Run Functions Locally

```bash
supabase start
supabase functions serve
```

This starts a local Edge Functions server at: `http://localhost:54321/functions/v1/`

### Test Locally

```bash
curl -X POST http://localhost:54321/functions/v1/kai-conversation \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

### Set Local Secrets

Create `.env.local` file in `supabase/functions/`:

```bash
# supabase/functions/.env.local
GEMINI_API_KEY=AIzaSyB_2g061bsMyFNMpIaiB2R6FrmfUik2MqQ
```

**Important:** Add `.env.local` to `.gitignore` to avoid committing secrets!

---

## Architecture Summary

### What's Secure Now ✅

- ✅ Gemini API key stored in Supabase secrets (server-side only)
- ✅ Frontend never sees the API key
- ✅ All AI processing happens server-side
- ✅ Edge Functions use service role for database access
- ✅ Built-in rate limiting and DDoS protection

### What Frontend Sees

```typescript
// Frontend only sends user messages
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/kai-conversation`,
  {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, // Safe to expose
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message: "My son is 4 years old" })
  }
);
```

### What Edge Function Does (Server-Side)

```typescript
// Edge Function securely calls Gemini
const geminiResponse = await fetch(
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent',
  {
    headers: {
      'x-goog-api-key': Deno.env.get('GEMINI_API_KEY') // Secure!
    }
  }
);
```

---

## Cost & Performance

### Edge Function Costs
- **Free tier:** 500K invocations/month
- **After free tier:** $2 per million invocations
- **Your expected usage:** ~10K invocations/month in early stage = **FREE**

### Gemini API Costs
- **Gemini Flash:** ~$0.10 per 1,000 requests
- **Your expected usage:** ~10K requests/month = **$1/month**

### Performance
- **Latency:** ~1-2 seconds total (Edge routing + Gemini API)
- **Timeout:** 10 seconds (plenty for Gemini responses)
- **Concurrency:** Auto-scales to demand

---

## Next Steps After Deployment

1. ✅ **Deploy Edge Functions** (follow steps above)
2. ✅ **Test with curl** to verify Gemini integration
3. ✅ **Start dev server**: `npm run dev`
4. ✅ **Test in browser**: Type messages in chat interface
5. ✅ **Monitor logs**: Watch Supabase Dashboard for function calls

Once working, you'll have:
- Secure AI conversation powered by Gemini
- Smart session recommendations
- Fast response times (<2 seconds)
- Zero exposure of API keys

---

## Support Resources

- **Supabase Edge Functions Docs:** https://supabase.com/docs/guides/functions
- **Gemini API Docs:** https://ai.google.dev/docs
- **Project-Specific Help:** See `AI_ARCHITECTURE_ANALYSIS.md` for architecture details

---

**Last Updated:** December 2, 2025
**Project:** Kairo AI Registration Platform
