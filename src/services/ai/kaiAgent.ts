import type { ConversationContext, ConversationState } from '../../types/conversation';

export interface KaiMessageRequest {
  message: string;
  conversationId: string;
  context: ConversationContext;
}

export interface KaiMessageResponse {
  success: boolean;
  response?: {
    message: string;
    nextState: ConversationState;
    extractedData: Record<string, unknown>;
    quickReplies?: string[];
    progress?: number;
    sessions?: SessionRecommendation[];
  };
  error?: {
    code: string;
    message: string;
    fallbackToForm?: boolean;
  };
}

export interface SessionRecommendation {
  id: string;
  programName: string;
  programDescription?: string;
  locationName: string;
  locationAddress?: string;
  dayOfWeek: number;
  dayName: string;
  startTime: string;
  displayTime: string;
  spotsRemaining: number;
  priceInCents: number;
  displayPrice: string;
  monthlyPrice?: string;
  durationWeeks?: number;
  coachName?: string;
  coachRating?: number;
  urgency?: 'high' | 'medium' | 'low';
}

export interface SessionPreferences {
  location?: string;
  dayOfWeek?: number[];
  timeOfDay?: 'morning' | 'afternoon' | 'evening';
  radius?: number;
}

export interface AlternativesRequest {
  sessionId: string;
  preferences?: {
    flexibleDays?: boolean;
    maxRadius?: number;
    flexibleTime?: boolean;
  };
}

export interface AlternativesResponse {
  success: boolean;
  originalSession?: SessionRecommendation;
  alternatives?: {
    adjacentDays: SessionRecommendation[];
    expandedRadius: SessionRecommendation[];
    alternativeTimes: SessionRecommendation[];
    alternativeLocations: SessionRecommendation[];
  };
  recommendWaitlist: boolean;
  aiMessage?: string;
  error?: {
    code: string;
    message: string;
  };
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function sendMessageToKai(
  request: KaiMessageRequest
): Promise<KaiMessageResponse> {
  const url = `${SUPABASE_URL}/functions/v1/kai-conversation`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Edge Function error:', errorText);
      throw new Error(`Edge Function failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('Kai response data:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Kai service error:', error);

    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: {
          code: 'TIMEOUT',
          message: "I'm taking a bit longer than usual. Let me show you a form to continue.",
          fallbackToForm: true,
        },
      };
    }

    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: "I'm having trouble connecting right now. Let me show you the options directly.",
        fallbackToForm: true,
      },
    };
  }
}

export async function getSessionRecommendations(
  organizationId: string,
  childAge: number,
  preferences: SessionPreferences
): Promise<SessionRecommendation[]> {
  const url = `${SUPABASE_URL}/functions/v1/session-recommendations`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        organizationId,
        childAge,
        preferences,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`Session recommendations failed: ${response.status}`);
    }

    const data = await response.json();
    return data.sessions || [];
  } catch (error) {
    console.error('Session recommendations error:', error);
    return [];
  }
}

export async function findWaitlistAlternatives(
  _request: AlternativesRequest
): Promise<AlternativesResponse> {
  console.warn('Waitlist alternatives feature not yet implemented. Coming in Stage 2.');

  return {
    success: false,
    recommendWaitlist: true,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Waitlist alternatives feature coming soon.',
    },
  };
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

export function formatMonthlyPrice(totalCents: number, installments: number = 2): string {
  const monthlyAmount = totalCents / installments;
  return `$${Math.ceil(monthlyAmount / 100)}`;
}

export function formatTime(time24: string): string {
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
}

export function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek] || 'Unknown';
}

export function calculateUrgency(spotsRemaining: number, capacity: number): 'high' | 'medium' | 'low' {
  const percentRemaining = (spotsRemaining / capacity) * 100;
  if (percentRemaining <= 20) return 'high';
  if (percentRemaining <= 50) return 'medium';
  return 'low';
}
