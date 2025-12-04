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

    const geminiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + GEMINI_API_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: systemPrompt }]
          }],
          generationConfig: {
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
                      description: "Array of day numbers (0=Sunday, 1=Monday, etc.). Use ALL days [0,1,2,3,4,5,6] if parent says 'show all options' or 'flexible'."
                    },
                    preferredTime: {
                      type: "string",
                      nullable: true,
                      description: "Specific time in HH:MM format (24-hour)"
                    },
                    preferredTimeOfDay: {
                      type: "string",
                      nullable: true,
                      description: "General time of day preference: 'morning', 'afternoon', 'evening', or 'any'. Use 'any' if parent says 'show me all options', 'flexible', 'any time', etc."
                    }
                  }
                },
                nextState: {
                  type: "string",
                  description: "What state should the conversation move to next: 'greeting', 'collecting_child_info', 'collecting_preferences', 'showing_recommendations', 'confirming_selection', 'collecting_payment'"
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

      console.log('Fetching recommendations with context:', {
        childAge: updatedContext.childAge,
        preferredDays: updatedContext.preferredDays,
        preferredTimeOfDay: updatedContext.preferredTimeOfDay
      });

      recommendations = await fetchMatchingSessions(
        supabase,
        context.organizationId,
        updatedContext.childAge,
        updatedContext.preferredDays,
        updatedContext.preferredTimeOfDay
      );

      console.log('Recommendations result:', recommendations);
    } else {
      console.log('Skipping recommendations fetch:', {
        nextState: structuredResponse.nextState,
        childAge: updatedContext.childAge,
        preferredDays: updatedContext.preferredDays,
        preferredTimeOfDay: updatedContext.preferredTimeOfDay,
        reason: structuredResponse.nextState !== 'showing_recommendations' ? 'wrong state' :
                !updatedContext.childAge ? 'no child age' :
                'no preferences'
      });
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
    'collecting_child_info': ['registration-flow.md', 'data-extraction.md', 'error-handling.md'],
    'collecting_preferences': ['registration-flow.md', 'data-extraction.md', 'error-handling.md'],
    'showing_recommendations': ['registration-flow.md'],
  };

  const filesToLoad = [...baseFiles, ...(stateSpecificFiles[currentState] || [])];

  const contextParts: string[] = [];
  for (const filename of filesToLoad) {
    try {
      const content = await Deno.readTextFile(`./context/${filename}`);
      contextParts.push(`\n--- ${filename} ---\n${content}`);
    } catch (error) {
      console.error(`Could not load ${filename}:`, error);
    }
  }

  return contextParts.join('\n');
}

function buildSystemPrompt(userMessage: string, context: any, contextContent: string): string {
  return `You are Kai, a conversational AI helping parents register their children for youth sports programs.

## CURRENT CONVERSATION STATE: ${context.currentState}

## WHAT YOU KNOW SO FAR:
- Child Name: ${context.childName || 'unknown'}
- Child Age: ${context.childAge || 'unknown'}
- Preferred Days: ${context.preferredDays ? JSON.stringify(context.preferredDays) : 'unknown'}
- Preferred Time: ${context.preferredTime || 'unknown'}
- Preferred Time of Day: ${context.preferredTimeOfDay || 'unknown'}

## CONTEXT & GUIDELINES:
${contextContent}

## USER'S LATEST MESSAGE:
"${userMessage}"

## YOUR TASK:
1. Extract any new data from the user's message (name, age, day preferences, time preferences)
2. Provide a warm, conversational response (2-3 sentences max)
3. Determine the next conversation state
4. If moving to 'showing_recommendations', ensure you have: childAge AND (preferredDays OR preferredTimeOfDay)

IMPORTANT EXTRACTION RULES:
- "Weekend mornings" = preferredDays: [0, 6], preferredTimeOfDay: "morning"
- "Weekday afternoons" = preferredDays: [1, 2, 3, 4, 5], preferredTimeOfDay: "afternoon"
- "Show me all options" = preferredDays: [0,1,2,3,4,5,6], preferredTimeOfDay: "any"

Respond with valid JSON matching the required schema.`;
}

function getQuickReplies(state: string): string[] {
  const replies: Record<string, string[]> = {
    'greeting': [],
    'collecting_child_info': [],
    'collecting_preferences': ['Weekday afternoons', 'Weekend mornings', 'Show me all options'],
    'showing_recommendations': ['Tell me more', 'See other times', 'This looks perfect'],
    'confirming_selection': ['Yes, sign me up!', 'Show me other options'],
  };

  return replies[state] || [];
}

function calculateProgress(state: string): number {
  const stateProgress: Record<string, number> = {
    'greeting': 0,
    'collecting_child_info': 20,
    'collecting_preferences': 40,
    'showing_recommendations': 60,
    'confirming_selection': 80,
    'collecting_payment': 90,
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
        duration_weeks,
        organization_id
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

    if (program.organization_id !== organizationId) {
      return false;
    }

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