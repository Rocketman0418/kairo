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
    childName?: string;
    childAge?: number;
    preferredDays?: number[];
    preferredTime?: string;
    preferredTimeOfDay?: string;
    children?: any[];
    preferences?: any;
  };
}

interface GeminiStructuredResponse {
  message: string;
  extractedData: {
    childName?: string | null;
    childAge?: number | null;
    preferredDays?: number[] | null;
    preferredTime?: string | null;
    preferredTimeOfDay?: 'morning' | 'afternoon' | 'evening' | null;
  };
  nextState: 'greeting' | 'collecting_child_info' | 'collecting_preferences' | 'showing_recommendations' | 'confirming_selection' | 'collecting_payment';
  reasoningNotes?: string;
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

    // Load relevant context files based on conversation state
    const contextContent = await loadContextFiles(context.currentState);

    // Build the system prompt with context and current data
    const systemPrompt = buildSystemPrompt(message, context, contextContent);

    const geminiHeaders = new Headers();
    geminiHeaders.append('Content-Type', 'application/json');

    // Use structured output - Gemini extracts data AND responds
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(GEMINI_API_KEY.trim())}`,
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
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                message: {
                  type: "string",
                  description: "Your conversational response to the parent (2-3 sentences max)"
                },
                extractedData: {
                  type: "object",
                  properties: {
                    childName: {
                      type: "string",
                      nullable: true,
                      description: "Child's first name if mentioned"
                    },
                    childAge: {
                      type: "number",
                      nullable: true,
                      description: "Child's age in years (2-18)"
                    },
                    preferredDays: {
                      type: "array",
                      items: { type: "number" },
                      nullable: true,
                      description: "Array of day numbers: Sunday=0, Monday=1, etc."
                    },
                    preferredTime: {
                      type: "string",
                      nullable: true,
                      description: "24-hour format HH:MM (e.g., 16:00 for 4pm)"
                    },
                    preferredTimeOfDay: {
                      type: "string",
                      enum: ["morning", "afternoon", "evening"],
                      nullable: true,
                      description: "General time of day preference"
                    }
                  }
                },
                nextState: {
                  type: "string",
                  enum: ["greeting", "collecting_child_info", "collecting_preferences", "showing_recommendations", "confirming_selection", "collecting_payment"],
                  description: "What state should the conversation move to next"
                },
                reasoningNotes: {
                  type: "string",
                  description: "Brief note about what you extracted and why you chose this next state"
                }
              },
              required: ["message", "extractedData", "nextState"]
            }
          }
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API failed: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    console.log('Gemini structured response:', JSON.stringify(geminiData));

    if (!geminiData.candidates || geminiData.candidates.length === 0) {
      throw new Error('Gemini returned no candidates');
    }

    const candidate = geminiData.candidates[0];
    if (!candidate?.content?.parts || candidate.content.parts.length === 0) {
      throw new Error('Gemini response missing content');
    }

    if (!candidate.content.parts[0]?.text) {
      throw new Error('Gemini response missing text');
    }

    // Parse the structured JSON response
    const structuredResponse: GeminiStructuredResponse = JSON.parse(candidate.content.parts[0].text);

    console.log('Parsed structured response:', structuredResponse);
    console.log('Reasoning:', structuredResponse.reasoningNotes);

    // Merge extracted data into context (only non-null values)
    const updatedContext = { ...context };
    if (structuredResponse.extractedData.childName) {
      updatedContext.childName = structuredResponse.extractedData.childName;
    }
    if (structuredResponse.extractedData.childAge) {
      updatedContext.childAge = structuredResponse.extractedData.childAge;
    }
    if (structuredResponse.extractedData.preferredDays) {
      updatedContext.preferredDays = structuredResponse.extractedData.preferredDays;
    }
    if (structuredResponse.extractedData.preferredTime) {
      updatedContext.preferredTime = structuredResponse.extractedData.preferredTime;
    }
    if (structuredResponse.extractedData.preferredTimeOfDay) {
      updatedContext.preferredTimeOfDay = structuredResponse.extractedData.preferredTimeOfDay;
    }

    // Age validation
    if (structuredResponse.extractedData.childAge &&
        (structuredResponse.extractedData.childAge < 2 || structuredResponse.extractedData.childAge > 18)) {
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update conversation with merged context
    await supabase
      .from('conversations')
      .update({
        state: structuredResponse.nextState,
        context: updatedContext,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    const response = {
      success: true,
      response: {
        message: structuredResponse.message,
        nextState: structuredResponse.nextState,
        extractedData: structuredResponse.extractedData,
        quickReplies: getQuickReplies(structuredResponse.nextState),
        progress: calculateProgress(structuredResponse.nextState),
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

async function loadContextFiles(currentState: string): Promise<string> {
  // Always load core context files
  const baseFiles = [
    'communication-style.md',
    'business-rules.md',
  ];

  // Load state-specific context
  const stateSpecificFiles: Record<string, string[]> = {
    'greeting': ['registration-flow.md'],
    'collecting_child_info': ['registration-flow.md', 'data-extraction.md'],
    'collecting_preferences': ['registration-flow.md', 'data-extraction.md'],
    'showing_recommendations': ['registration-flow.md', 'error-handling.md'],
    'confirming_selection': ['error-handling.md'],
    'collecting_payment': ['error-handling.md'],
  };

  const filesToLoad = [
    ...baseFiles,
    ...(stateSpecificFiles[currentState] || [])
  ];

  // Remove duplicates
  const uniqueFiles = [...new Set(filesToLoad)];

  // Read all context files
  const contextParts: string[] = [];
  for (const filename of uniqueFiles) {
    try {
      const filePath = `./context/${filename}`;
      const content = await Deno.readTextFile(filePath);
      contextParts.push(`\n# Context from ${filename}\n${content}`);
    } catch (error) {
      console.warn(`Could not load context file ${filename}:`, error);
    }
  }

  return contextParts.join('\n\n---\n');
}

