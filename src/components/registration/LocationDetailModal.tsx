import { useEffect, useState } from 'react';
import { MapPin, ExternalLink, Calendar, Clock } from 'lucide-react';
import { Modal } from '../common/Modal';
import { supabase } from '../../lib/supabase';

interface LocationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationId: string;
  locationName: string;
  locationAddress: string;
  organizationId: string;
}

interface SessionAtLocation {
  id: string;
  programName: string;
  dayOfWeek: string;
  startTime: string;
  startDate: string;
  spotsRemaining: number;
  coachName: string;
}

export function LocationDetailModal({
  isOpen,
  onClose,
  locationId,
  locationName,
  locationAddress,
  organizationId,
}: LocationDetailModalProps) {
  const [sessions, setSessions] = useState<SessionAtLocation[]>([]);
  const [loading, setLoading] = useState(false);

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
          capacity,
          enrolled_count,
          program:programs (
            name,
            organization_id
          ),
          coach:staff (
            name
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
          dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][s.day_of_week],
          startTime: formatTime(s.start_time),
          startDate: new Date(s.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          spotsRemaining: s.capacity - s.enrolled_count,
          coachName: s.coach?.name || 'TBD',
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
                <div
                  key={session.id}
                  className="bg-[#0f1419] border border-gray-800 rounded-lg p-4 hover:border-[#6366f1]/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-semibold text-white">{session.programName}</h5>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center text-sm text-gray-400">
                          <Calendar className="w-4 h-4 mr-2 text-[#6366f1]" />
                          <span>{session.dayOfWeek}s at {session.startTime}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-400">
                          <Clock className="w-4 h-4 mr-2 text-[#8b5cf6]" />
                          <span>Starts {session.startDate}</span>
                        </div>
                        {session.coachName && (
                          <div className="text-sm text-gray-400">
                            Coach: {session.coachName}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-sm font-medium text-green-400">
                        {session.spotsRemaining} spots left
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
