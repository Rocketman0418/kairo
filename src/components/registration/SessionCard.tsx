import { MapPin, Calendar, Clock, Users, Star } from 'lucide-react';
import { Button } from '../common/Button';

interface SessionRecommendation {
  sessionId: string;
  programName: string;
  programDescription: string;
  price: number;
  durationWeeks: number;
  locationName: string;
  locationAddress: string;
  coachName: string;
  coachRating: number | null;
  dayOfWeek: string;
  startTime: string;
  startDate: string;
  capacity: number;
  enrolledCount: number;
  spotsRemaining: number;
}

interface SessionCardProps {
  session: SessionRecommendation;
  onSelect: (sessionId: string) => void;
}

export function SessionCard({ session, onSelect }: SessionCardProps) {
  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(0)}`;
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getSpotsColor = () => {
    const percentFull = (session.enrolledCount / session.capacity) * 100;
    if (percentFull >= 90) return 'text-red-400 bg-red-950/30 border border-red-800/50';
    if (percentFull >= 70) return 'text-orange-400 bg-orange-950/30 border border-orange-800/50';
    return 'text-green-400 bg-green-950/30 border border-green-800/50';
  };

  return (
    <div className="bg-[#1a2332] border border-gray-800 rounded-lg p-4 hover:shadow-lg hover:shadow-blue-500/10 transition-all hover:border-[#6366f1]/50">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{session.programName}</h3>
          <p className="text-sm text-gray-400 mt-1">{session.programDescription}</p>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold bg-gradient-to-r from-[#6366f1] to-[#06b6d4] bg-clip-text text-transparent">{formatPrice(session.price)}</div>
          <div className="text-xs text-gray-500">{session.durationWeeks} weeks</div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-300">
          <Calendar className="w-4 h-4 mr-2 text-[#6366f1]" />
          <span>{session.dayOfWeek}s at {formatTime(session.startTime)}</span>
        </div>

        <div className="flex items-center text-sm text-gray-300">
          <MapPin className="w-4 h-4 mr-2 text-[#06b6d4]" />
          <span>{session.locationName}</span>
        </div>

        <div className="flex items-center text-sm text-gray-300">
          <Clock className="w-4 h-4 mr-2 text-[#8b5cf6]" />
          <span>Starts {new Date(session.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        </div>

        {session.coachName && (
          <div className="flex items-center text-sm text-gray-300">
            <Star className="w-4 h-4 mr-2 text-yellow-500" />
            <span>Coach {session.coachName}</span>
            {session.coachRating && (
              <span className="ml-1 text-yellow-400">({session.coachRating.toFixed(1)}★)</span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-800">
        <div className={`flex items-center text-sm font-medium px-3 py-1 rounded-full ${getSpotsColor()}`}>
          <Users className="w-4 h-4 mr-1" />
          <span>{session.spotsRemaining} spot{session.spotsRemaining !== 1 ? 's' : ''} left</span>
        </div>

        <Button
          onClick={() => onSelect(session.sessionId)}
          className="px-4 py-2"
        >
          Select
        </Button>
      </div>
    </div>
  );
}
