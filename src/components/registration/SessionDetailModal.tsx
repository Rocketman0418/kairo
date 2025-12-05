import { MapPin, Calendar, Clock, Users, Star, DollarSign, Info } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useState } from 'react';
import { LocationDetailModal } from './LocationDetailModal';
import { CoachDetailModal } from './CoachDetailModal';
import { ProgramDetailModal } from './ProgramDetailModal';

interface SessionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: {
    sessionId: string;
    programName: string;
    programDescription: string;
    price: number;
    durationWeeks: number;
    locationId?: string;
    locationName: string;
    locationAddress: string;
    locationRating?: number | null;
    coachId?: string;
    coachName: string;
    coachRating: number | null;
    sessionRating?: number | null;
    dayOfWeek: string;
    startTime: string;
    startDate: string;
    endDate?: string;
    capacity: number;
    enrolledCount: number;
    spotsRemaining: number;
  };
  organizationId: string;
  onSignUp: (sessionId: string, programName: string) => void;
}

export function SessionDetailModal({
  isOpen,
  onClose,
  session,
  organizationId,
  onSignUp,
}: SessionDetailModalProps) {
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showCoachModal, setShowCoachModal] = useState(false);
  const [showProgramModal, setShowProgramModal] = useState(false);

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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getSpotsColor = () => {
    const percentFull = (session.enrolledCount / session.capacity) * 100;
    if (percentFull >= 90) return 'text-red-400 bg-red-950/30 border border-red-800/50';
    if (percentFull >= 70) return 'text-orange-400 bg-orange-950/30 border border-orange-800/50';
    return 'text-green-400 bg-green-950/30 border border-green-800/50';
  };

  const handleSignUp = () => {
    onSignUp(session.sessionId, session.programName);
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Session Details" size="lg">
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold text-white">{session.programName}</h3>
                <button
                  onClick={() => setShowProgramModal(true)}
                  className="p-1 hover:bg-[#0f1419] rounded-full transition-colors group"
                  title="View all sessions for this program"
                >
                  <Info className="w-4 h-4 text-gray-500 group-hover:text-[#06b6d4]" />
                </button>
              </div>
              <p className="text-gray-300 mt-2">{session.programDescription}</p>
            </div>
          </div>

          <div className="flex items-center gap-6 py-4 border-y border-gray-800">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#06b6d4]" />
              <div>
                <div className="text-2xl font-bold text-white">{formatPrice(session.price)}</div>
                <div className="text-xs text-gray-500">{session.durationWeeks} weeks</div>
              </div>
            </div>

            <div className={`flex items-center text-sm font-medium px-4 py-2 rounded-full ${getSpotsColor()}`}>
              <Users className="w-4 h-4 mr-2" />
              <span>{session.spotsRemaining} spot{session.spotsRemaining !== 1 ? 's' : ''} remaining</span>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Schedule</h4>

            <div className="space-y-3">
              {session.sessionRating && (
                <div className="flex items-start gap-3">
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-yellow-400">{session.sessionRating.toFixed(1)} Session Rating</div>
                    <div className="text-sm text-gray-400">Based on past participant reviews</div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 text-gray-300">
                <Calendar className="w-5 h-5 text-[#6366f1] mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Every {session.dayOfWeek}</div>
                  <div className="text-sm text-gray-400">{formatTime(session.startTime)}</div>
                </div>
              </div>

              <div className="flex items-start gap-3 text-gray-300">
                <Clock className="w-5 h-5 text-[#8b5cf6] mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Session Dates</div>
                  <div className="text-sm text-gray-400">
                    Starts {formatDate(session.startDate)}
                    {session.endDate && ` • Ends ${formatDate(session.endDate)}`}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 text-gray-300">
                <MapPin className="w-5 h-5 text-[#06b6d4] mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <button
                    onClick={() => setShowLocationModal(true)}
                    className="font-medium hover:text-[#06b6d4] transition-colors underline decoration-dotted underline-offset-2 text-left flex items-center gap-1"
                  >
                    <span>{session.locationName}</span>
                    {session.locationRating && (
                      <span className="ml-1 text-yellow-400">({session.locationRating.toFixed(1)}★)</span>
                    )}
                    <Info className="w-3 h-3" />
                  </button>
                  <div className="text-sm text-gray-400">{session.locationAddress}</div>
                </div>
              </div>

              {session.coachName && (
                <div className="flex items-start gap-3 text-gray-300">
                  <Star className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <button
                      onClick={() => setShowCoachModal(true)}
                      className="font-medium hover:text-yellow-400 transition-colors underline decoration-dotted underline-offset-2 flex items-center gap-1"
                    >
                      <span>Coach {session.coachName}</span>
                      {session.coachRating && (
                        <span className="ml-1">({session.coachRating.toFixed(1)}★)</span>
                      )}
                      <Info className="w-3 h-3" />
                    </button>
                    <div className="text-sm text-gray-400">Instructor for this session</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-gray-800 flex gap-3">
            <Button
              onClick={onClose}
              className="flex-1 bg-[#0f1419] hover:bg-[#1a2332] text-gray-300"
            >
              Close
            </Button>
            <Button
              onClick={handleSignUp}
              className="flex-1 bg-gradient-to-r from-[#6366f1] to-[#06b6d4] hover:opacity-90"
            >
              Sign Up for This Session
            </Button>
          </div>
        </div>
      </Modal>

      {session.locationId && (
        <LocationDetailModal
          isOpen={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          locationId={session.locationId}
          locationName={session.locationName}
          locationAddress={session.locationAddress}
          organizationId={organizationId}
        />
      )}

      {session.coachId && (
        <CoachDetailModal
          isOpen={showCoachModal}
          onClose={() => setShowCoachModal(false)}
          coachId={session.coachId}
          coachName={session.coachName}
          coachRating={session.coachRating}
          organizationId={organizationId}
        />
      )}

      <ProgramDetailModal
        isOpen={showProgramModal}
        onClose={() => setShowProgramModal(false)}
        programName={session.programName}
        programDescription={session.programDescription}
        organizationId={organizationId}
      />
    </>
  );
}
