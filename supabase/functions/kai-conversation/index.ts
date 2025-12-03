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

    // CRITICAL FIX: Extract data FIRST, then merge into context BEFORE calling Gemini
    const extractedData = extractDataFromMessage(message, context);

    // Merge extracted data into context so Gemini knows what we just learned
    const updatedContext = {
      ...context,
      ...extractedData,
    };

    // Now build the prompt with the UPDATED context that includes what we just extracted
    const systemPrompt = buildSystemPrompt(message, updatedContext);

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
            maxOutputTokens: 2000,
            topP: 0.95,
            topK: 40,
          },
          systemInstruction: {
            parts: [{
              text: `You are Kai, an AI assistant for Kairo - a youth sports registration platform.\n\nYour personality:\n- Warm, friendly, and empathetic (like talking to a helpful neighbor)\n- Efficient and respectful of parents' time\n- Patient and understanding (parents are often distracted)\n- Positive and encouraging about youth activities\n\nYour constraints:\n- Ask ONE question at a time (parents may be multitasking)\n- Keep responses to 2-3 sentences maximum\n- Use natural, conversational language (avoid formal/robotic tone)\n- Focus on gathering: child's name, age, and schedule preferences\n- NEVER ask to confirm information that was just provided - move to the next question\n- If parent gives you the child's name, immediately ask for age (don't confirm the name)\n- If parent gives you the age, immediately ask for schedule preferences (don't confirm the age)\n\nYour goal:\n- Help parents complete registration in under 5 minutes\n- Make the process feel easy and stress-free\n- Build trust and confidence in the platform`
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

    const nextState = determineNextState(context.currentState, extractedData, updatedContext);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update conversation with merged context (includes extracted data)
    await supabase
      .from('conversations')
      .update({
        state: nextState,
        context: updatedContext,
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
    'collecting_child_info': context.childName
      ? 'You already have the child\'s name. Now ask for their age in years (simple and direct).'
      : 'Ask for the child\'s first name.',
    'collecting_preferences': (() => {
      const hasDays = context.preferredDays;
      const hasTime = context.preferredTimeOfDay || context.preferredTime;

      if (hasDays && hasTime) {
        return 'You have all schedule info. Thank them and say you\'ll find matching sessions.';
      } else if (hasDays && !hasTime) {
        return 'You have their preferred days. Now ask what time of day works best (morning, afternoon, evening, or specific time).';
      } else if (!hasDays && hasTime) {
        return 'You have their preferred time. Now ask which days of the week work best.';
      } else {
        return 'Ask which days of the week work best for them (be open-ended).';
      }
    })(),
    'showing_recommendations': 'Provide session recommendations based on what you know.',
    'confirming_selection': 'Confirm the selected session details before proceeding to payment.',
    'collecting_payment': 'Guide them through payment process.',
  };

  const instruction = stateInstructions[context.currentState as keyof typeof stateInstructions] ||
    'Continue the conversation naturally.';

  // Build a summary of what we know
  const knownInfo: string[] = [];
  if (context.childName) knownInfo.push(`✓ Child's name: ${context.childName}`);
  if (context.childAge) knownInfo.push(`✓ Child's age: ${context.childAge} years old`);
  if (context.preferredDays) {
    const daysArray = Array.isArray(context.preferredDays) ? context.preferredDays : [context.preferredDays];
    const dayNames = daysArray.map((d: number) => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d]);
    knownInfo.push(`✓ Preferred days: ${dayNames.join(', ')}`);
  }
  if (context.preferredTime) knownInfo.push(`✓ Preferred time: ${context.preferredTime}`);
  if (context.preferredTimeOfDay) knownInfo.push(`✓ Time of day: ${context.preferredTimeOfDay}`);

  const knownInfoText = knownInfo.length > 0
    ? `Information you ALREADY HAVE (don't ask again):\n${knownInfo.join('\n')}`
    : 'You don\'t have any information yet - start collecting it.';

  // Determine what's missing
  const missingInfo: string[] = [];
  if (!context.childName) missingInfo.push('child\'s name');
  if (!context.childAge) missingInfo.push('child\'s age');
  if (!context.preferredDays) missingInfo.push('preferred days');
  if (!context.preferredTimeOfDay && !context.preferredTime) missingInfo.push('preferred time of day');

  const nextStepGuidance = missingInfo.length > 0
    ? `\nYou still need: ${missingInfo.join(', ')}\nAsk for the NEXT missing item only (one at a time).`
    : '\nYou have all basic information. Move to showing recommendations.';

  return `You are Kai, a friendly and efficient AI assistant helping parents register their children for youth sports programs.\n\n${knownInfoText}${nextStepGuidance}\n\nCurrent conversation state: ${context.currentState}\nYour next action: ${instruction}\n\nParent's latest message: "${message}"\n\nCRITICAL RULES:\n- NEVER ask for information you already have (marked with ✓)\n- Ask for ONE missing piece of information at a time\n- If you have days AND time, thank them and say you'll find matching sessions\n- Keep responses under 3 sentences\n- Be warm but efficient\n\nRespond now:`;
}

function extractDataFromMessage(message: string, context?: any): Record<string, any> {
  const extractedData: Record<string, any> = {};

  // Extract child's name - handle multiple patterns
  const nameWithPhraseMatch = message.match(/(?:name is|called|this is|he'?s|she'?s)\s+([A-Z][a-z]+)/i);
  const capitalizedNameMatch = message.match(/^([A-Z][a-z]+)$/);
  const justNameMatch = message.match(/^([A-Z][a-z]{1,15})$/);

  // If we're in greeting state and user sends just a capitalized word, it's likely the name
  if (nameWithPhraseMatch) {
    extractedData.childName = nameWithPhraseMatch[1];
  } else if (context?.currentState === 'greeting' && justNameMatch) {
    extractedData.childName = justNameMatch[1];
  } else if (!context?.childName && capitalizedNameMatch) {
    // Fallback: if we don't have a name yet and user sends a capitalized word, assume it's the name
    extractedData.childName = capitalizedNameMatch[1];
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

  // Extract specific times (e.g., "4pm", "3:30", "16:00")
  const specificTimeMatch = message.match(/(\d{1,2})(?::(\d{2}))??\s*([ap]m)?/i);
  if (specificTimeMatch) {
    let hour = parseInt(specificTimeMatch[1]);
    const minutes = specificTimeMatch[2] || '00';
    const ampm = specificTimeMatch[3]?.toLowerCase();

    // Convert to 24-hour for comparison
    if (ampm === 'pm' && hour < 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;

    // Store the actual time
    extractedData.preferredTime = `${hour}:${minutes}`;

    // Also determine time of day category
    if (hour < 12) {
      extractedData.preferredTimeOfDay = 'morning';
    } else if (hour < 17) {
      extractedData.preferredTimeOfDay = 'afternoon';
    } else {
      extractedData.preferredTimeOfDay = 'evening';
    }
  }

  // Fallback to general time patterns if no specific time found
  if (!extractedData.preferredTimeOfDay) {
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
  }

  return extractedData;
}

function determineNextState(currentState: string, extractedData: Record<string, any>, fullContext?: any): string {
  switch (currentState) {
    case 'idle':
    case 'greeting':
      return 'collecting_child_info';

    case 'collecting_child_info':
      // Move to preferences only when we have BOTH name and age
      const hasName = extractedData.childName || fullContext?.childName;
      const hasAge = extractedData.childAge || fullContext?.childAge;

      if (hasName && hasAge) {
        return 'collecting_preferences';
      }
      return 'collecting_child_info';

    case 'collecting_preferences':
      // Move to recommendations only when we have BOTH days and time
      const hasDays = extractedData.preferredDays || fullContext?.preferredDays;
      const hasTime = extractedData.preferredTimeOfDay || extractedData.preferredTime || fullContext?.preferredTimeOfDay || fullContext?.preferredTime;

      if (hasDays && hasTime) {
        return 'showing_recommendations';
      }
      return 'collecting_preferences';

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
