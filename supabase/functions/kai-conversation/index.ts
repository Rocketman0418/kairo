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

    // Check if user selected a specific session (clicked "Select" button)
    if (context.selectedSessionId) {
      console.log('User selected specific session:', context.selectedSessionId);

      // Fetch the specific selected session details
      const selectedSessionDetails = await fetchSessionById(
        supabaseClient,
        context.selectedSessionId
      );

      if (selectedSessionDetails) {
        return new Response(
          JSON.stringify({
            success: true,
            response: {
              message: `Perfect! I'll register ${updatedContext.childName || 'your child'} for ${selectedSessionDetails.programName} on ${selectedSessionDetails.dayOfWeek}s at ${selectedSessionDetails.startTime}. This is a ${selectedSessionDetails.durationWeeks}-week program for $${(selectedSessionDetails.price / 100).toFixed(0)}.`,
              nextState: 'confirming_selection',
              extractedData: updatedContext,
              quickReplies: ['Confirm registration', 'Choose different session'],
              progress: calculateProgress(updatedContext),
              recommendations: [selectedSessionDetails],
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        console.error('Selected session not found:', context.selectedSessionId);
      }
    }

    // Check if we have enough info to fetch sessions
    let recommendations = null;
    let requestedSessionInfo = null;
    let sessionIssue = null;

    if (updatedContext.childAge && updatedContext.preferredDays && updatedContext.preferredDays.length > 0) {
      console.log('Have enough info to fetch sessions');

      // First, try to find the EXACT session requested (even if full or wrong age)
      const requestedCheck = await findRequestedSession(
        supabaseClient,
        context.organizationId,
        updatedContext.childAge,
        updatedContext.preferredDays,
        updatedContext.preferredTimeOfDay,
        updatedContext.preferredProgram
      );

      if (requestedCheck.found) {
        console.log('Found requested session:', requestedCheck.issue || 'available');
        requestedSessionInfo = requestedCheck.session;
        sessionIssue = requestedCheck.issue; // 'full', 'wrong_age', or null if available

        // If session has issues, fetch alternatives
        if (sessionIssue) {
          const alternatives = await fetchAlternativeSessions(
            supabaseClient,
            context.organizationId,
            updatedContext.childAge,
            updatedContext.preferredProgram,
            updatedContext.preferredDays
          );

          const issuePrompt = buildUnavailableSessionPrompt(updatedContext, requestedSessionInfo, sessionIssue, alternatives);
          const issueResponse = await callGeminiWithPrompt(issuePrompt, message);

          return new Response(
            JSON.stringify({
              success: true,
              response: {
                message: issueResponse.message,
                nextState: 'showing_unavailable_session',
                extractedData: updatedContext,
                quickReplies: issueResponse.quickReplies || [],
                progress: calculateProgress(updatedContext),
                requestedSession: requestedSessionInfo,
                sessionIssue: sessionIssue,
                alternatives: alternatives,
              },
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Fetch available sessions (including requested if available, or closest matches)
      recommendations = await fetchMatchingSessions(
        supabaseClient,
        context.organizationId,
        updatedContext.childAge,
        updatedContext.preferredDays,
        updatedContext.preferredTimeOfDay,
        updatedContext.preferredProgram
      );

      console.log(`Found ${recommendations.length} recommendations`);

      // If no exact matches, fetch broader matches
      if (recommendations.length === 0) {
        console.log('No exact matches, fetching broader results');
        recommendations = await fetchBroaderMatches(
          supabaseClient,
          context.organizationId,
          updatedContext.childAge,
          updatedContext.preferredDays,
          updatedContext.preferredProgram
        );
        console.log(`Found ${recommendations.length} broader matches`);
      }
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
    systemPrompt += `\n-  Have: Child's name (${context.childName})`;
  }

  if (!hasChildAge) {
    systemPrompt += `\n- Need: Child's age (ask after name)`;
  } else {
    systemPrompt += `\n-  Have: Child's age (${context.childAge})`;
  }

  if (!hasPreferences) {
    systemPrompt += `\n- Need: Schedule preferences (days and times)`;
  } else {
    const days = (context.preferredDays || []).map((d: number) =>
      ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d]
    ).join(', ');
    systemPrompt += `\n-  Have: Preferences (${days}${context.preferredTimeOfDay ? ', ' + context.preferredTimeOfDay : ''})`;
  }

  systemPrompt += `

## Data Extraction Rules
ALWAYS extract structured data from the parent's message in your response JSON.

CRITICAL: Only include fields that are NEW or CHANGED. Do NOT include fields you already have.

{
  "message": "Your conversational response here",
  "extractedData": {
    "childName": "extracted name or OMIT if you already have it",
    "childAge": extracted_number or OMIT if you already have it,
    "preferredDays": [array of day numbers 0-6] or OMIT if you already have it,
    "preferredTimeOfDay": "morning|afternoon|evening|any" or OMIT if you already have it,
    "preferredProgram": "sport name" or OMIT if you already have it
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
6. NEVER ask "Can you confirm that's correct?" when parent explicitly states their preference - just acknowledge and proceed
7. When parent gives you complete info (like "I want X on Y at Z time"), acknowledge it and move to search, don't ask for confirmation

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
}

Parent: "I want mini soccer on Wednesdays at 10am"
You: {
  "message": "Perfect! Let me check Wednesday morning mini soccer options for [child name].",
  "extractedData": { "preferredProgram": "soccer", "preferredDays": [3], "preferredTimeOfDay": "morning" },
  "nextState": "showing_recommendations",
  "quickReplies": []
}
(Note: DO NOT ask "Can you confirm?" - the parent already confirmed by stating their preference!)`;

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

    console.log(` Session ${session.id} (${program.name}) PASSED all filters`);
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

  // Supabase returns NUMERIC fields as strings, must parse to float
  const sessionRating = reviews.reduce((sum: number, r: any) => sum + parseFloat(r.overall_rating || '0'), 0) / reviews.length;
  const locationRating = reviews.reduce((sum: number, r: any) => sum + parseFloat(r.location_rating || '0'), 0) / reviews.length;

  return {
    sessionRating: Math.round(sessionRating * 10) / 10,
    locationRating: Math.round(locationRating * 10) / 10
  };
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

async function findRequestedSession(
  supabase: any,
  organizationId: string,
  childAge: number,
  preferredDays?: number[],
  preferredTimeOfDay?: string,
  preferredProgram?: string
): Promise<{ found: boolean; session: any | null; issue: string | null }> {

  if (!preferredProgram || !preferredDays || preferredDays.length === 0) {
    return { found: false, session: null, issue: null };
  }

  console.log('Looking for requested session:', { preferredProgram, preferredDays, preferredTimeOfDay, childAge });

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
    .gte('start_date', new Date().toISOString().split('T')[0]);

  if (error || !sessions) {
    console.log('Error fetching sessions:', error);
    return { found: false, session: null, issue: null };
  }

  // Find exact match for program, day, and time
  for (const session of sessions) {
    const program = session.program;
    if (!program) continue;

    if (program.organization_id !== organizationId) continue;

    // Check program name match
    const programNameMatch = program.name.toLowerCase().includes(preferredProgram.toLowerCase());
    if (!programNameMatch) continue;

    // Check day match
    if (!preferredDays.includes(session.day_of_week)) continue;

    // Check time match if specified
    if (preferredTimeOfDay && preferredTimeOfDay !== 'any') {
      const startTime = session.start_time;
      const hour = parseInt(startTime.split(':')[0]);

      if (preferredTimeOfDay === 'morning' && hour >= 12) continue;
      if (preferredTimeOfDay === 'afternoon' && (hour < 12 || hour >= 17)) continue;
      if (preferredTimeOfDay === 'evening' && hour < 17) continue;
    }

    // Found matching session! Now check if it's available
    console.log('Found exact match:', session.id, program.name);

    const ratings = await fetchSessionRatings(supabase, session.id);

    const sessionData = {
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

    // Check if full
    if (session.status === 'full' || session.enrolled_count >= session.capacity) {
      return { found: true, session: sessionData, issue: 'full' };
    }

    // Check age range
    const ageRangeMatch = program.age_range?.match(/\[(\d+),(\d+)\)/);
    if (ageRangeMatch) {
      const minAge = parseInt(ageRangeMatch[1]);
      const maxAge = parseInt(ageRangeMatch[2]);

      if (childAge < minAge || childAge >= maxAge) {
        return { found: true, session: sessionData, issue: 'wrong_age' };
      }
    }

    // Session is available!
    return { found: true, session: sessionData, issue: null };
  }

  return { found: false, session: null, issue: null };
}

function buildUnavailableSessionPrompt(context: any, requestedSession: any, issue: string, alternatives: any[]): string {
  const hasAlternatives = alternatives.length > 0;
  const childName = context.childName || 'your child';
  const childAge = context.childAge;

  let issueDescription = '';
  if (issue === 'full') {
    issueDescription = `THIS SPECIFIC CLASS IS FULL (${requestedSession.enrolledCount}/${requestedSession.capacity} enrolled).`;
  } else if (issue === 'wrong_age') {
    const ageRange = requestedSession.ageRange || '';
    const match = ageRange.match(/\[(\d+),(\d+)\)/);
    const ageText = match ? `ages ${match[1]}-${parseInt(match[2])-1}` : 'a different age group';
    issueDescription = `This ${requestedSession.programName} class is for ${ageText}, but ${childName} is ${childAge} years old.`;
  }

  const alternativesText = hasAlternatives
    ? alternatives.map((alt: any) => `${alt.programName} on ${alt.dayOfWeek}s at ${alt.startTime} (${alt.spotsRemaining} spots left)`).join(', ')
    : 'none available right now';

  return `You are Kai, a friendly AI helping parents register their children for youth sports programs.

## SITUATION:
Parent requested: ${requestedSession.programName} on ${requestedSession.dayOfWeek}s at ${requestedSession.startTime}
For ${childName} (age ${childAge})

The session exists, BUT: ${issueDescription}

${hasAlternatives ? `## AVAILABLE ALTERNATIVES (same or similar program, suitable age):
${alternativesText}

Your job: Acknowledge the issue clearly and briefly, then present the alternatives as great options.` : `## NO SUITABLE ALTERNATIVES FOUND
Your job: Acknowledge the issue and offer to show other programs or add to waitlist.`}

## YOUR RESPONSE (JSON format):
{
  "message": "1-2 sentences acknowledging the issue and ${hasAlternatives ? 'presenting alternatives' : 'offering next steps'}",
  "quickReplies": ${hasAlternatives ? '["View alternatives", "Join waitlist", "Show other programs"]' : '["Join waitlist", "Show all programs"]'}
}

Be direct and helpful. Don't over-apologize.`;
}

async function fetchBroaderMatches(
  supabase: any,
  organizationId: string,
  childAge: number,
  preferredDays?: number[],
  preferredProgram?: string
): Promise<any[]> {

  console.log('Fetching broader matches for:', { organizationId, childAge, preferredDays, preferredProgram });

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

  if (error || !sessions) {
    console.log('Error fetching broader sessions:', error);
    return [];
  }

  const filtered = sessions.filter((session: any) => {
    const program = session.program;
    if (!program || !program.age_range) return false;
    if (program.organization_id !== organizationId) return false;
    if (session.enrolled_count >= session.capacity) return false;

    // Check age range
    const ageRangeMatch = program.age_range.match(/\[(\d+),(\d+)\)/);
    if (!ageRangeMatch) return false;

    const minAge = parseInt(ageRangeMatch[1]);
    const maxAge = parseInt(ageRangeMatch[2]);

    if (childAge < minAge || childAge >= maxAge) return false;

    // If preferred days specified, try to match at least one
    if (preferredDays && preferredDays.length > 0 && preferredDays.length < 7) {
      if (!preferredDays.includes(session.day_of_week)) return false;
    }

    return true;
  });

  console.log(`Found ${filtered.length} broader matches`);

  const topSessions = filtered.slice(0, 5);
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

  return mapped;
}

async function fetchSessionById(supabase: any, sessionId: string): Promise<any | null> {
  console.log('Fetching session by ID:', sessionId);

  const { data: session, error } = await supabase
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
    .eq('id', sessionId)
    .maybeSingle();

  if (error || !session) {
    console.error('Error fetching session by ID:', error);
    return null;
  }

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
}
