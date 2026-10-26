import React, { useEffect, useState } from 'react';
import { 
  Star, 
  MessageSquare, 
  Clock, 
  Dumbbell, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles,
  Flame,
  Activity,
  Zap
} from 'lucide-react';
import { CompletedSession } from '../../types';
import { subscribeToAthleteCompletedSessions } from '../../services/firestoreService';
import { analyzeSessionBiofeedback } from '../../services/typesafeAiService';

interface AthleteSessionHistoryProps {
  clientId: string;
  clientName: string;
  onOpenChat?: () => void;
}

export const AthleteSessionHistory: React.FC<AthleteSessionHistoryProps> = ({ 
  clientId, 
  clientName,
  onOpenChat 
}) => {
  const [sessions, setSessions] = useState<CompletedSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!clientId) {
      setSessions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToAthleteCompletedSessions(
      clientId,
      (fetchedSessions) => {
        setSessions(fetchedSessions);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsubscribe();
  }, [clientId]);

  const renderStarRating = (rating?: number) => {
    const validRating = typeof rating === 'number' && rating >= 1 && rating <= 5 ? rating : 5;
    
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3.5 h-3.5 ${
              star <= validRating
                ? 'text-amber-500 fill-amber-500'
                : 'text-neutral-300'
            }`}
          />
        ))}
        <span className={`ml-1.5 text-xs font-bold font-mono ${
          validRating >= 4 ? 'text-emerald-700' : validRating === 3 ? 'text-amber-700' : 'text-red-600'
        }`}>
          {validRating}/5
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm animate-pulse">
        <div className="h-5 bg-neutral-200 rounded-md w-1/3" />
        <div className="h-20 bg-neutral-100 rounded-2xl w-full" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">
              Verified Athlete Log &bull; End-to-End TypeSafe
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-neutral-900 uppercase font-display tracking-tight">
            Training History & Biofeedback ({sessions.length})
          </h2>
          <p className="text-xs text-neutral-500">
            Real-time workout completion logs, subjective athlete ratings, and AI biofeedback analysis for {clientName}.
          </p>
        </div>

        {sessions.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-200">
            <Activity className="w-3.5 h-3.5 text-red-600" />
            <span className="text-xs font-bold text-neutral-700">
              Avg Rating:{' '}
              <strong className="text-red-600 font-mono">
                {(sessions.reduce((acc, s) => acc + (s.rating || 5), 0) / sessions.length).toFixed(1)}/5
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <div className="text-center py-10 bg-neutral-50 rounded-2xl border border-dashed border-neutral-300 space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
            <Dumbbell className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-neutral-800 uppercase font-display">No Completed Sessions Yet</h4>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            When {clientName} completes assigned workouts and submits their "Session Concluded" rating & feedback, they will instantly stream here in real time.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const rawFeedback = session.feedback || session.clientGeneralFeedback || '';
            const aiAnalysis = analyzeSessionBiofeedback(rawFeedback, session.rating || 5);
            const completedSetsCount = session.exercises?.reduce(
              (acc, ex) => acc + (ex.sets?.filter((s: any) => s.completed).length || 0), 
              0
            ) || 0;

            return (
              <div 
                key={session.id}
                className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200 hover:border-neutral-300 transition-all space-y-4 shadow-xs"
              >
                {/* Top Row: Session Title & Metrics */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-700 text-white flex items-center justify-center shadow-sm shrink-0">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-neutral-900">{session.title}</h3>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                          <span>Logged</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 flex flex-wrap items-center gap-2 mt-0.5">
                        <span>Completed: <strong className="text-neutral-700">{session.completedAt}</strong></span>
                        {session.assignedDate && (
                          <>
                            <span>&bull;</span>
                            <span>Date: <strong className="text-neutral-700">{session.assignedDate}</strong></span>
                          </>
                        )}
                        <span>&bull;</span>
                        <span className="flex items-center gap-1 font-mono font-bold text-neutral-700">
                          <Clock className="w-3 h-3 text-neutral-400" />
                          {session.durationMinutes} min
                        </span>
                        {completedSetsCount > 0 && (
                          <>
                            <span>&bull;</span>
                            <span className="text-neutral-600 font-mono">
                              {completedSetsCount} sets completed
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Rating Badge */}
                  <div className="flex items-center gap-2 self-start sm:self-auto bg-white px-3 py-1.5 rounded-xl border border-neutral-200 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Session Feel:</span>
                    {renderStarRating(session.rating)}
                  </div>
                </div>

                {/* Athlete Feedback Section */}
                <div className="bg-white rounded-xl p-4 border border-neutral-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                      <MessageSquare className="w-3.5 h-3.5 text-red-600" />
                      <span>General Session Feedback & Athlete Notes:</span>
                    </div>

                    {/* TypeSafe AI Biofeedback Badge */}
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 ${
                        aiAnalysis.painReported
                          ? 'bg-red-50 text-red-700 border-red-200 animate-pulse'
                          : aiAnalysis.needsCoachEscalation
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-neutral-100 text-neutral-700 border-neutral-200'
                      }`}>
                        <Sparkles className="w-3 h-3 text-red-600" />
                        <span>TypeSafe: {aiAnalysis.highlightTag}</span>
                      </span>
                    </div>
                  </div>

                  {rawFeedback.trim() ? (
                    <blockquote className="text-xs sm:text-sm text-neutral-800 italic leading-relaxed pl-4 border-l-2 border-red-500 bg-neutral-50/50 py-1.5 rounded-r-lg">
                      "{rawFeedback}"
                    </blockquote>
                  ) : (
                    <p className="text-xs text-neutral-400 italic pl-4 border-l-2 border-neutral-200 py-1">
                      No additional text feedback was left for this workout.
                    </p>
                  )}

                  {/* Action Link for Coach */}
                  {aiAnalysis.needsCoachEscalation && onOpenChat && (
                    <div className="pt-2 flex items-center justify-between text-xs bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                      <div className="flex items-center gap-2 text-amber-800 font-semibold">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Athlete reported difficulty or potential pain in this session. Proactive outreach recommended.</span>
                      </div>
                      <button
                        onClick={onOpenChat}
                        className="px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] uppercase tracking-wider cursor-pointer shrink-0 transition-colors"
                      >
                        Message Athlete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
