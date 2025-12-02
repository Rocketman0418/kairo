# N8N Workflow Starter Guide

**Quick Reference:** How to create the Kai conversation webhook in N8N

---

## Workflow 1: Kai Conversation Handler

### Overview
This is the main workflow that powers the Kai conversational AI experience.

**Webhook URL:** `https://healthrocket.app.n8n.cloud/webhook/kai-message`

---

## Node Configuration

### 1. Webhook Trigger Node

**Type:** Webhook
**Settings:**
- HTTP Method: POST
- Path: `kai-message`
- Response Mode: Wait for workflow to finish
- Authentication: None

**Expected Input:**
```json
{
  "message": "My son Connor is 4 years old",
  "conversationId": "uuid-here",
  "context": {
    "conversationId": "uuid-here",
    "organizationId": "00000000-0000-0000-0000-000000000001",
    "familyId": "uuid-or-null",
    "currentState": "collecting_child_info",
    "children": [],
    "preferences": {}
  }
}
```

---

### 2. Load Conversation Context (Optional)

**Type:** Supabase Node
**Operation:** Get Row(s)
**Table:** conversations
**Settings:**
- Filter: `id` equals `{{$json.conversationId}}`

This step is optional since context is passed from frontend.

---

### 3. Build Gemini Prompt

**Type:** Code Node (JavaScript)
**Code:**
```javascript
const message = $input.first().json.message;
const context = $input.first().json.context;

// System prompt for Kai
const systemPrompt = `You are Kai, a friendly AI assistant helping parents register their children for youth sports programs at Soccer Shots Demo.

Your role:
- Guide parents through registration in under 5 minutes
- Ask ONE question at a time (maximum 2-3 sentences)
- Be warm, efficient, and empathetic
- Extract key information: child name, age, location preferences, schedule preferences
- Recommend suitable classes based on their needs
- Handle corrections gracefully

Current conversation state: ${context.currentState}
Organization: ${context.organizationId}

What we know so far:
${JSON.stringify(context.children || [])}
${JSON.stringify(context.preferences || {})}

Parent's latest message: "${message}"

Respond naturally and move the conversation forward. Your response should:
1. Acknowledge what they said
2. Ask the next relevant question OR provide recommendations
3. Be concise (under 3 sentences)

Extract any data mentioned (name, age, location, day preference, time preference) and format as JSON.`;

return {
  systemPrompt,
  userMessage: message,
  context
};
```

---

### 4. Call Gemini Flash API

**Type:** HTTP Request Node
**Settings:**
- Method: POST
- URL: `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`
- Authentication: Generic Credential Type
  - Header Auth: `x-goog-api-key`
  - Value: `AIzaSyB_2g061bsMyFNMpIaiB2R6FrmfUik2MqQ`

**Body:**
```json
{
  "contents": [{
    "parts": [{
      "text": "{{$json.systemPrompt}}"
    }]
  }],
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 300,
    "topP": 0.95,
    "topK": 40
  }
}
```

---

### 5. Parse Gemini Response

**Type:** Code Node (JavaScript)
**Code:**
```javascript
const geminiResponse = $input.first().json;
const context = $('Build Gemini Prompt').first().json.context;
const userMessage = $('Build Gemini Prompt').first().json.userMessage;

// Extract AI response text
let aiMessage = '';
try {
  aiMessage = geminiResponse.candidates[0].content.parts[0].text;
} catch (e) {
  aiMessage = "I'm having trouble understanding. Could you rephrase that?";
}

// Extract structured data from user message
const extractedData = {};

// Simple extraction (can be enhanced with another Gemini call)
const nameMatch = userMessage.match(/(?:name is|called|this is)\s+([A-Z][a-z]+)/i);
if (nameMatch) {
  extractedData.childName = nameMatch[1];
}

const ageMatch = userMessage.match(/(\d+)\s*(?:years?\s*old|yo)/i);
if (ageMatch) {
  extractedData.childAge = parseInt(ageMatch[1]);
}

// Determine next state
let nextState = context.currentState;
if (context.currentState === 'greeting' || context.currentState === 'idle') {
  nextState = 'collecting_child_info';
} else if (context.currentState === 'collecting_child_info' && extractedData.childName) {
  nextState = 'collecting_preferences';
} else if (context.currentState === 'collecting_preferences' && extractedData.childAge) {
  nextState = 'showing_recommendations';
}

// Build response
return {
  success: true,
  response: {
    message: aiMessage,
    nextState: nextState,
    extractedData: extractedData,
    quickReplies: getQuickReplies(nextState),
    progress: calculateProgress(nextState)
  }
};

function getQuickReplies(state) {
  switch(state) {
    case 'collecting_preferences':
      return ['Weekday afternoons', 'Weekend mornings', 'Show me all options'];
    case 'showing_recommendations':
      return ['Tell me more', 'See other times', 'Show me the schedule'];
    default:
      return [];
  }
}

function calculateProgress(state) {
  const stateProgress = {
    'greeting': 10,
    'collecting_child_info': 25,
    'collecting_preferences': 50,
    'showing_recommendations': 75,
    'confirming_selection': 85,
    'collecting_payment': 95,
    'confirmed': 100
  };
  return stateProgress[state] || 0;
}
```

