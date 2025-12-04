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

    const contextContent = loadContextFiles(context.currentState);

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
    let finalMessage = structuredResponse.message;
    let finalNextState = structuredResponse.nextState;

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

      // If no results found, ask Gemini to offer alternatives
      if (!recommendations || recommendations.length === 0) {
        console.log('No recommendations found - asking Gemini for alternative suggestions');

        const noResultsPrompt = buildNoResultsPrompt(updatedContext);
        const alternativeResponse = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + GEMINI_API_KEY,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: noResultsPrompt }]
              }],
              generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      description: "Your empathetic response offering to help find alternatives"
                    },
                    suggestedAlternatives: {
                      type: "array",
                      items: { type: "string" },
                      description: "2-3 specific alternative suggestions (e.g., 'Try weekday afternoons', 'Show me all available times')"
                    }
                  },
                  required: ["message", "suggestedAlternatives"]
                }
              }
            }),
          }
        );

        if (alternativeResponse.ok) {
          const altData = await alternativeResponse.json();
          if (altData.candidates?.[0]?.content?.parts?.[0]?.text) {
            const altParsed = JSON.parse(altData.candidates[0].content.parts[0].text);
            finalMessage = altParsed.message;
            finalNextState = 'collecting_preferences';
            console.log('Alternative suggestions:', altParsed.suggestedAlternatives);
          }
        }
      }
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
        state: finalNextState,
        context: updatedContext,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    const response = {
      success: true,
      response: {
        message: finalMessage,
        nextState: finalNextState,
        extractedData: structuredResponse.extractedData,
        quickReplies: getQuickReplies(finalNextState),
        progress: calculateProgress(finalNextState),
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

function loadContextFiles(currentState: string): string {
  const contexts = {
    businessRules: `# Business Rules & Program Structure\n\n## Age Requirements\n- Programs serve children ages **2-18 years old**\n- Each program has specific age ranges (e.g., \"Mini Soccer\" for ages 4-6)\n- If parent provides age outside 2-18, politely ask them to double-check\n\n## Session Structure\nA \"session\" is a specific class instance with:\n- **Program**: The activity type (Soccer, Swimming, Basketball, etc.)\n- **Location**: Where it meets\n- **Day of Week**: Monday (1) through Sunday (0)\n- **Time**: Start time (e.g., 4:00 PM)\n- **Duration**: Usually 1-2 hours\n- **Capacity**: Maximum number of children\n- **Coach**: Instructor name\n\n## Scheduling Patterns\n- Most programs run once per week\n- Common time slots:\n  - Morning: 9:00 AM - 11:00 AM\n  - Afternoon: 3:00 PM - 5:00 PM\n  - Evening: 6:00 PM - 8:00 PM\n- Weekend sessions typically start later (10 AM+)\n\n## Waitlist Handling\nIf a session is full:\n1. Offer to add them to the waitlist for that specific session\n2. Suggest alternative sessions (different day/time, same program)\n3. Suggest similar programs if no alternatives available\n\n## Data Interpretation Guidelines\n\n### Days of Week\n- \"Weekdays\" = Monday-Friday (1,2,3,4,5)\n- \"Weekends\" = Saturday-Sunday (6,0)\n- \"Monday or Wednesday\" = [1, 3]\n- \"Mondays are best, but also Thursday or Friday\" = [1, 4, 5]\n\n### Time of Day\n- \"Morning\" = before 12:00 PM\n- \"Afternoon\" = 12:00 PM - 5:00 PM\n- \"Evening\" = after 5:00 PM\n- \"4pm\" or \"4:00\" = 16:00 (convert to 24-hour format)\n- \"Around 4\" = approximately 16:00, afternoon\n- \"After school\" = afternoon or evening\n\n### Age Patterns\n- \"He's 9\" = 9 years old\n- \"She just turned 7\" = 7 years old\n- \"Almost 6\" = 5 years old (use lower bound for safety)\n- If unclear, ask for specific age`,
    communicationStyle: `# Communication Style Guide\n\n## Your Identity\nYou are Kai, a friendly AI assistant helping busy parents with registration. You understand they may be:\n- Juggling multiple children\n- Doing this on their phone while multitasking\n- Interrupted frequently\n- Time-constrained\n\n## Tone Guidelines\n✅ **DO:**\n- Be warm and encouraging (\"That's great!\", \"Perfect!\")\n- Keep responses to 2-3 sentences maximum\n- Use conversational, natural language\n- Show empathy (\"I know schedules can be tricky\")\n- Be efficient and respectful of their time\n- Acknowledge what they tell you (\"Got it, Mark is 9\")\n\n❌ **DON'T:**\n- Use robotic or formal language\n- Ask to \"confirm\" information they just provided\n- Repeat back data unnecessarily\n- Use corporate jargon\n- Be overly chatty or verbose\n- Apologize excessively`,
    dataExtraction: `# Data Extraction Guidelines\n\n## Your Responsibility\nYou must extract structured data from parent messages AND provide a conversational response. You do both simultaneously.\n\n## Extraction Rules\n\n### Child's Name\n- Extract ANY name mentioned in context of \"the child\" or \"my son/daughter\"\n- First name only is sufficient\n\n### Child's Age\n- Extract numeric age in years\n- Must be between 2-18 (if outside range, set to null and ask parent to verify)\n\n### Preferred Days\n- Convert day names to numbers: Sunday=0, Monday=1, Tuesday=2, Wednesday=3, Thursday=4, Friday=5, Saturday=6\n- Extract as array of numbers\n- **SPECIAL CASE**: If parent says \"show me all options\", \"any day\", \"flexible\", \"whatever works\", etc., extract ALL days [0,1,2,3,4,5,6]\n\n### Preferred Time of Day\n- Use for general time preferences (without specific time)\n- Values: \"morning\", \"afternoon\", \"evening\", or \"any\"\n- **SPECIAL CASE**: If parent says \"show me all options\", \"any time\", \"flexible\", set to \"any\"`,
    errorHandling: `# Error Handling & Edge Cases\n\n## Handling Unclear Input\n\n### When You Don't Understand\nIf parent's message is ambiguous or unclear:\n1. Don't guess - ask for clarification\n2. Stay friendly and blame the system, not them\n3. Offer examples if helpful`,
    registrationFlow: `# Registration Flow Context\n\n## Overview\nYou are helping parents register their children for youth sports and activity programs. The entire process should take under 5 minutes and feel effortless.\n\n## Required Information (in order)\n1. **Child's Name** - First name is sufficient for conversation\n2. **Child's Age** - Numeric age in years (2-18 range)\n3. **Schedule Preferences** - Which days and times work for the family\n\n## Conversation Flow States\n- **greeting**: Initial welcome, ask for child's name\n- **collecting_child_info**: Getting name and/or age\n- **collecting_preferences**: Getting schedule preferences\n- **showing_recommendations**: Present matching session options\n- **confirming_selection**: Confirm their choice before payment\n- **collecting_payment**: Handle payment details\n\n## Important Principles\n- Never ask for information you already have\n- Ask ONE question at a time\n- Move forward as soon as you have what you need for the current state`
  };

  const stateSpecificContext: Record<string, string[]> = {
    'greeting': ['registrationFlow'],
    'collecting_child_info': ['registrationFlow', 'dataExtraction', 'errorHandling'],
    'collecting_preferences': ['registrationFlow', 'dataExtraction', 'errorHandling'],
    'showing_recommendations': ['registrationFlow'],
  };

  const baseContext = [contexts.communicationStyle, contexts.businessRules];
  const stateContext = (stateSpecificContext[currentState] || []).map(key => contexts[key as keyof typeof contexts]);

  return [...baseContext, ...stateContext].join('\n\n');
}

function buildSystemPrompt(userMessage: string, context: any, contextContent: string): string {
  return `You are Kai, a conversational AI helping parents register their children for youth sports programs.\n\n## CURRENT CONVERSATION STATE: ${context.currentState}\n\n## WHAT YOU KNOW SO FAR:\n- Child Name: ${context.childName || 'unknown'}\n- Child Age: ${context.childAge || 'unknown'}\n- Preferred Days: ${context.preferredDays ? JSON.stringify(context.preferredDays) : 'unknown'}\n- Preferred Time: ${context.preferredTime || 'unknown'}\n- Preferred Time of Day: ${context.preferredTimeOfDay || 'unknown'}\n\n## CONTEXT & GUIDELINES:\n${contextContent}\n\n## USER'S LATEST MESSAGE:\n\"${userMessage}\"\n\n## YOUR TASK:\n1. Extract any new data from the user's message (name, age, day preferences, time preferences)\n2. Provide a warm, conversational response (2-3 sentences max)\n3. Determine the next conversation state\n4. If moving to 'showing_recommendations', ensure you have: childAge AND (preferredDays OR preferredTimeOfDay)\n\nIMPORTANT EXTRACTION RULES:\n- \"Weekend mornings\" = preferredDays: [0, 6], preferredTimeOfDay: \"morning\"\n- \"Weekday afternoons\" = preferredDays: [1, 2, 3, 4, 5], preferredTimeOfDay: \"afternoon\"\n- \"Show me all options\" = preferredDays: [0,1,2,3,4,5,6], preferredTimeOfDay: \"any\"\n\nRespond with valid JSON matching the required schema.`;
}

function buildNoResultsPrompt(context: any): string {
  const daysText = context.preferredDays
    ? context.preferredDays.map((d: number) => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d]).join(', ')
    : 'any day';

  const timeText = context.preferredTimeOfDay || 'any time';

  return `You are Kai, a friendly AI helping parents register their children for youth sports programs.\n\n## SITUATION:\nA parent is trying to register ${context.childName || 'their child'} (age ${context.childAge}) and requested:\n- Days: ${daysText}\n- Time: ${timeText}\n\nUnfortunately, NO sessions matched these criteria.\n\n## YOUR TASK:\n1. Express empathy and acknowledge that no matches were found\n2. Offer to help find alternatives\n3. Suggest 2-3 specific alternatives they could try instead\n\n## ALTERNATIVE SUGGESTIONS TO CONSIDER:\n- \"Try weekday afternoons instead\"\n- \"Try weekend mornings instead\"\n- \"Show me all available times\"\n- \"Try evenings instead\"\n- \"Would a different day of the week work?\"\n\nKeep your response warm, brief (2-3 sentences), and helpful. Don't apologize excessively.\n\nExamples:\n- \"I couldn't find any sessions for ${daysText} ${timeText}, but I'd love to help you find something that works! Would you like to try weekday afternoons, or should I show you all available options?\"\n- \"Hmm, no matches for ${daysText} ${timeText}. How about we look at weekday evenings, or I can show you everything available for age ${context.childAge}?\"\n\nRespond with valid JSON matching the required schema.`;
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
    console.log('No sessions found in database');
    return [];
  }

  console.log(`Found ${sessions.length} total sessions, now filtering...`);

  const filtered = sessions.filter((session: any) => {
    const reasons: string[] = [];

    if (session.enrolled_count >= session.capacity) {
      reasons.push('FULL');
      console.log(`Session ${session.id} filtered: ${reasons.join(', ')}`);
      return false;
    }

    const program = session.program;
    if (!program || !program.age_range) {
      reasons.push('NO_PROGRAM_DATA');
      console.log(`Session ${session.id} filtered: ${reasons.join(', ')}`);
      return false;
    }

    if (program.organization_id !== organizationId) {
      reasons.push(`WRONG_ORG (${program.organization_id} !== ${organizationId})`);
      console.log(`Session ${session.id} filtered: ${reasons.join(', ')}`);
      return false;
    }

    const ageRangeMatch = program.age_range.match(/\[(\d+),(\d+)\)/);
    if (!ageRangeMatch) {
      reasons.push('AGE_RANGE_PARSE_ERROR');
      console.log(`Session ${session.id} filtered: ${reasons.join(', ')}`);
      return false;
    }

    const minAge = parseInt(ageRangeMatch[1]);
    const maxAge = parseInt(ageRangeMatch[2]);

    if (childAge < minAge || childAge >= maxAge) {
      reasons.push(`AGE_MISMATCH (need ${minAge}-${maxAge}, got ${childAge})`);
      console.log(`Session ${session.id} filtered: ${reasons.join(', ')}`);
      return false;
    }

    if (preferredDays && preferredDays.length > 0) {
      if (!preferredDays.includes(session.day_of_week)) {
        reasons.push(`DAY_MISMATCH (need ${preferredDays}, got ${session.day_of_week})`);
        console.log(`Session ${session.id} filtered: ${reasons.join(', ')}`);
        return false;
      }
    }

    if (preferredTimeOfDay && preferredTimeOfDay !== 'any') {
      const startTime = session.start_time;
      const hour = parseInt(startTime.split(':')[0]);

      if (preferredTimeOfDay === 'morning' && hour >= 12) {
        reasons.push(`TIME_MISMATCH (morning but hour is ${hour})`);
        console.log(`Session ${session.id} filtered: ${reasons.join(', ')}`);
        return false;
      }
      if (preferredTimeOfDay === 'afternoon' && (hour < 12 || hour >= 19)) {
        reasons.push(`TIME_MISMATCH (afternoon but hour is ${hour})`);
        console.log(`Session ${session.id} filtered: ${reasons.join(', ')}`);
        return false;
      }
      if (preferredTimeOfDay === 'evening' && hour < 17) {
        reasons.push(`TIME_MISMATCH (evening but hour is ${hour})`);
        console.log(`Session ${session.id} filtered: ${reasons.join(', ')}`);
        return false;
      }
    }

    console.log(`✅ Session ${session.id} (${program.name}) PASSED all filters`);
    return true;
  });

  console.log(`After filtering: ${filtered.length} sessions matched`);

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