import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RecommendationRequest {
  organizationId: string;
  childAge: number;
  preferences?: {
    location?: string;
    dayOfWeek?: number[];
    timeOfDay?: 'morning' | 'afternoon' | 'evening';
    radius?: number;
  };
}

interface SessionRecommendation {
  id: string;
  programName: string;
  programDescription?: string;
  locationName: string;
  locationAddress?: string;
  locationRating?: number;
  dayOfWeek: number;
  dayName: string;
  startTime: string;
  startDate?: string;
  displayTime: string;
  spotsRemaining: number;
  priceInCents: number;
  displayPrice: string;
  monthlyPrice?: string;
  durationWeeks?: number;
  coachName?: string;
  coachRating?: number;
  sessionRating?: number;
  urgency?: 'high' | 'medium' | 'low';
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const requestData: RecommendationRequest = await req.json();
    const { organizationId, childAge, preferences } = requestData;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let query = supabase
      .from('sessions')
      .select(`
        id,
        day_of_week,
        start_time,
        start_date,
        capacity,
        enrolled_count,
        status,
        average_rating,
        program:programs(
          id,
          name,
          description,
          age_range,
          price_cents,
          duration_weeks
        ),
        location:locations(
          id,
          name,
          address,
          average_rating
        ),
        coach:staff(
          id,
          name,
          rating
        )
      `)
      .eq('status', 'active')
      .gt('capacity', 0);

    const { data: sessions, error } = await query;

    if (error) {
      console.error('Database query error:', error);
      throw new Error('Failed to fetch sessions');
    }

    const recommendations: SessionRecommendation[] = sessions
      .filter((session: any) => {
        if (!session.program || !session.location) return false;

        const ageRange = session.program.age_range;
        if (ageRange) {
          const [minAge, maxAge] = parseAgeRange(ageRange);
          if (childAge < minAge || childAge > maxAge) return false;
        }

        if (preferences?.dayOfWeek && preferences.dayOfWeek.length > 0) {
          if (!preferences.dayOfWeek.includes(session.day_of_week)) return false;
        }

        if (preferences?.timeOfDay) {
          const hour = parseInt(session.start_time.split(':')[0]);
          const timeSlot = getTimeSlot(hour);
          if (timeSlot !== preferences.timeOfDay) return false;
        }

        const spotsRemaining = session.capacity - (session.enrolled_count || 0);
        if (spotsRemaining <= 0) return false;

        return true;
      })
      .map((session: any) => {
        const spotsRemaining = session.capacity - (session.enrolled_count || 0);
        const urgency = calculateUrgency(spotsRemaining, session.capacity);

        return {
          id: session.id,
          programName: session.program.name,
          programDescription: session.program.description,
          locationName: session.location.name,
          locationAddress: session.location.address,
          locationRating: session.location.average_rating,
          dayOfWeek: session.day_of_week,
          dayName: getDayName(session.day_of_week),
          startTime: session.start_time,
          startDate: session.start_date,
          displayTime: formatTime(session.start_time),
          spotsRemaining,
          priceInCents: session.program.price_cents,
          displayPrice: formatPrice(session.program.price_cents),
          monthlyPrice: formatMonthlyPrice(session.program.price_cents, 2),
          durationWeeks: session.program.duration_weeks,
          coachName: session.coach?.name,
          coachRating: session.coach?.rating,
          sessionRating: session.average_rating,
          urgency,
        };
      })
      .sort((a, b) => {
        const urgencyWeight = { high: 3, medium: 2, low: 1 };
        const urgencyDiff = (urgencyWeight[b.urgency!] || 0) - (urgencyWeight[a.urgency!] || 0);
        if (urgencyDiff !== 0) return urgencyDiff;

        return b.spotsRemaining - a.spotsRemaining;
      })
      .slice(0, 5);

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    let aiMessage = '';

    if (GEMINI_API_KEY && recommendations.length > 0) {
      const prompt = `You are Kai, a friendly AI helping parents find the perfect class for their ${childAge}-year-old.

I found ${recommendations.length} great options:
${recommendations.map((r, i) => `${i + 1}. ${r.programName} - ${r.dayName}s at ${r.displayTime} (${r.spotsRemaining} spots left)`).join('\n')}

Write a brief (2 sentences max), enthusiastic message highlighting the best option. Be warm and encouraging.`;

      try {
        const geminiHeaders = new Headers();
        geminiHeaders.append('Content-Type', 'application/json');

        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(GEMINI_API_KEY.trim())}`,
          {
            method: 'POST',
            headers: geminiHeaders,
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.8, maxOutputTokens: 150 },
            }),
          }
        );

        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json();
          aiMessage = geminiData.candidates[0].content.parts[0].text;
        }
      } catch (error) {
        console.error('Gemini API error:', error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sessions: recommendations,
        count: recommendations.length,
        aiMessage: aiMessage || `I found ${recommendations.length} great options for your ${childAge}-year-old! Check them out below.`,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Edge Function error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        sessions: [],
        count: 0,
        error: {
          code: 'RECOMMENDATION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch recommendations',
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

function parseAgeRange(ageRange: string): [number, number] {
  const match = ageRange.match(/\[(\d+),(\d+)\)/);
  if (match) {
    return [parseInt(match[1]), parseInt(match[2])];
  }
  return [0, 18];
}

function getTimeSlot(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function calculateUrgency(spotsRemaining: number, capacity: number): 'high' | 'medium' | 'low' {
  const percentRemaining = (spotsRemaining / capacity) * 100;
  if (percentRemaining <= 20) return 'high';
  if (percentRemaining <= 50) return 'medium';
  return 'low';
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

function formatMonthlyPrice(totalCents: number, installments: number = 2): string {
  const monthlyAmount = totalCents / installments;
  return `$${Math.ceil(monthlyAmount / 100)}/month`;
}
