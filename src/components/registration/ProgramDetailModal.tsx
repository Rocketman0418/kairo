import { useEffect, useState } from 'react';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { Modal } from '../common/Modal';
import { supabase } from '../../lib/supabase';

interface ProgramDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  programName: string;
  programDescription: string;
  organizationId: string;
}

interface ProgramSession {
  id: string;
  dayOfWeek: string;
  startTime: string;
  startDate: string;
  locationName: string;
  coachName: string;
  spotsRemaining: number;
  price: number;
  durationWeeks: number;
}

export function ProgramDetailModal({
  isOpen,
  onClose,
  programName,
  programDescription,
  organizationId,
}: ProgramDetailModalProps) {
  const [sessions, setSessions] = useState<ProgramSession[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && programName) {
      fetchProgramSessions();
    }
  }, [isOpen, programName]);

  const fetchProgramSessions = async () => {
    setLoading(true);
    try {
      const { data: programsData, error: programsError } = await supabase
        .from('programs')
        .select('id')
        .eq('name', programName)
        .eq('organization_id', organizationId);

      if (programsError) throw programsError;

      if (!programsData || programsData.length === 0) {
        setSessions([]);
        setLoading(false);
        return;
      }

      const programIds = programsData.map(p => p.id);

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
            price_cents,
            duration_weeks
          ),
          location:locations (
            name
          ),
          coach:staff (
            name
          )
        `)
        .in('program_id', programIds)
        .eq('status', 'active')
        .gte('start_date', new Date().toISOString().split('T')[0])
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      const filtered = (data || [])
        .filter((s: any) => s.enrolled_count < s.capacity)
        .map((s: any) => ({
          id: s.id,
          dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][s.day_of_week],
          startTime: formatTime(s.start_time),
          startDate: new Date(s.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          locationName: s.location?.name || 'TBD',
          coachName: s.coach?.name || 'TBD',
          spotsRemaining: s.capacity - s.enrolled_count,
          price: s.program?.price_cents || 0,
          durationWeeks: s.program?.duration_weeks || 0,
        }));

      setSessions(filtered);
    } catch (error) {
      console.error('Error fetching program sessions:', error);
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

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(0)}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Program Details" size="lg">
      <div className="space-y-6">
        <div>
          <h3 className="text-2xl font-bold text-white mb-2">{programName}</h3>
          <p className="text-gray-300">{programDescription}</p>
          {sessions.length > 0 && (
            <div className="mt-4 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <span className="font-semibold text-[#06b6d4]">{formatPrice(sessions[0].price)}</span>
                <span>for {sessions[0].durationWeeks} weeks</span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-800 pt-6">
          <h4 className="text-lg font-semibold text-white mb-4">
            All Available Sessions ({sessions.length})
          </h4>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No available sessions for this program at the moment
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-[#0f1419] border border-gray-800 rounded-lg p-4 hover:border-[#6366f1]/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center text-sm text-gray-300">
                        <Calendar className="w-4 h-4 mr-2 text-[#6366f1]" />
                        <span className="font-medium">{session.dayOfWeek}s at {session.startTime}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-400">
                        <Clock className="w-4 h-4 mr-2 text-[#8b5cf6]" />
                        <span>Starts {session.startDate}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-400">
                        <MapPin className="w-4 h-4 mr-2 text-[#06b6d4]" />
                        <span>{session.locationName}</span>
                      </div>
                      {session.coachName && (
                        <div className="text-sm text-gray-400">
                          Coach: {session.coachName}
                        </div>
                      )}
                    </div>
                    <div className="text-right ml-4 flex flex-col items-end gap-2">
                      <div className="flex items-center text-sm font-medium text-green-400">
                        <Users className="w-4 h-4 mr-1" />
                        {session.spotsRemaining} left
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
