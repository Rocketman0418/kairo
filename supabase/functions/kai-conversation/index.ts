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
    preferredTimeOfDay?: 'morning' | 'afternoon' | 'evening' | 'any' | null;
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

    const contextContent = await loadContextFiles(context.currentState);

    const systemPrompt = buildSystemPrompt(message, context, contextContent);

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
                      description: "Array of day numbers: Sunday=0, Monday=1, etc. Use [0,1,2,3,4,5,6] if parent says 'show me all options' or 'flexible'"
                    },
                    preferredTime: {
                      type: "string",
                      nullable: true,
                      description: "24-hour format HH:MM (e.g., 16:00 for 4pm)"
                    },
                    preferredTimeOfDay: {
                      type: "string",
                      enum: ["morning", "afternoon", "evening", "any"],
                      nullable: true,
                      description: "General time of day preference. Use 'any' if parent says 'show me all options', 'flexible', 'any time', etc."
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

    const structuredResponse: GeminiStructuredResponse = JSON.parse(candidate.content.parts[0].text);

    console.log('Parsed structured response:', structuredResponse);
    console.log('Reasoning:', structuredResponse.reasoningNotes);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    let recommendations = null;
    if (structuredResponse.nextState === 'showing_recommendations' &&
        updatedContext.childAge &&
        (updatedContext.preferredDays || updatedContext.preferredTimeOfDay)) {

      recommendations = await fetchMatchingSessions(
        supabase,
        context.organizationId,
        updatedContext.childAge,
        updatedContext.preferredDays,
        updatedContext.preferredTimeOfDay
      );
    }

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
        recommendations: recommendations,
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
  const baseFiles = [
    'communication-style.md',
    'business-rules.md',
  ];

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

  const uniqueFiles = [...new Set(filesToLoad)];

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
- **SPECIAL**: If parent says "show me all options", "I'm flexible", "any day/time works":
  - Extract preferredDays: [0,1,2,3,4,5,6] (all days)
  - Extract preferredTimeOfDay: "any"
  - Move to showing_recommendations state
  - Respond: "Great! Let me show you all the available options for [child name]."

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

async function fetchMatchingSessions(
  supabase: any,
  organizationId: string,
  childAge: number,
  preferredDays?: number[],
  preferredTimeOfDay?: string
): Promise<any[]> {
  console.log('Fetching sessions for:', { organizationId, childAge, preferredDays, preferredTimeOfDay });

  const { data: sessions, error } = await supabase
    .from('sessions')
    .select(`
      id,
      start_date,
      end_date,
      day_of_week,
      start_time,
      capacity,
      enrolled_count,
      status,
      program:programs (
        id,
        name,
        description,
        age_range,
        price_cents,
        duration_weeks
      ),
      location:locations (
        id,
        name,
        address
      ),
      coach:staff (
        id,
        name,
        rating
      )
    `)
    .eq('status', 'active')
    .gte('start_date', new Date().toISOString().split('T')[0]);

  if (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }

  if (!sessions || sessions.length === 0) {
    console.log('No sessions found');
    return [];
  }

  const filtered = sessions.filter((session: any) => {
    if (session.enrolled_count >= session.capacity) {
      return false;
    }

    const program = session.program;
    if (!program || !program.age_range) return false;

    const ageRangeMatch = program.age_range.match(/\[(\d+),(\d+)\)/);
    if (!ageRangeMatch) return false;

    const minAge = parseInt(ageRangeMatch[1]);
    const maxAge = parseInt(ageRangeMatch[2]);

    if (childAge < minAge || childAge >= maxAge) {
      return false;
    }

    if (preferredDays && preferredDays.length > 0) {
      if (!preferredDays.includes(session.day_of_week)) {
        return false;
      }
    }

    if (preferredTimeOfDay && preferredTimeOfDay !== 'any') {
      const startTime = session.start_time;
      const hour = parseInt(startTime.split(':')[0]);

      if (preferredTimeOfDay === 'morning' && hour >= 12) return false;
      if (preferredTimeOfDay === 'afternoon' && (hour < 12 || hour >= 17)) return false;
      if (preferredTimeOfDay === 'evening' && hour < 17) return false;
    }

    return true;
  });

  const mapped = filtered.slice(0, 3).map((session: any) => ({
    sessionId: session.id,
    programName: session.program.name,
    programDescription: session.program.description,
    ageRange: session.program.age_range,
    price: session.program.price_cents,
    durationWeeks: session.program.duration_weeks,
    locationName: session.location.name,
    locationAddress: session.location.address,
    coachName: session.coach?.name || 'TBD',
    coachRating: session.coach?.rating || null,
    dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][session.day_of_week],
    startTime: session.start_time,
    startDate: session.start_date,
    endDate: session.end_date,
    capacity: session.capacity,
    enrolledCount: session.enrolled_count,
    spotsRemaining: session.capacity - session.enrolled_count,
  }));

  console.log(`Found ${mapped.length} matching sessions`);
  return mapped;
}
