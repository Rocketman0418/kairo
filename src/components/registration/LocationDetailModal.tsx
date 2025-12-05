import { useEffect, useState } from 'react';
import { MapPin, ExternalLink, Calendar, Clock, Users, Star, Info } from 'lucide-react';
import { Modal } from '../common/Modal';
import { supabase } from '../../lib/supabase';
import { SessionDetailModal } from './SessionDetailModal';
import { CoachDetailModal } from './CoachDetailModal';

interface LocationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationId: string;
  locationName: string;
  locationAddress: string;
  organizationId: string;
  onSignUp?: (sessionId: string, programName: string) => void;
}

interface SessionAtLocation {
  id: string;
  programName: string;
  programDescription: string;
  ageRange: string;
  dayOfWeek: string;
  startTime: string;
  startDate: string;
  endDate?: string;
  spotsRemaining: number;
  capacity: number;
  enrolledCount: number;
  coachId?: string;
  coachName: string;
  coachRating: number | null;
  price: number;
  durationWeeks: number;
}

export function LocationDetailModal({
  isOpen,
  onClose,
  locationId,
  locationName,
  locationAddress,
  organizationId,
  onSignUp,
}: LocationDetailModalProps) {
  const [sessions, setSessions] = useState<SessionAtLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionAtLocation | null>(null);
  const [selectedCoach, setSelectedCoach] = useState<{ id: string; name: string; rating: number | null } | null>(null);

  useEffect(() => {
    if (isOpen && locationId) {
      fetchLocationSessions();
    }
  }, [isOpen, locationId]);

  const fetchLocationSessions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id,
          day_of_week,
          start_time,
          start_date,
          end_date,
          capacity,
          enrolled_count,
          coach_id,
          program:programs (
            name,
            description,
            age_range,
            price_cents,
            duration_weeks,
            organization_id
          ),
          coach:staff (
            id,
            name,
            rating
          )
        `)
        .eq('location_id', locationId)
        .eq('status', 'active')
        .gte('start_date', new Date().toISOString().split('T')[0])
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      const filtered = (data || [])
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
          spotsRemaining: s.capacity - s.enrolled_count,
          capacity: s.capacity,
          enrolledCount: s.enrolled_count,
          coachId: s.coach?.id || null,
          coachName: s.coach?.name || 'TBD',
          coachRating: s.coach?.rating || null,
          price: s.program?.price_cents || 0,
          durationWeeks: s.program?.duration_weeks || 0,
        }));

      setSessions(filtered);
    } catch (error) {
      console.error('Error fetching location sessions:', error);
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

  const getGoogleMapsUrl = () => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationAddress)}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Location Details" size="lg">
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-[#06b6d4] mt-1 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-white">{locationName}</h3>
              <p className="text-gray-400 mt-1">{locationAddress}</p>
            </div>
          </div>

          <a
            href={getGoogleMapsUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0f1419] hover:bg-[#1a2332] text-[#06b6d4] rounded-lg transition-colors border border-[#06b6d4]/30"
          >
            <ExternalLink className="w-4 h-4" />
            Open in Maps
          </a>
        </div>

        <div className="border-t border-gray-800 pt-6">
          <h4 className="text-lg font-semibold text-white mb-4">Sessions at this Location</h4>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No available sessions at this location</div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
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
                        {session.coachName && (
                          <div className="flex items-center text-sm text-gray-400">
                            <Star className="w-4 h-4 mr-2 text-yellow-500" />
                            {session.coachId ? (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCoach({
                                      id: session.coachId!,
                                      name: session.coachName,
                                      rating: session.coachRating,
                                    });
                                  }}
                                  className="hover:text-yellow-500 hover:underline transition-colors"
                                >
                                  Coach {session.coachName}
                                  {session.coachRating && (
                                    <span className="ml-1">({session.coachRating.toFixed(1)}★)</span>
                                  )}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCoach({
                                      id: session.coachId!,
                                      name: session.coachName,
                                      rating: session.coachRating,
                                    });
                                  }}
                                  className="ml-1.5 hover:text-yellow-500 transition-colors"
                                >
                                  <Info className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <span>
                                Coach {session.coachName}
                                {session.coachRating && (
                                  <span className="ml-1">({session.coachRating.toFixed(1)}★)</span>
                                )}
                              </span>
                            )}
                          </div>
                        )}
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
            locationId: locationId,
            locationName: locationName,
            locationAddress: locationAddress,
            coachId: selectedSession.coachId,
            coachName: selectedSession.coachName,
            coachRating: selectedSession.coachRating,
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

      {selectedCoach && (
        <CoachDetailModal
          isOpen={!!selectedCoach}
          onClose={() => setSelectedCoach(null)}
          coachId={selectedCoach.id}
          coachName={selectedCoach.name}
          coachRating={selectedCoach.rating}
          organizationId={organizationId}
          onSignUp={onSignUp}
        />
      )}
    </Modal>
  );
}
