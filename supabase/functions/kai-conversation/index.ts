import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { message, context } = await req.json();

    console.log('Received message:', message);
    console.log('Current context:', JSON.stringify(context, null, 2));

    // Build conversation history for Gemini
    const conversationHistory = context.messages || [];
    const systemContext = await buildSystemContext(context);

    // Call Gemini API
    const geminiResponse = await callGeminiAPI(systemContext, conversationHistory, message);

    console.log('Gemini response:', JSON.stringify(geminiResponse, null, 2));

    // Parse extracted data and determine next state
    const extractedData = geminiResponse.extractedData || {};
    const updatedContext = { ...context, ...extractedData };

    // Check if we have enough info to fetch sessions
    let recommendations = null;
    let fullSessionInfo = null;

    if (updatedContext.childAge && updatedContext.preferredDays && updatedContext.preferredDays.length > 0) {
      console.log('Have enough info to fetch sessions');

      // First check if the user is asking for a specific session that might be full
      const fullCheck = await checkForFullRequestedSession(
        supabaseClient,
        context.organizationId,
        updatedContext.childAge,
        updatedContext.preferredDays,
        updatedContext.preferredTimeOfDay,
        updatedContext.preferredProgram
      );

      if (fullCheck.isFullMatch) {
        console.log('Found matching full session, fetching alternatives');
        fullSessionInfo = fullCheck.session;

        // Fetch alternatives for the full session
        const alternatives = await fetchAlternativeSessions(
          supabaseClient,
          context.organizationId,
          updatedContext.childAge,
          updatedContext.preferredProgram,
          updatedContext.preferredDays
        );

        // Build special prompt for full session scenario
        const fullSessionPrompt = buildFullSessionPrompt(updatedContext, fullSessionInfo, alternatives);
        const fullResponse = await callGeminiWithPrompt(fullSessionPrompt, message);

        return new Response(
          JSON.stringify({
            success: true,
            response: {
              message: fullResponse.message,
              nextState: 'showing_full_session',
              extractedData: updatedContext,
              quickReplies: fullResponse.quickReplies || [],
              progress: calculateProgress(updatedContext),
              fullSession: fullSessionInfo,
              alternatives: alternatives,
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch regular available sessions
      recommendations = await fetchMatchingSessions(
        supabaseClient,
        context.organizationId,
        updatedContext.childAge,
        updatedContext.preferredDays,
        updatedContext.preferredTimeOfDay,
        updatedContext.preferredProgram
      );

      console.log(`Found ${recommendations.length} recommendations`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        response: {
          message: geminiResponse.message,
          nextState: geminiResponse.nextState || 'collecting_preferences',
          extractedData: updatedContext,
          quickReplies: geminiResponse.quickReplies || [],
          progress: calculateProgress(updatedContext),
          recommendations: recommendations,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in kai-conversation:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        response: {
          message: "I'm having trouble processing your request. Could you try rephrasing that?",
          nextState: 'error',
          extractedData: {},
          quickReplies: ['Start over', 'Try again'],
          progress: 0,
          recommendations: null,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function buildSystemContext(context: any): string {
  const hasChildName = !!context.childName;
  const hasChildAge = !!context.childAge;
  const hasPreferences = !!(context.preferredDays && context.preferredDays.length > 0);

  let systemPrompt = `You are Kai, a friendly AI assistant helping parents register their children for youth sports and activity programs.

## Your Personality
- Warm, conversational, and helpful
- Never robotic or overly formal
- Keep responses SHORT (1-3 sentences max)
- Ask ONE question at a time
- Use parent's language naturally

## Current Registration Progress`;

  if (!hasChildName) {
    systemPrompt += `\n- Need: Child's name (ask first)`;
  } else {
    systemPrompt += `\n- ✓ Have: Child's name (${context.childName})`;
  }

  if (!hasChildAge) {
    systemPrompt += `\n- Need: Child's age (ask after name)`;
  } else {
    systemPrompt += `\n- ✓ Have: Child's age (${context.childAge})`;
  }

  if (!hasPreferences) {
    systemPrompt += `\n- Need: Schedule preferences (days and times)`;
  } else {
    const days = (context.preferredDays || []).map((d: number) =>
      ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d]
    ).join(', ');
    systemPrompt += `\n- ✓ Have: Preferences (${days}${context.preferredTimeOfDay ? ', ' + context.preferredTimeOfDay : ''})`;
  }

  systemPrompt += `

## Data Extraction Rules
ALWAYS extract structured data from the parent's message in your response JSON:

{
  "message": "Your conversational response here",
  "extractedData": {
    "childName": "extracted name or null",
    "childAge": extracted_number or null,
    "preferredDays": [array of day numbers 0-6] or null,
    "preferredTimeOfDay": "morning|afternoon|evening|any" or null,
    "preferredProgram": "sport name" or null
  },
  "nextState": "greeting|collecting_child_info|collecting_preferences|showing_recommendations",
  "quickReplies": ["suggestion 1", "suggestion 2"]
}

### Day Extraction
- Monday=1, Tuesday=2, Wednesday=3, Thursday=4, Friday=5, Saturday=6, Sunday=0
- "Weekdays" = [1,2,3,4,5]
- "Weekends" = [0,6]
- "Any day" / "Show all options" / "Flexible" = [0,1,2,3,4,5,6]

### Program Extraction
Look for sport/activity names: soccer, basketball, swim, tennis, art, dance, etc.

### Time of Day
- Before 12pm = "morning"
- 12pm-5pm = "afternoon"
- After 5pm = "evening"
- "Any time" / "Flexible" = "any"

## Conversation Guidelines
1. If you don't have the child's name, ask for it warmly
2. Once you have name, ask for age if missing
3. Once you have both, ask about schedule preferences
4. Keep it conversational - don't sound like a form
5. If parent provides multiple pieces of info, acknowledge ALL before asking next question

## Example Exchanges

Parent: "My daughter Emma needs soccer"
You: {
  "message": "Great choice! How old is Emma?",
  "extractedData": { "childName": "Emma", "preferredProgram": "soccer" },
  "nextState": "collecting_child_info",
  "quickReplies": []
}

Parent: "She's 7 and Wednesdays work best"
You: {
  "message": "Perfect! Emma is 7 and Wednesdays work great. What time of day on Wednesdays?",
  "extractedData": { "childAge": 7, "preferredDays": [3] },
  "nextState": "collecting_preferences",
  "quickReplies": ["Morning", "Afternoon", "Evening"]
}

Parent: "Morning classes please"
You: {
  "message": "Got it! Let me find morning soccer classes on Wednesdays for Emma.",
  "extractedData": { "preferredTimeOfDay": "morning" },
  "nextState": "showing_recommendations",
  "quickReplies": []
}`;

  return systemPrompt;
}

async function callGeminiAPI(systemContext: string, conversationHistory: any[], userMessage: string): Promise<any> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const messages = conversationHistory.map((msg: any) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  messages.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: systemContext }]
      },
      contents: messages,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Gemini API error:', error);
    throw new Error(`Gemini API failed: ${response.status}`);
  }

  const data = await response.json();
  const textResponse = data.candidates[0].content.parts[0].text;

  try {
    return JSON.parse(textResponse);
  } catch (e) {
    console.error('Failed to parse Gemini response as JSON:', textResponse);
    return {
      message: textResponse,
      extractedData: {},
      nextState: 'collecting_preferences',
      quickReplies: []
    };
  }
}

async function callGeminiWithPrompt(prompt: string, userMessage: string): Promise<any> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: prompt }]
      },
      contents: [{
        role: 'user',
        parts: [{ text: userMessage }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API failed: ${response.status}`);
  }

  const data = await response.json();
  const textResponse = data.candidates[0].content.parts[0].text;

  try {
    return JSON.parse(textResponse);
  } catch (e) {
    return {
      message: textResponse,
      quickReplies: []
    };
  }
}

function calculateProgress(context: any): number {
  let progress = 0;
  if (context.childName) progress += 33;
  if (context.childAge) progress += 33;
  if (context.preferredDays && context.preferredDays.length > 0) progress += 34;
  return progress;
}

async function fetchMatchingSessions(
  supabase: any,
  organizationId: string,
  childAge: number,
  preferredDays: number[],
  preferredTimeOfDay?: string,
  preferredProgram?: string
): Promise<any[]> {
  console.log('Fetching sessions with criteria:', {
    organizationId,
    childAge,
    preferredDays,
    preferredTimeOfDay,
    preferredProgram
  });

  const { data: sessions, error } = await supabase
    .from('sessions')
    .select(`
      id,
      day_of_week,
      start_time,
      start_date,
      end_date,
      capacity,
      enrolled_count,
      status,
      program:programs!inner (
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

    // Filter out full sessions
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
      reasons.push('INVALID_AGE_RANGE');
      console.log(`Session ${session.id} filtered: ${reasons.join(', ')}`);
      return false;
    }

    const minAge = parseInt(ageRangeMatch[1]);
    const maxAge = parseInt(ageRangeMatch[2]);

    if (childAge < minAge || childAge >= maxAge) {
      reasons.push(`AGE_MISMATCH (child ${childAge}, program ${minAge}-${maxAge})`);
      console.log(`Session ${session.id} filtered: ${reasons.join(', ')}`);
      return false;
    }

    if (!preferredDays.includes(session.day_of_week)) {
      reasons.push(`DAY_MISMATCH (session day ${session.day_of_week}, preferred ${preferredDays.join(',')})`);
      console.log(`Session ${session.id} filtered: ${reasons.join(', ')}`);
      return false;
    }

    if (preferredProgram) {
      const programNameMatch = program.name.toLowerCase().includes(preferredProgram.toLowerCase());
      if (!programNameMatch) {
        reasons.push(`PROGRAM_MISMATCH (looking for ${preferredProgram}, found ${program.name})`);
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
      if (preferredTimeOfDay === 'afternoon' && (hour < 12 || hour >= 17)) {
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

  // Get top 3 sessions and fetch their ratings
  const topSessions = filtered.slice(0, 3);
  const mapped = await Promise.all(topSessions.map(async (session: any) => {
    const ratings = await fetchSessionRatings(supabase, session.id);

    return {
      sessionId: session.id,
      programName: session.program?.name || 'Unknown Program',
      programDescription: session.program?.description || '',
      ageRange: session.program?.age_range || '[0,18)',
      price: session.program?.price_cents || 0,
      durationWeeks: session.program?.duration_weeks || 0,
      locationId: session.location?.id || null,
      locationName: session.location?.name || 'TBD',
      locationAddress: session.location?.address || '',
      locationRating: ratings.locationRating,
      coachId: session.coach?.id || null,
      coachName: session.coach?.name || 'TBD',
      coachRating: session.coach?.rating || null,
      sessionRating: ratings.sessionRating,
      dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][session.day_of_week],
      startTime: session.start_time,
      startDate: session.start_date,
      endDate: session.end_date,
      capacity: session.capacity,
      enrolledCount: session.enrolled_count,
      spotsRemaining: session.capacity - session.enrolled_count,
    };
  }));

  console.log(`Found ${mapped.length} matching sessions`);
  return mapped;
}

async function fetchSessionRatings(supabase: any, sessionId: string): Promise<{ sessionRating: number | null; locationRating: number | null }> {
  const { data: reviews } = await supabase
    .from('session_reviews')
    .select('overall_rating, location_rating')
    .eq('session_id', sessionId);

  if (!reviews || reviews.length === 0) {
    return { sessionRating: null, locationRating: null };
  }

  const sessionRating = reviews.reduce((sum: number, r: any) => sum + r.overall_rating, 0) / reviews.length;
  const locationRating = reviews.reduce((sum: number, r: any) => sum + (r.location_rating || 0), 0) / reviews.length;

  return {
    sessionRating: Math.round(sessionRating * 10) / 10,
    locationRating: Math.round(locationRating * 10) / 10
  };
}

async function checkForFullRequestedSession(
  supabase: any,
  organizationId: string,
  childAge: number,
  preferredDays?: number[],
  preferredTimeOfDay?: string,
  preferredProgram?: string
): Promise<{ isFullMatch: boolean; session: any | null }> {

  if (!preferredDays || preferredDays.length === 0 || !preferredProgram) {
    return { isFullMatch: false, session: null };
  }

  console.log('Checking for full sessions matching:', { preferredProgram, preferredDays, preferredTimeOfDay });

  const { data: sessions, error } = await supabase
    .from('sessions')
    .select(`
      id,
      day_of_week,
      start_time,
      start_date,
      end_date,
      capacity,
      enrolled_count,
      status,
      program:programs!inner (
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
    .eq('status', 'full')
    .gte('start_date', new Date().toISOString().split('T')[0]);

  if (error || !sessions) {
    return { isFullMatch: false, session: null };
  }

  for (const session of sessions) {
    const program = session.program;
    if (!program) continue;

    if (program.organization_id !== organizationId) continue;

    const programNameMatch = program.name.toLowerCase().includes(preferredProgram.toLowerCase());
    if (!programNameMatch) continue;

    const ageRangeMatch = program.age_range?.match(/\[(\d+),(\d+)\)/);
    if (!ageRangeMatch) continue;

    const minAge = parseInt(ageRangeMatch[1]);
    const maxAge = parseInt(ageRangeMatch[2]);

    if (childAge < minAge || childAge >= maxAge) continue;

    if (!preferredDays.includes(session.day_of_week)) continue;

    if (preferredTimeOfDay && preferredTimeOfDay !== 'any') {
      const startTime = session.start_time;
      const hour = parseInt(startTime.split(':')[0]);

      if (preferredTimeOfDay === 'morning' && hour >= 12) continue;
      if (preferredTimeOfDay === 'afternoon' && (hour < 12 || hour >= 17)) continue;
      if (preferredTimeOfDay === 'evening' && hour < 17) continue;
    }

    console.log('Found full session matching user request:', session.id, program.name);

    const ratings = await fetchSessionRatings(supabase, session.id);

    const mapped = {
      sessionId: session.id,
      programName: program.name,
      programDescription: program.description || '',
      ageRange: program.age_range,
      price: program.price_cents || 0,
      durationWeeks: program.duration_weeks || 0,
      locationId: session.location?.id || null,
      locationName: session.location?.name || 'TBD',
      locationAddress: session.location?.address || '',
      locationRating: ratings.locationRating,
      coachId: session.coach?.id || null,
      coachName: session.coach?.name || 'TBD',
      coachRating: session.coach?.rating || null,
      sessionRating: ratings.sessionRating,
      dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][session.day_of_week],
      startTime: session.start_time,
      startDate: session.start_date,
      endDate: session.end_date,
      capacity: session.capacity,
      enrolledCount: session.enrolled_count,
      spotsRemaining: 0,
      isFull: true,
    };

    return { isFullMatch: true, session: mapped };
  }

  return { isFullMatch: false, session: null };
}

async function fetchAlternativeSessions(
  supabase: any,
  organizationId: string,
  childAge: number,
  preferredProgram?: string,
  preferredDays?: number[]
): Promise<any[]> {

  const { data: sessions, error } = await supabase
    .from('sessions')
    .select(`
      id,
      day_of_week,
      start_time,
      start_date,
      end_date,
      capacity,
      enrolled_count,
      status,
      program:programs!inner (
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
    .lt('enrolled_count', supabase.rpc('capacity'))
    .gte('start_date', new Date().toISOString().split('T')[0]);

  if (error || !sessions) {
    return [];
  }

  const alternatives: any[] = [];

  for (const session of sessions) {
    const program = session.program;
    if (!program) continue;

    if (program.organization_id !== organizationId) continue;

    const ageRangeMatch = program.age_range?.match(/\[(\d+),(\d+)\)/);
    if (!ageRangeMatch) continue;

    const minAge = parseInt(ageRangeMatch[1]);
    const maxAge = parseInt(ageRangeMatch[2]);

    if (childAge < minAge || childAge >= maxAge) continue;

    if (preferredProgram) {
      const programNameMatch = program.name.toLowerCase().includes(preferredProgram.toLowerCase());
      if (programNameMatch) {
        alternatives.push(session);
      }
    }
  }

  console.log(`Found ${alternatives.length} alternative sessions before mapping`);

  // Get top 3 alternatives and fetch their ratings
  const topAlternatives = alternatives.slice(0, 3);
  const mappedAlternatives = await Promise.all(topAlternatives.map(async (session: any) => {
    const ratings = await fetchSessionRatings(supabase, session.id);
    const program = session.program;

    return {
      sessionId: session.id,
      programName: program.name,
      programDescription: program.description || '',
      ageRange: program.age_range,
      price: program.price_cents || 0,
      durationWeeks: program.duration_weeks || 0,
      locationId: session.location?.id || null,
      locationName: session.location?.name || 'TBD',
      locationAddress: session.location?.address || '',
      locationRating: ratings.locationRating,
      coachId: session.coach?.id || null,
      coachName: session.coach?.name || 'TBD',
      coachRating: session.coach?.rating || null,
      sessionRating: ratings.sessionRating,
      dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][session.day_of_week],
      startTime: session.start_time,
      startDate: session.start_date,
      endDate: session.end_date,
      capacity: session.capacity,
      enrolledCount: session.enrolled_count,
      spotsRemaining: session.capacity - session.enrolled_count,
    };
  }));

  console.log(`Returning ${mappedAlternatives.length} alternative sessions with ratings`);
  return mappedAlternatives;
}

function buildFullSessionPrompt(context: any, fullSession: any, alternatives: any[]): string {
  const hasAlternatives = alternatives.length > 0;

  const alternativesText = hasAlternatives
    ? alternatives.map((alt: any) => `${alt.programName} on ${alt.dayOfWeek}s at ${alt.startTime}`).join(', ')
    : 'none at this time';

  return `You are Kai, a friendly AI helping parents register their children for youth sports programs.

## SITUATION:
A parent requested: ${fullSession.programName} on ${fullSession.dayOfWeek}s at ${fullSession.startTime}
For ${context.childName || 'their child'} (age ${context.childAge})

Unfortunately, THIS SPECIFIC CLASS IS FULL (${fullSession.enrolledCount}/${fullSession.capacity} enrolled).

${hasAlternatives ? `## AVAILABLE ALTERNATIVES:
${alternativesText}

Your job: Acknowledge the full class, then suggest these alternatives enthusiastically.` : `## NO ALTERNATIVES AVAILABLE
Your job: Acknowledge the full class and offer to add them to the waitlist.`}

## YOUR RESPONSE (JSON format):
{
  "message": "Your 1-2 sentence response acknowledging the full class and ${hasAlternatives ? 'suggesting alternatives' : 'offering waitlist'}",
  "quickReplies": ${hasAlternatives ? '["View alternatives", "Join waitlist"]' : '["Join waitlist", "Show other programs"]'}
}

Keep it friendly and helpful. Don't apologize excessively.`;
}
