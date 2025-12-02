export type ConversationState =
  | 'idle'
  | 'greeting'
  | 'collecting_child_info'
  | 'collecting_preferences'
  | 'showing_recommendations'
  | 'confirming_selection'
  | 'collecting_payment'
  | 'processing_payment'
  | 'confirmed'
  | 'error';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: string;
    extractedData?: Record<string, unknown>;
    quickReplies?: string[];
    showFormFallback?: boolean;
  };
}

export interface ConversationContext {
  conversationId: string;
  familyId?: string;
  organizationId: string;
  currentState: ConversationState;
  children?: Array<{
    firstName: string;
    age?: number;
    dateOfBirth?: string;
  }>;
  preferences?: {
    location?: string;
    dayOfWeek?: number[];
    timeOfDay?: string;
    radius?: number;
  };
  selectedSession?: {
    sessionId: string;
    programName: string;
    locationName: string;
    dayOfWeek: number;
    startTime: string;
    priceInCents: number;
  };
}
