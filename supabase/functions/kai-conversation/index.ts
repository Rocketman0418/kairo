import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface KaiRequest {
  message: string;
  conversationId: string;
  context: {
    conversationId: string;
    organizationId: string;
    familyId?: string;
    currentState: string;
    children?: any[];
    preferences?: any;
  };
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const requestData: KaiRequest = await req.json();
    const { message, conversationId, context } = requestData;

    const systemPrompt = buildSystemPrompt(message, context);

    const geminiHeaders = new Headers();
    geminiHeaders.append('Content-Type', 'application/json');

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(GEMINI_API_KEY.trim())}`,
      {
        method: 'POST',
        headers: geminiHeaders,
        body: JSON.stringify({
          contents: [{
            parts: [{ text: systemPrompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 300,
            topP: 0.95,
            topK: 40,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API failed: ${geminiResponse.status}`);
    }

    const geminiData: GeminiResponse = await geminiResponse.json();

    if (!geminiData.candidates || geminiData.candidates.length === 0) {
      console.error('No candidates in Gemini response:', JSON.stringify(geminiData));
      throw new Error('Gemini returned no candidates');
    }

    const aiMessage = geminiData.candidates[0].content.parts[0].text;

    const extractedData = extractDataFromMessage(message);
    const nextState = determineNextState(context.currentState, extractedData);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase
      .from('conversations')
      .update({
        state: nextState,
        context: { ...context, ...extractedData },
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    const response = {
      success: true,
      response: {
        message: aiMessage,
        nextState: nextState,
        extractedData: extractedData,
        quickReplies: getQuickReplies(nextState),
        progress: calculateProgress(nextState),
      },
    };

    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Edge Function error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'AI_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          fallbackToForm: true,
        },
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

function buildSystemPrompt(message: string, context: any): string {
  const stateInstructions = {
    'greeting': 'Warmly greet the parent and ask for their child\'s first name.',
    'collecting_child_info': 'You have the child\'s name. Now ask for their age in a friendly way.',
    'collecting_preferences': 'You know the child\'s name and age. Ask about location or day/time preferences.',
    'showing_recommendations': 'Provide session recommendations based on what you know.',
    'confirming_selection': 'Confirm the selected session details before proceeding to payment.',
    'collecting_payment': 'Guide them through payment process.',
  };

  const instruction = stateInstructions[context.currentState as keyof typeof stateInstructions] ||
    'Continue the conversation naturally.';

  return `You are Kai, a friendly and efficient AI assistant helping parents register their children for youth sports programs.

Your role:
- Guide parents through registration in under 5 minutes
- Ask ONE question at a time (maximum 2-3 sentences)
- Be warm, empathetic, and conversational
- Extract key information naturally: child's name, age, location preferences, schedule preferences
- Be encouraging and positive

Current conversation state: ${context.currentState}
What you should do now: ${instruction}

What we know so far:
${JSON.stringify(context.children || [], null, 2)}
${JSON.stringify(context.preferences || {}, null, 2)}

Parent's latest message: "${message}"

Respond naturally and conversationally. Your response should:
1. Acknowledge what they said
2. ${instruction}
3. Be concise (under 3 sentences)

Remember: You're helping busy parents. Keep it simple and friendly.`;
}

function extractDataFromMessage(message: string): Record<string, any> {
  const extractedData: Record<string, any> = {};

  const nameMatch = message.match(/(?:name is|called|this is|he'?s|she'?s)\s+([A-Z][a-z]+)/i);
  if (nameMatch) {
    extractedData.childName = nameMatch[1];
  }

  const ageMatch = message.match(/(\d+)\s*(?:years?\s*old|yo|yrs?)/i);
  if (ageMatch) {
    extractedData.childAge = parseInt(ageMatch[1]);
  }

  const dayPatterns = [
    { pattern: /monday/i, value: 1 },
    { pattern: /tuesday/i, value: 2 },
    { pattern: /wednesday/i, value: 3 },
    { pattern: /thursday/i, value: 4 },
    { pattern: /friday/i, value: 5 },
    { pattern: /saturday/i, value: 6 },
    { pattern: /sunday/i, value: 0 },
    { pattern: /weekday/i, value: [1, 2, 3, 4, 5] },
    { pattern: /weekend/i, value: [0, 6] },
  ];

  for (const { pattern, value } of dayPatterns) {
    if (pattern.test(message)) {
      extractedData.preferredDays = Array.isArray(value) ? value : [value];
      break;
    }
  }

  const timePatterns = [
    { pattern: /morning/i, value: 'morning' },
    { pattern: /afternoon/i, value: 'afternoon' },
    { pattern: /evening/i, value: 'evening' },
  ];

  for (const { pattern, value } of timePatterns) {
    if (pattern.test(message)) {
      extractedData.preferredTimeOfDay = value;
      break;
    }
  }

  return extractedData;
}

function determineNextState(currentState: string, extractedData: Record<string, any>): string {
  switch (currentState) {
    case 'idle':
    case 'greeting':
      return 'collecting_child_info';

    case 'collecting_child_info':
      if (extractedData.childName && extractedData.childAge) {
        return 'collecting_preferences';
      } else if (extractedData.childName) {
        return 'collecting_child_info';
      }
      return currentState;

    case 'collecting_preferences':
      if (extractedData.preferredDays || extractedData.preferredTimeOfDay) {
        return 'showing_recommendations';
      }
      return currentState;

    case 'showing_recommendations':
      return 'confirming_selection';

    case 'confirming_selection':
      return 'collecting_payment';

    default:
      return currentState;
  }
}

function getQuickReplies(state: string): string[] {
  switch (state) {
    case 'collecting_preferences':
      return ['Weekday afternoons', 'Weekend mornings', 'Show me all options'];
    case 'showing_recommendations':
      return ['Tell me more', 'See other times', 'This looks perfect'];
    case 'confirming_selection':
      return ['Yes, sign up!', 'Go back', 'Tell me more about the coach'];
    default:
      return [];
  }
}

function calculateProgress(state: string): number {
  const stateProgress: Record<string, number> = {
    'idle': 0,
    'greeting': 10,
    'collecting_child_info': 25,
    'collecting_preferences': 50,
    'showing_recommendations': 75,
    'confirming_selection': 85,
    'collecting_payment': 95,
    'confirmed': 100,
  };

  return stateProgress[state] || 0;
}
