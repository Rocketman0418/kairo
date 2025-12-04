import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AlternativesRequest {
  organizationId: string;
  childAge: number;
  preferredSessionId?: string;
  preferences: {
    dayOfWeek: number;
    timeOfDay: string;
    locationId?: string;
  };
  flexibility: {
    adjacentDays: boolean;
    expandedRadius: boolean;
    alternativeTimes: boolean;
  };
}

interface SessionAlternative {
  sessionId: string;
  programName: string;
  programDescription: string;
  locationName: string;
  dayOfWeek: number;
  dayName: string;
  startTime: string;
  displayTime: string;
  spotsRemaining: number;
  priceInCents: number;
  displayPrice: string;
  coachName?: string;
  coachRating?: number;
  alternativeType: 'adjacent_day' | 'alternative_time' | 'alternative_location' | 'similar_program';
  matchScore: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const requestData: AlternativesRequest = await req.json();
    const { organizationId, childAge, preferences, flexibility } = requestData;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Finding alternatives for:', {
      organizationId,
      childAge,
      preferences,
      flexibility
    });

    const { data: sessions, error } = await supabase
      .from('sessions')
      .select(`
        id,
        day_of_week,
        start_time,
        capacity,
        enrolled_count,
        status,
        location_id,
        program:programs!inner(
          id,
          name,
          description,
          age_range,
          price_cents,
          organization_id
        ),
        location:locations(
          id,
          name,
          address
        ),
        coach:staff(
          id,
          name,
          rating
        )
      `)
      .eq('status', 'active')
      .eq('program.organization_id', organizationId);

    if (error) {
      console.error('Database error:', error);
      throw new Error('Failed to fetch sessions');
    }

    if (!sessions || sessions.length === 0) {
      console.log('No sessions found');
      return buildResponse([], false);
    }

    console.log(`Found ${sessions.length} total sessions`);

    const alternatives: SessionAlternative[] = [];

    for (const session of sessions) {
      const spotsRemaining = session.capacity - (session.enrolled_count || 0);
      if (spotsRemaining <= 0) continue;

      if (!isAgeMatch(session.program.age_range, childAge)) continue;

      const sessionHour = parseInt(session.start_time.split(':')[0]);
      const sessionTimeOfDay = getTimeOfDay(sessionHour);

      let alternativeType: SessionAlternative['alternativeType'] | null = null;
      let matchScore = 0;

      if (flexibility.adjacentDays) {
        if (isAdjacentDay(preferences.dayOfWeek, session.day_of_week)) {
          if (sessionTimeOfDay === preferences.timeOfDay) {
            alternativeType = 'adjacent_day';
            matchScore = 90;
          }
        }
      }

      if (!alternativeType && flexibility.alternativeTimes) {
        if (session.day_of_week === preferences.dayOfWeek) {
          if (sessionTimeOfDay !== preferences.timeOfDay) {
            alternativeType = 'alternative_time';
            matchScore = 85;
          }
        }
      }

      if (!alternativeType && flexibility.expandedRadius) {
        if (session.day_of_week === preferences.dayOfWeek) {
          if (sessionTimeOfDay === preferences.timeOfDay) {
            if (preferences.locationId && session.location_id !== preferences.locationId) {
              alternativeType = 'alternative_location';
              matchScore = 80;
            }
          }
        }
      }

      if (!alternativeType) {
        alternativeType = 'similar_program';
        matchScore = 50;
      }

      if (alternativeType) {
        if (session.coach?.rating) {
          matchScore += Math.min(session.coach.rating, 5);
        }

        const percentFull = ((session.enrolled_count || 0) / session.capacity) * 100;
        if (percentFull < 50) {
          matchScore += 5;
        }

        alternatives.push({
          sessionId: session.id,
          programName: session.program.name,
          programDescription: session.program.description,
          locationName: session.location?.name || 'Unknown',
          dayOfWeek: session.day_of_week,
          dayName: getDayName(session.day_of_week),
          startTime: session.start_time,
          displayTime: formatTime(session.start_time),
          spotsRemaining,
          priceInCents: session.program.price_cents,
          displayPrice: formatPrice(session.program.price_cents),
          coachName: session.coach?.name,
          coachRating: session.coach?.rating,
          alternativeType,
          matchScore,
        });
      }
    }

    alternatives.sort((a, b) => b.matchScore - a.matchScore);
    const topAlternatives = alternatives.slice(0, 5);

    console.log(`Found ${topAlternatives.length} alternatives`);

    const recommendWaitlist = topAlternatives.length < 2;

    return buildResponse(topAlternatives, recommendWaitlist);

  } catch (error) {
    console.error('Edge Function error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        alternatives: [],
        recommendWaitlist: true,
        error: {
          code: 'ALTERNATIVES_ERROR',
          message: error instanceof Error ? error.message : 'Failed to find alternatives',
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

function buildResponse(alternatives: SessionAlternative[], recommendWaitlist: boolean) {
  const grouped = {
    adjacentDays: alternatives.filter(a => a.alternativeType === 'adjacent_day'),
    alternativeTimes: alternatives.filter(a => a.alternativeType === 'alternative_time'),
    alternativeLocations: alternatives.filter(a => a.alternativeType === 'alternative_location'),
    similarPrograms: alternatives.filter(a => a.alternativeType === 'similar_program'),
  };

  return new Response(
    JSON.stringify({
      success: true,
      alternatives,
      grouped,
      count: alternatives.length,
      recommendWaitlist,
      message: buildAlternativesMessage(alternatives, recommendWaitlist),
    }),
    {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
}

function buildAlternativesMessage(alternatives: SessionAlternative[], recommendWaitlist: boolean): string {
  if (alternatives.length === 0) {
    return "That class is full, but I can add you to the waitlist. You'll be notified if a spot opens up.";
  }

  const topAlt = alternatives[0];
  let message = "That class is full, but I found some great alternatives! ";

  if (topAlt.alternativeType === 'adjacent_day') {
    message += `How about ${topAlt.programName} on ${topAlt.dayName}s at ${topAlt.displayTime}? It's the same time, just a different day.`;
  } else if (topAlt.alternativeType === 'alternative_time') {
    message += `${topAlt.programName} on ${topAlt.dayName}s at ${topAlt.displayTime} still has ${topAlt.spotsRemaining} spots!`;
  } else {
    message += `I found ${alternatives.length} other options that might work for you.`;
  }

  return message;
}

function isAgeMatch(ageRange: string, childAge: number): boolean {
  const match = ageRange.match(/\[(\d+),(\d+)\)/);
  if (!match) return false;

  const minAge = parseInt(match[1]);
  const maxAge = parseInt(match[2]);

  return childAge >= minAge && childAge < maxAge;
}

function isAdjacentDay(targetDay: number, sessionDay: number): boolean {
  const diff = Math.abs(targetDay - sessionDay);
  return diff === 1 || diff === 6;
}

function getTimeOfDay(hour: number): string {
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek] || 'Unknown';
}

function formatTime(time24: string): string {
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}