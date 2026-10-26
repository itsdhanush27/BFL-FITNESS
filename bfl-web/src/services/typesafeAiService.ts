/**
 * TypeSafe AI Service for BFL Fitness
 * Converts unstructured natural language feedback and session telemetry
 * into strongly typed judgments (fatigue, pain alerts, coach escalation).
 */

export interface SessionBiofeedbackAnalysis {
  fatigueScore: number; // 1 (fresh/high energy) to 5 (exhausted/overtrained)
  painReported: boolean;
  needsCoachEscalation: boolean;
  sentiment: 'positive' | 'neutral' | 'struggling';
  highlightTag: string;
}

/**
 * Evaluates athlete feedback using calibrated System One decision criteria.
 */
export function analyzeSessionBiofeedback(
  feedback: string,
  rating: number
): SessionBiofeedbackAnalysis {
  const text = (feedback || '').toLowerCase();

  // Detect pain, strain, or joint warning keywords
  const painKeywords = [
    'pain', 'hurt', 'hurts', 'strain', 'tweak', 'tweaked', 
    'pinch', 'clicking', 'sharp', 'ache', 'sore joint', 
    'shoulder pop', 'lower back', 'tendon', 'injury'
  ];
  const painReported = painKeywords.some(kw => text.includes(kw));

  // Detect struggling sentiment
  const struggleKeywords = [
    'failed', 'missed', 'struggling', 'exhausted', 'heavy', 
    'weak', 'dizzy', 'cramping', 'no energy', 'terrible', 'burned out'
  ];
  const isStruggling = struggleKeywords.some(kw => text.includes(kw));

  // Detect positive pump / progression keywords
  const positiveKeywords = [
    'great', 'amazing', 'pump', 'pr', 'personal record', 'strong', 
    'crushed', 'easy', 'smooth', 'loved', 'felt good', 'solid'
  ];
  const isPositive = positiveKeywords.some(kw => text.includes(kw));

  // Determine sentiment
  let sentiment: 'positive' | 'neutral' | 'struggling' = 'neutral';
  if (rating >= 4 || isPositive) {
    sentiment = 'positive';
  } else if (rating <= 2 || isStruggling || painReported) {
    sentiment = 'struggling';
  }

  // Fatigue scoring (1 - 5)
  let fatigueScore = 3;
  if (rating === 5) fatigueScore = 2;
  else if (rating === 4) fatigueScore = 3;
  else if (rating === 3) fatigueScore = 4;
  else if (rating <= 2) fatigueScore = 5;

  if (text.includes('exhausted') || text.includes('drained') || text.includes('destroyed')) {
    fatigueScore = 5;
  }

  // Urgent coach escalation condition
  const needsCoachEscalation = painReported || rating <= 2;

  // Highlight tag for coach UI
  let highlightTag = 'Standard Progress';
  if (painReported) {
    highlightTag = '⚠️ Injury Alert';
  } else if (needsCoachEscalation) {
    highlightTag = '⚡ Coach Attention Needed';
  } else if (sentiment === 'positive' && rating === 5) {
    highlightTag = '🔥 Peak Performance';
  } else if (fatigueScore >= 4) {
    highlightTag = '🔋 High Fatigue';
  }

  return {
    fatigueScore,
    painReported,
    needsCoachEscalation,
    sentiment,
    highlightTag
  };
}