function buildSystemPrompt(message: string, context: any, contextContent: string): string {
  // Build summary of known information
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
    ? `## Information You Already Have (DO NOT ask again):\n${knownInfo.join('\n')}`
    : '## You have no information yet - start collecting it.';

  // Determine what's missing
  const missingInfo: string[] = [];
  if (!context.childName) missingInfo.push('child\'s name');
  if (!context.childAge) missingInfo.push('child\'s age');
  if (!context.preferredDays) missingInfo.push('preferred days');
  if (!context.preferredTimeOfDay && !context.preferredTime) missingInfo.push('preferred time of day');

  const missingInfoText = missingInfo.length > 0
    ? `## What You Still Need:\n${missingInfo.map(item => `- ${item}`).join('\n')}\n\n**Ask for ONE missing item at a time.**`
    : '## You have all required information!\nMove to showing recommendations.';

  return `# Your Task
You are Kai, helping a parent register their child for youth sports programs.

${knownInfoText}

${missingInfoText}

# Current Conversation Context
- **Current State**: ${context.currentState}
- **Parent's Latest Message**: "${message}"

${contextContent}

# Your Response Requirements

You must return a JSON object with:
1. **message**: Your conversational response (2-3 sentences max)
2. **extractedData**: Any data you extracted from the parent's message
   - Set fields to null if not mentioned
   - Only extract what the parent explicitly said
3. **nextState**: The next conversation state
4. **reasoningNotes**: Brief explanation of your extraction and state decision

# Critical Rules
- NEVER ask for information you already have (marked with ✓)
- Extract ALL relevant data from the message
- If parent provides multiple pieces of info, acknowledge ALL before asking for more
- Move to next state when you have everything needed for current state
- Keep your message warm, brief, and efficient

Now respond:`;
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