---

### 6. Update Conversation in Database (Optional)

**Type:** Supabase Node
**Operation:** Update Row
**Table:** conversations
**Settings:**
- Update Key: `id`
- Value: `{{$json.context.conversationId}}`
- Fields to Update:
  - state: `{{$json.response.nextState}}`
  - context: `{{$json.context}}`
  - updated_at: `{{$now}}`

---

### 7. Return Response

**Type:** Respond to Webhook Node
**Settings:**
- Response Mode: Using 'Respond to Webhook' Node
- Response Body:
```json
{
  "success": true,
  "response": {
    "message": "{{$json.response.message}}",
    "nextState": "{{$json.response.nextState}}",
    "extractedData": "{{$json.response.extractedData}}",
    "quickReplies": "{{$json.response.quickReplies}}",
    "progress": "{{$json.response.progress}}"
  }
}
```

---

## Error Handling

### Add Error Workflow

Between each node, add error handling:

**On Error Node:**
```javascript
return {
  success: false,
  error: {
    code: 'AI_ERROR',
    message: "I'm having trouble right now. Let me show you a form to continue.",
    fallbackToForm: true
  }
};
```

---

## Testing Your Workflow

### Test with curl:
```bash
curl -X POST https://healthrocket.app.n8n.cloud/webhook/kai-message \
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

Expected response:
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

---

## Simplified Starter Version

If the above seems complex, here's a **minimal version** to get started:

### Minimal Node Setup:

1. **Webhook Trigger** → Receives POST to `/webhook/kai-message`

2. **Gemini API Call** →
   - URL: `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`
   - Headers: `x-goog-api-key: AIzaSyB_2g061bsMyFNMpIaiB2R6FrmfUik2MqQ`
   - Body:
   ```json
   {
     "contents": [{
       "parts": [{
         "text": "You are Kai, a friendly AI helping parents register kids for soccer. Parent said: '{{$json.message}}'. Respond warmly in 1-2 sentences and ask the next question."
       }]
     }],
     "generationConfig": {"temperature": 0.7, "maxOutputTokens": 150}
   }
   ```

3. **Code Node** → Parse response:
   ```javascript
   return {
     success: true,
     response: {
       message: $input.first().json.candidates[0].content.parts[0].text,
       nextState: "collecting_child_info",
       extractedData: {},
       quickReplies: []
     }
   };
   ```

4. **Respond to Webhook** → Return the response

---

## Next Steps

Once this basic workflow is working:

1. Add data extraction logic (regex or secondary Gemini call)
2. Implement state machine transitions
3. Query Supabase for session recommendations
4. Build workflows for `/webhook/recommend-sessions` and `/webhook/find-alternatives`

---

## Troubleshooting

**Issue:** Webhook not receiving requests
- Check N8N webhook path matches: `/webhook/kai-message`
- Verify N8N instance is active and not paused
- Check browser console for CORS errors

**Issue:** Gemini API errors
- Verify API key is correct
- Check rate limits (Gemini Flash has generous limits)
- Look at N8N execution logs for error details

**Issue:** Frontend shows "fallback to form"
- This means the N8N webhook failed or timed out
- Check N8N execution history for errors
- Verify webhook URL in `.env` is correct

---

## Resources

- **Gemini API Docs:** https://ai.google.dev/docs
- **N8N Docs:** https://docs.n8n.io/
- **Supabase Docs:** https://supabase.com/docs

---

**Last Updated:** December 2, 2025
**Webhook Base URL:** https://healthrocket.app.n8n.cloud
**Gemini Model:** gemini-flash-latest
