import { useEffect, useState } from 'react';
import { Star, Calendar, Clock, Award, MapPin, Users, Info } from 'lucide-react';
import { Modal } from '../common/Modal';
import { supabase } from '../../lib/supabase';
import { SessionDetailModal } from './SessionDetailModal';
import { LocationDetailModal } from './LocationDetailModal';

interface CoachDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  coachId: string;
  coachName: string;
  coachRating: number | null;
  organizationId: string;
  onSignUp?: (sessionId: string, programName: string) => void;
}

interface SessionForCoach {
  id: string;
  programName: string;
  programDescription: string;
  ageRange: string;
  dayOfWeek: string;
  startTime: string;
  startDate: string;
  endDate?: string;
  locationId?: string;
  locationName: string;
  locationAddress: string;
  spotsRemaining: number;
  capacity: number;
  enrolledCount: number;
  price: number;
  durationWeeks: number;
}

interface CoachReview {
  id: string;
  rating: number;
  comment: string;
  parentName: string;
  createdAt: string;
}

export function CoachDetailModal({
  isOpen,
  onClose,
  coachId,
  coachName,
  coachRating,
  organizationId,
  onSignUp,
}: CoachDetailModalProps) {
  const [sessions, setSessions] = useState<SessionForCoach[]>([]);
  const [reviews, setReviews] = useState<CoachReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionForCoach | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ id: string; name: string; address: string } | null>(null);

  useEffect(() => {
    if (isOpen && coachId) {
      fetchCoachData();
    }
  }, [isOpen, coachId]);

  const fetchCoachData = async () => {
    setLoading(true);
    try {
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select(`
          id,
          day_of_week,
          start_time,
          start_date,
          end_date,
          capacity,
          enrolled_count,
          location_id,
          program:programs (
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
          )
        `)
        .eq('coach_id', coachId)
        .eq('status', 'active')
        .gte('start_date', new Date().toISOString().split('T')[0])
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (sessionsError) throw sessionsError;

      const filtered = (sessionsData || [])
        .filter((s: any) => s.program?.organization_id === organizationId && s.enrolled_count < s.capacity)
        .map((s: any) => ({
          id: s.id,
          programName: s.program?.name || 'Unknown',
          programDescription: s.program?.description || '',
          ageRange: s.program?.age_range || '[0,18)',
          dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][s.day_of_week],
          startTime: s.start_time,
          startDate: s.start_date,
          endDate: s.end_date,
          locationId: s.location?.id || null,
          locationName: s.location?.name || 'TBD',
          locationAddress: s.location?.address || '',
          spotsRemaining: s.capacity - s.enrolled_count,
          capacity: s.capacity,
          enrolledCount: s.enrolled_count,
          price: s.program?.price_cents || 0,
          durationWeeks: s.program?.duration_weeks || 0,
        }));

      setSessions(filtered);

      setReviews([
        {
          id: '1',
          rating: 5,
          comment: 'Coach ' + coachName + ' is amazing with kids! My daughter has learned so much and really looks forward to each session.',
          parentName: 'Sarah M.',
          createdAt: '2 weeks ago',
        },
        {
          id: '2',
          rating: 5,
          comment: 'Very patient and encouraging. Great at explaining techniques in a way kids understand.',
          parentName: 'Michael T.',
          createdAt: '1 month ago',
        },
        {
          id: '3',
          rating: 4,
          comment: 'Solid coach with good energy. Kids are always engaged and having fun.',
          parentName: 'Jennifer L.',
          createdAt: '2 months ago',
        },
      ]);
    } catch (error) {
      console.error('Error fetching coach data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatAgeRange = (ageRange: string) => {
    const match = ageRange.match(/\[(\d+),(\d+)\)/);
    if (match) {
      return `Ages ${match[1]}-${parseInt(match[2]) - 1}`;
    }
    return '';
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Coach Details" size="lg">
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#6366f1] to-[#06b6d4] flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {coachName.charAt(0)}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-white">Coach {coachName}</h3>
            {coachRating && (
              <div className="flex items-center gap-2 mt-2">
                {renderStars(Math.round(coachRating))}
                <span className="text-yellow-400 font-semibold">{coachRating.toFixed(1)}</span>
                <span className="text-gray-400 text-sm">({reviews.length} reviews)</span>
              </div>
            )}
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
              <Award className="w-4 h-4 text-[#06b6d4]" />
              <span>Certified Youth Sports Instructor</span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6">
          <h4 className="text-lg font-semibold text-white mb-4">Reviews</h4>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading reviews...</div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No reviews yet</div>
          ) : (
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-[#0f1419] border border-gray-800 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        {renderStars(review.rating)}
                        <span className="text-sm text-gray-400">{review.createdAt}</span>
                      </div>
                      <p className="text-sm font-medium text-white mt-1">{review.parentName}</p>
                    </div>
                  </div>
                  <p className="text-gray-300 text-sm mt-2">{review.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-800 pt-6">
          <h4 className="text-lg font-semibold text-white mb-4">Sessions with Coach {coachName}</h4>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No available sessions with this coach</div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className="w-full bg-[#0f1419] border border-gray-800 rounded-lg p-4 hover:border-[#6366f1]/30 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-semibold text-white">{session.programName}</h5>
                        <span className="px-2 py-0.5 bg-[#0a0f14] text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/30">
                          {formatAgeRange(session.ageRange)}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center text-sm text-gray-400">
                          <Calendar className="w-4 h-4 mr-2 text-[#6366f1]" />
                          <span>{session.dayOfWeek}s at {formatTime(session.startTime)}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-400">
                          <Clock className="w-4 h-4 mr-2 text-[#8b5cf6]" />
                          <span>Starts {new Date(session.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-400">
                          <MapPin className="w-4 h-4 mr-2 text-[#06b6d4]" />
                          {session.locationId ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLocation({
                                    id: session.locationId!,
                                    name: session.locationName,
                                    address: session.locationAddress,
                                  });
                                }}
                                className="hover:text-[#06b6d4] hover:underline transition-colors"
                              >
                                {session.locationName}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLocation({
                                    id: session.locationId!,
                                    name: session.locationName,
                                    address: session.locationAddress,
                                  });
                                }}
                                className="ml-1.5 hover:text-[#06b6d4] transition-colors"
                              >
                                <Info className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <span>{session.locationName}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-4 flex flex-col items-end gap-2">
                      <div className="flex items-center text-sm font-medium text-green-400">
                        <Users className="w-4 h-4 mr-1" />
                        {session.spotsRemaining} left
                      </div>
                      <Info className="w-4 h-4 text-gray-500" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedSession && onSignUp && (
        <SessionDetailModal
          isOpen={!!selectedSession}
          onClose={() => setSelectedSession(null)}
          session={{
            sessionId: selectedSession.id,
            programName: selectedSession.programName,
            programDescription: selectedSession.programDescription,
            price: selectedSession.price,
            durationWeeks: selectedSession.durationWeeks,
            locationId: selectedSession.locationId,
            locationName: selectedSession.locationName,
            locationAddress: selectedSession.locationAddress,
            coachId: coachId,
            coachName: coachName,
            coachRating: coachRating,
            dayOfWeek: selectedSession.dayOfWeek,
            startTime: selectedSession.startTime,
            startDate: selectedSession.startDate,
            endDate: selectedSession.endDate,
            capacity: selectedSession.capacity,
            enrolledCount: selectedSession.enrolledCount,
            spotsRemaining: selectedSession.spotsRemaining,
          }}
          organizationId={organizationId}
          onSignUp={onSignUp}
        />
      )}

      {selectedLocation && (
        <LocationDetailModal
          isOpen={!!selectedLocation}
          onClose={() => setSelectedLocation(null)}
          locationId={selectedLocation.id}
          locationName={selectedLocation.name}
          locationAddress={selectedLocation.address}
          organizationId={organizationId}
          onSignUp={onSignUp}
        />
      )}
    </Modal>
  );
}
