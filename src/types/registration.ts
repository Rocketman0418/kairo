export type RegistrationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type RegistrationChannel = 'voice' | 'text' | 'web' | 'sms' | 'phone' | 'admin';

export interface SessionAvailability {
  sessionId: string;
  capacity: number;
  enrolledCount: number;
  spotsRemaining: number;
  waitlistCount: number;
  isAvailable: boolean;
  nextAvailableAlternative?: string;
}

export interface SessionWithDetails {
  id: string;
  programId: string;
  programName: string;
  programDescription?: string;
  locationId: string;
  locationName: string;
  locationAddress?: string;
  coachId?: string;
  coachName?: string;
  coachRating?: number;
  startDate: string;
  endDate?: string;
  dayOfWeek: number;
  startTime: string;
  capacity: number;
  enrolledCount: number;
  waitlistCount: number;
  status: string;
  priceInCents: number;
  durationWeeks?: number;
  ageRange?: string;
}

export interface Child {
  id?: string;
  familyId: string;
  firstName: string;
  lastName?: string;
  dateOfBirth: string;
  medicalInfo?: Record<string, unknown>;
  skillLevel?: string;
}

export interface Family {
  id?: string;
  userId?: string;
  primaryContactName: string;
  email: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  preferences?: {
    communicationPreference?: 'email' | 'sms' | 'both';
    marketingOptIn?: boolean;
  };
  engagementScore?: number;
}

export interface Registration {
  id?: string;
  sessionId: string;
  childId: string;
  familyId: string;
  status: RegistrationStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  amountCents?: number;
  enrolledAt?: string;
  registrationChannel?: RegistrationChannel;
}
