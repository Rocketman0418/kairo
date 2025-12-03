# Gemini API Configuration

## CRITICAL: Always Use Correct Model

**ALWAYS use `gemini-flash-latest` as the model for the Gemini API.**

Never use a different model unless specifically instructed by the user.

## Correct API Endpoint Format

```typescript
const geminiResponse = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${encodeURIComponent(GEMINI_API_KEY.trim())}`,
  {
    method: 'POST',
    headers: geminiHeaders,
    body: JSON.stringify({
      // ... request body
    })
  }
);
```

## Wrong Model Names (DO NOT USE)

❌ `gemini-1.5-flash` - Does not exist
❌ `gemini-1.5-flash-latest` - Wrong
❌ `gemini-2.0-flash-exp` - Wrong
❌ Any other variant

## Right Model Name (ALWAYS USE)

✅ `gemini-flash-latest` - Correct

## Where This Applies

- All edge functions that call the Gemini API
- Any service files that integrate with Gemini
- Any new AI features being developed

## If You Forget

This will result in a 404 error from the Gemini API and the application will fail to work.

**Always reference this file before deploying edge functions that use Gemini.**
