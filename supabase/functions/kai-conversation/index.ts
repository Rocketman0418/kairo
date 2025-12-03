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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${encodeURIComponent(GEMINI_API_KEY.trim())}`,
      {
        method: 'POST',
        headers: geminiHeaders,
        body: JSON.stringify({
          contents: [{
            parts: [{ text: systemPrompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 5000,
            topP: 0.95,
            topK: 64,
          },
          systemInstruction: {
            parts: [{
              text: `You are Kai, an AI assistant for Kairo - a youth sports registration platform.\n\nYour personality:\n- Warm, friendly, and empathetic (like talking to a helpful neighbor)\n- Efficient and respectful of parents' time\n- Patient and understanding (parents are often distracted)\n- Positive and encouraging about youth activities\n\nYour constraints:\n- Ask ONE question at a time (parents may be multitasking)\n- Keep responses to 2-3 sentences maximum\n- Use natural, conversational language (avoid formal/robotic tone)\n- Focus on gathering: child's name, age, and schedule preferences\n- Never make assumptions - always confirm important details\n\nYour goal:\n- Help parents complete registration in under 5 minutes\n- Make the process feel easy and stress-free\n- Build trust and confidence in the platform`
            }]
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
    console.log('Gemini response:', JSON.stringify(geminiData));

    if (!geminiData.candidates || geminiData.candidates.length === 0) {
      console.error('No candidates in Gemini response:', JSON.stringify(geminiData));
      throw new Error('Gemini returned no candidates - possibly blocked or filtered');
    }

    const candidate = geminiData.candidates[0];
    const finishReason = (geminiData.candidates[0] as any).finishReason;

    if (finishReason === 'MAX_TOKENS' || finishReason === 'RECITATION') {
      console.error('Gemini hit token limit or recitation:', JSON.stringify(geminiData));
      throw new Error('AI response was cut off - please try rephrasing your message');
    }

    if (!candidate?.content?.parts || candidate.content.parts.length === 0) {
      console.error('No parts in Gemini response:', JSON.stringify(geminiData));
      throw new Error('Gemini response missing content - possibly filtered');
    }

    if (!candidate.content.parts[0]?.text) {
      console.error('No text in first part:', JSON.stringify(geminiData));
      throw new Error('Gemini response missing text content');
    }

    const aiMessage = candidate.content.parts[0].text;

    const extractedData = extractDataFromMessage(message, context);

    if (extractedData.childAge && (extractedData.childAge < 2 || extractedData.childAge > 18)) {
      return new Response(
        JSON.stringify({
          success: true,
          response: {
            message: "Hmm, that age doesn't seem quite right for our youth programs (ages 2-18). Could you double-check and let me know their actual age?",
            nextState: context.currentState,
            extractedData: {},
            quickReplies: [],
            progress: calculateProgress(context.currentState),
          },
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

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

  // Build a summary of what we know
  const knownInfo: string[] = [];
  if (context.childName) knownInfo.push(`Child's name: ${context.childName}`);
  if (context.childAge) knownInfo.push(`Child's age: ${context.childAge}`);
  if (context.preferredDays) knownInfo.push(`Preferred days: ${context.preferredDays}`);
  if (context.preferredTimeOfDay) knownInfo.push(`Preferred time: ${context.preferredTimeOfDay}`);

  const knownInfoText = knownInfo.length > 0
    ? knownInfo.join('\n')
    : 'Nothing yet - this is the start of the conversation';

  return `You are Kai, a friendly and efficient AI assistant helping parents register their children for youth sports programs.\n\nYour role:\n- Guide parents through registration in under 5 minutes\n- Ask ONE question at a time (maximum 2-3 sentences)\n- Be warm, empathetic, and conversational\n- Extract key information naturally: child's name, age, location preferences, schedule preferences\n- Be encouraging and positive\n\nCurrent conversation state: ${context.currentState}\nWhat you should do now: ${instruction}\n\nInformation collected so far:\n${knownInfoText}\n\nParent's latest message: "${message}"\n\nRespond naturally and conversationally. Your response should:\n1. Acknowledge what they said\n2. ${instruction}\n3. Be concise (under 3 sentences)\n\nRemember: You're helping busy parents. Keep it simple and friendly.`;
}

function extractDataFromMessage(message: string, context?: any): Record<string, any> {
  const extractedData: Record<string, any> = {};

  const nameMatch = message.match(/(?:name is|called|this is|he'?s|she'?s)\s+([A-Z][a-z]+)/i);
  if (nameMatch) {
    extractedData.childName = nameMatch[1];
  }

  // Match age patterns: "12 years old", "12 yo", "12 yrs", or just "12"
  const ageMatchWithWords = message.match(/(\d+)\s*(?:years?\s*old|yo|yrs?)/i);
  const bareNumberMatch = message.match(/^\s*(\d+)\s*$/);

  // If we're in collecting_child_info state and user sends just a number, it's likely the age
  if (ageMatchWithWords) {
    extractedData.childAge = parseInt(ageMatchWithWords[1]);
  } else if (bareNumberMatch && context?.currentState === 'collecting_child_info') {
    extractedData.childAge = parseInt(bareNumberMatch[1]);
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
