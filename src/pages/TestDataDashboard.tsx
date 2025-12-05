import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface SessionData {
  id: string;
  program_name: string;
  day_of_week: number;
  start_time: string;
  capacity: number;
  enrolled_count: number;
  spots_remaining: number;
  status: string;
  location_name: string;
  coach_name: string;
  coach_rating: number;
  review_count: number;
  avg_quality_score: number;
  avg_coach_score: number;
  avg_location_score: number;
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function TestDataDashboard() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTestData();
  }, []);

  const loadTestData = async () => {
    try {
      const { data, error } = await supabase.rpc('get_session_test_data');

      if (error) {
        console.error('RPC error:', error);
        // Fallback to manual query if RPC doesn't exist
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('sessions')
          .select(`
            id,
            day_of_week,
            start_time,
            capacity,
            enrolled_count,
            status,
            programs:program_id (name),
            locations:location_id (name),
            staff:coach_id (name, rating)
          `)
          .order('day_of_week')
          .order('start_time');

        if (sessionsError) throw sessionsError;

        // Get reviews for each session
        const sessionsWithReviews = await Promise.all(
          (sessionsData || []).map(async (session: any) => {
            const { data: reviews } = await supabase
              .from('session_reviews')
              .select('overall_rating, coach_rating, location_rating')
              .eq('session_id', session.id);

            const reviewCount = reviews?.length || 0;
            // Supabase returns NUMERIC fields as strings, must parse to float
            const avgQuality = reviewCount > 0
              ? reviews!.reduce((sum, r) => sum + parseFloat(r.overall_rating || '0'), 0) / reviewCount
              : 0;
            const avgCoach = reviewCount > 0
              ? reviews!.reduce((sum, r) => sum + parseFloat(r.coach_rating || '0'), 0) / reviewCount
              : 0;
            const avgLocation = reviewCount > 0
              ? reviews!.reduce((sum, r) => sum + parseFloat(r.location_rating || '0'), 0) / reviewCount
              : 0;

            return {
              id: session.id,
              program_name: session.programs?.name || 'Unknown',
              day_of_week: session.day_of_week,
              start_time: session.start_time,
              capacity: session.capacity,
              enrolled_count: session.enrolled_count,
              spots_remaining: session.capacity - session.enrolled_count,
              status: session.status,
              location_name: session.locations?.name || 'Unknown',
              coach_name: session.staff?.name || 'Unassigned',
              coach_rating: session.staff?.rating || 0,
              review_count: reviewCount,
              avg_quality_score: avgQuality,
              avg_coach_score: avgCoach,
              avg_location_score: avgLocation,
            };
          })
        );

        setSessions(sessionsWithReviews);
      } else {
        // RPC data already matches interface, just ensure numeric values are parsed
        const transformedData = (data || []).map((session: any) => ({
          ...session,
          coach_rating: parseFloat(session.coach_rating || '0'),
          review_count: parseInt(session.review_count || '0'),
          avg_quality_score: parseFloat(session.avg_quality_score || '0'),
          avg_coach_score: parseFloat(session.avg_coach_score || '0'),
          avg_location_score: parseFloat(session.avg_location_score || '0'),
        }));
        setSessions(transformedData);
      }
    } catch (err) {
      console.error('Error loading test data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'full':
        return 'bg-red-100 text-red-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getAvailabilityColor = (spotsRemaining: number, capacity: number) => {
    const percent = (spotsRemaining / capacity) * 100;
    if (percent === 0) return 'bg-red-500';
    if (percent < 20) return 'bg-orange-500';
    if (percent < 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a2332] to-[#0f1419] flex items-center justify-center">
        <div className="text-white text-xl">Loading test data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a2332] to-[#0f1419]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-[#0f1419] via-[#1a2332] to-[#0f1419] border-b border-gray-800 backdrop-blur-sm bg-opacity-95">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">
              <span className="bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#06b6d4] bg-clip-text text-transparent">
                Test Data Dashboard
              </span>
            </h1>
            <div className="text-right">
              <p className="text-sm text-white">Session Availability & Quality</p>
              <p className="text-xs text-gray-400">Real-Time Testing View</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-2">Total Sessions</div>
            <div className="text-3xl font-bold text-white">{sessions.length}</div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-2">Full Sessions</div>
            <div className="text-3xl font-bold text-red-400">
              {sessions.filter(s => s.status === 'full').length}
            </div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-2">Almost Full</div>
            <div className="text-3xl font-bold text-orange-400">
              {sessions.filter(s => s.spots_remaining <= 2 && s.spots_remaining > 0).length}
            </div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-2">Reviewed Sessions</div>
            <div className="text-3xl font-bold text-green-400">
              {sessions.filter(s => s.review_count > 0).length}
            </div>
          </div>
        </div>

        {/* Sessions Table */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Program</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Day</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Coach</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Enrollment</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Coach Rating</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Session Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-4 text-sm text-white font-medium">
                      {session.program_name}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-300">
                      {dayNames[session.day_of_week]}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-300">
                      {session.start_time}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-300">
                      {session.location_name}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-300">
                      {session.coach_name}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className="text-sm text-white font-medium">
                          {session.enrolled_count}/{session.capacity}
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getAvailabilityColor(
                              session.spots_remaining,
                              session.capacity
                            )}`}
                            style={{
                              width: `${(session.enrolled_count / session.capacity) * 100}%`,
                            }}
                          />
                        </div>
                        <div className="text-xs text-gray-400">
                          {session.spots_remaining} spots left
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          session.status
                        )}`}
                      >
                        {session.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <div className="text-sm text-white font-medium">
                          {session.coach_rating > 0 ? session.coach_rating.toFixed(1) : 'N/A'}
                        </div>
                        {session.coach_rating > 0 && (
                          <div className="text-xs text-yellow-400">★★★★★</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {session.review_count > 0 ? (
                        <div className="flex flex-col items-center">
                          <div className="text-sm text-white font-medium">
                            {session.avg_quality_score.toFixed(1)}
                          </div>
                          <div className="text-xs text-yellow-400">★★★★★</div>
                          <div className="text-xs text-gray-400 mt-1">
                            {session.review_count} review{session.review_count !== 1 ? 's' : ''}
                          </div>
                          <div className="flex gap-1 mt-2 text-xs">
                            <div className="text-gray-400">
                              Coach: {session.avg_coach_score.toFixed(1)}
                            </div>
                            <div className="text-gray-400">•</div>
                            <div className="text-gray-400">
                              Loc: {session.avg_location_score.toFixed(1)}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">No reviews</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-8 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Testing Guide Quick Reference</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">Availability Indicators</h4>
              <ul className="space-y-1 text-sm text-gray-400">
                <li><span className="inline-block w-3 h-3 bg-green-500 rounded mr-2"></span>50%+ spots available</li>
                <li><span className="inline-block w-3 h-3 bg-yellow-500 rounded mr-2"></span>20-49% spots available</li>
                <li><span className="inline-block w-3 h-3 bg-orange-500 rounded mr-2"></span>1-19% spots available</li>
                <li><span className="inline-block w-3 h-3 bg-red-500 rounded mr-2"></span>Full (0 spots)</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">Key Differences</h4>
              <ul className="space-y-1 text-sm text-gray-400">
                <li><strong>Coach Rating:</strong> Individual coach performance (staff table)</li>
                <li><strong>Session Rating:</strong> Overall experience from reviews (reviews table)</li>
                <li><strong>Session rating</strong> = Average of overall_rating from all reviews</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Test Scenarios */}
        <div className="mt-8 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Test Scenarios</h3>
          <div className="space-y-3 text-sm text-gray-300">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <div>
                <strong className="text-white">Real-Time Availability:</strong> Open two tabs, fill a session in one, watch it update in the other
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <div>
                <strong className="text-white">Adjacent Day Suggestions:</strong> Ask for "Wednesday 10 AM Mini Soccer" (it's full) and see alternatives
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <div>
                <strong className="text-white">Location Sorting:</strong> Use Johnson family (near Main Complex) vs Williams family (near Westside)
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
              <div>
                <strong className="text-white">Find Alternatives:</strong> Request a full session and verify smart alternative suggestions
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
