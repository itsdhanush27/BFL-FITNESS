/**
 * planDurationUtils.ts (Mobile)
 * ---------------------------------------------------------------------------
 * Single Source of Truth for Plan-Specific Expiration & Duration Logic.
 *
 * Handles:
 *   • Hourly plans: Session credit tracking & scheduled session windows.
 *   • Weekly plans: Exact 7-calendar-day periods or Stripe billing period.
 *   • Monthly plans: Exact calendar month calculation (with Jan 31 -> Feb 28 month-end rules)
 *     or Stripe billing period.
 *   • Custom plans: Configured duration in days.
 *   • Reminder threshold evaluations: 24h for weekly, 3d and 24h for monthly.
 * ---------------------------------------------------------------------------
 */

export interface PlanDurationInfo {
  billingCycle: 'hourly' | 'weekly' | 'monthly' | 'custom';
  durationDays: number;
  sessionCredits: number;
  isHourlySession: boolean;
  startedAtIso: string;
  expiresAtIso: string;
  formattedStart: string;
  formattedEnd: string;
}

export interface PlanLike {
  id?: string;
  name?: string;
  period?: string;
  billingCycle?: 'hourly' | 'weekly' | 'monthly' | 'custom' | string;
  customDurationDays?: number;
  price?: number;
}

/**
 * Normalizes and determines the canonical billing cycle from a plan object or string identifier.
 */
export function determineBillingCycle(plan?: PlanLike | string): 'hourly' | 'weekly' | 'monthly' | 'custom' {
  if (!plan) return 'monthly';

  if (typeof plan === 'string') {
    const s = plan.toLowerCase();
    if (s.includes('hour') || s.includes('session') || (s.includes('boxing') || s.includes('powerlifting')) && !s.includes('monthly') && !s.includes('weekly')) {
      return 'hourly';
    }
    if (s.includes('week') || s.includes('7')) return 'weekly';
    if (s.includes('month') || s.includes('30')) return 'monthly';
    if (s.includes('custom')) return 'custom';
    return 'monthly';
  }

  if (plan.billingCycle === 'hourly' || plan.billingCycle === 'weekly' || plan.billingCycle === 'monthly' || plan.billingCycle === 'custom') {
    return plan.billingCycle;
  }

  const str = `${plan.id || ''} ${plan.name || ''} ${plan.period || ''}`.toLowerCase();
  if (str.includes('/ hour') || str.includes('hourly') || str.includes('session')) return 'hourly';
  if (str.includes('/ week') || str.includes('weekly')) return 'weekly';
  if (str.includes('/ month') || str.includes('monthly')) return 'monthly';
  if (plan.customDurationDays && plan.customDurationDays > 0) return 'custom';

  return 'monthly';
}

/**
 * Calculates calendar month addition with strict month-end clamping.
 * E.g., Jan 31 + 1 month -> Feb 28 (or 29 in leap year).
 * E.g., Aug 31 + 1 month -> Sept 30.
 */
export function addOneCalendarMonth(startDate: Date): Date {
  const result = new Date(startDate.getTime());
  const currentDay = result.getDate();
  const currentMonth = result.getMonth();
  const targetMonth = (currentMonth + 1) % 12;

  // Move to 1st of target month
  result.setMonth(currentMonth + 1, 1);

  // Determine last day of target month
  const lastDayOfTargetMonth = new Date(result.getFullYear(), targetMonth + 1, 0).getDate();

  // Clamp day of month to the maximum available in target month
  result.setDate(Math.min(currentDay, lastDayOfTargetMonth));
  return result;
}

/**
 * Calculates start, expiration, duration, and session credits for any plan.
 */
export function calculatePlanPeriod(
  plan?: PlanLike | string,
  customDuration?: number,
  baseDate: Date = new Date()
): PlanDurationInfo {
  const cycle = determineBillingCycle(plan);
  const startDate = new Date(baseDate.getTime());
  let endDate: Date;
  let durationDays: number;
  let sessionCredits: number = 0;
  let isHourlySession: boolean = false;

  switch (cycle) {
    case 'hourly': {
      isHourlySession = true;
      sessionCredits = 1; // Default 1 session credit per hourly purchase
      // Coaching & session booking window of 30 days
      durationDays = 30;
      endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
      break;
    }
    case 'weekly': {
      durationDays = 7;
      endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      break;
    }
    case 'monthly': {
      endDate = addOneCalendarMonth(startDate);
      durationDays = Math.round((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
      break;
    }
    case 'custom':
    default: {
      durationDays = customDuration || (typeof plan === 'object' && plan?.customDurationDays) || 30;
      endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
      break;
    }
  }

  const localeOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  };

  return {
    billingCycle: cycle,
    durationDays,
    sessionCredits,
    isHourlySession,
    startedAtIso: startDate.toISOString(),
    expiresAtIso: endDate.toISOString(),
    formattedStart: startDate.toLocaleDateString('en-US', localeOptions),
    formattedEnd: endDate.toLocaleDateString('en-US', localeOptions),
  };
}

/**
 * Determines which reminder(s) are due for a given expiration timestamp and billing cycle.
 * - Weekly plans: reminder 24 hours before expiry.
 * - Monthly plans: reminder 3 days and 24 hours before expiry.
 * - Hourly session: reminder when 24h before scheduled session or booking window expiring.
 */
export function evaluateDueReminders(
  planExpiresAtIso: string,
  billingCycle: 'hourly' | 'weekly' | 'monthly' | 'custom',
  alreadySentReminders: string[] = [],
  currentTime: Date = new Date()
): ('3_day' | '24_hour')[] {
  const expiresAt = new Date(planExpiresAtIso).getTime();
  const now = currentTime.getTime();
  const msRemaining = expiresAt - now;

  if (msRemaining <= 0) return []; // Already expired, no upcoming reminders

  const hoursRemaining = msRemaining / (1000 * 60 * 60);
  const due: ('3_day' | '24_hour')[] = [];

  // Monthly or custom >= 14 days plans: 3-day reminder (between 24h and 72h)
  if ((billingCycle === 'monthly' || billingCycle === 'custom') && hoursRemaining <= 72 && hoursRemaining > 24) {
    if (!alreadySentReminders.includes('3_day')) {
      due.push('3_day');
    }
  }

  // All plans: 24-hour reminder (less than or equal to 24 hours remaining)
  if (hoursRemaining <= 24) {
    if (!alreadySentReminders.includes('24_hour')) {
      due.push('24_hour');
    }
  }

  return due;
}
