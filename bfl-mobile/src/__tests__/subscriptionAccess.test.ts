/**
 * subscriptionAccess.test.ts (Mobile)
 * ---------------------------------------------------------------------------
 * Automated verification suite for Centralized Subscription Access Control on Mobile.
 * ---------------------------------------------------------------------------
 */

import {
  getSubscriptionStatus,
  canReceiveCoaching,
  checkSubscriptionAccess,
  assertClientCanReceiveCoaching,
  SubscriptionExpiredError,
} from '../types/subscription';
import {
  determineBillingCycle,
  calculatePlanPeriod,
  addOneCalendarMonth,
  evaluateDueReminders,
} from '../utils/planDurationUtils';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${message}`);
  }
}

export async function runMobileTestSuite() {
  console.log('--- STARTING MOBILE SUBSCRIPTION ACCESS CONTROL VERIFICATION SUITE ---\n');

  // Test 1: Active client
  {
    const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const activeClient = {
      status: 'active',
      subscriptionStatus: 'active',
      planExpiresAt: futureDate,
      packageStartedAt: new Date().toISOString(),
    };
    assert(getSubscriptionStatus(activeClient) === 'active', 'Active client status should be "active"');
    assert(canReceiveCoaching(activeClient) === true, 'Active client should be able to receive coaching');
    assertClientCanReceiveCoaching('client_1', activeClient);
    console.log('✓ Test 1 Passed: Active client receives coaching normally');
  }

  // Test 2: Expired client (date in the past)
  {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const expiredClient = {
      status: 'active',
      subscriptionStatus: 'active',
      planExpiresAt: pastDate,
    };
    assert(getSubscriptionStatus(expiredClient) === 'expired', 'Expired client should derive "expired" status');
    assert(canReceiveCoaching(expiredClient) === false, 'Expired client should NOT receive coaching');

    let caught = false;
    try {
      assertClientCanReceiveCoaching('client_2', expiredClient);
    } catch (err) {
      if (err instanceof SubscriptionExpiredError) {
        caught = true;
        assert(err.clientId === 'client_2', 'Error should carry clientId');
        assert(err.subscriptionStatus === 'expired', 'Error should carry status');
      }
    }
    assert(caught, 'Backend guard assertClientCanReceiveCoaching must throw SubscriptionExpiredError for expired client');
    console.log('✓ Test 2 Passed: Expired client correctly blocked by backend guard');
  }

  // Test 3: Explicitly expired status
  {
    const expiredClient = {
      status: 'expired',
      subscriptionStatus: 'expired',
    };
    assert(getSubscriptionStatus(expiredClient) === 'expired', 'Explicit expired status honored');
    assert(canReceiveCoaching(expiredClient) === false, 'Explicitly expired client cannot receive coaching');
    console.log('✓ Test 3 Passed: Explicit expired status honored');
  }

  // Test 4: Cancellation respecting paid period (Cancellation before expiry)
  {
    const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    const cancelledActiveClient = {
      status: 'active',
      subscriptionStatus: 'cancelled',
      cancellationRequestedAt: new Date().toISOString(),
      planExpiresAt: futureDate,
    };
    assert(getSubscriptionStatus(cancelledActiveClient) === 'cancelled', 'Cancelled client within paid period has "cancelled" status');
    assert(canReceiveCoaching(cancelledActiveClient) === true, 'Cancelled client within paid period can still receive coaching');
    assertClientCanReceiveCoaching('client_cancelled_active', cancelledActiveClient);
    console.log('✓ Test 4 Passed: Cancelled client retains access until end of paid period');
  }

  // Test 5: Cancellation past expiry date
  {
    const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const cancelledExpiredClient = {
      status: 'cancelled',
      cancellationRequestedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      planExpiresAt: pastDate,
    };
    assert(getSubscriptionStatus(cancelledExpiredClient) === 'expired', 'Cancelled client past end date has "expired" status');
    assert(canReceiveCoaching(cancelledExpiredClient) === false, 'Cancelled client past end date cannot receive coaching');
    console.log('✓ Test 5 Passed: Cancelled client past expiry date is expired');
  }

  // Test 6: Past due payment gives grace period access
  {
    const pastDueClient = {
      status: 'past_due',
      subscriptionStatus: 'past_due',
    };
    assert(getSubscriptionStatus(pastDueClient) === 'past_due', 'Past due client status is "past_due"');
    assert(canReceiveCoaching(pastDueClient) === true, 'Past due client retains coaching during grace period');
    console.log('✓ Test 6 Passed: Past due client receives coaching during grace period');
  }

  // Test 7: Hourly plan session credit tracking
  {
    const hourlyClientActive = {
      status: 'active',
      subscriptionStatus: 'active',
      billingCycle: 'hourly' as const,
      sessionCredits: 1,
      usedSessionCredits: 0,
      planExpiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
    };
    assert(getSubscriptionStatus(hourlyClientActive) === 'active', 'Hourly plan with remaining credits is active');
    assert(canReceiveCoaching(hourlyClientActive) === true, 'Hourly plan with remaining credits can receive coaching');

    const hourlyClientExhausted = {
      status: 'active',
      subscriptionStatus: 'active',
      billingCycle: 'hourly' as const,
      sessionCredits: 1,
      usedSessionCredits: 1,
      planExpiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
    };
    assert(getSubscriptionStatus(hourlyClientExhausted) === 'expired', 'Hourly plan with 0 credits remaining is expired');
    assert(canReceiveCoaching(hourlyClientExhausted) === false, 'Hourly plan with 0 credits cannot receive new coaching');
    console.log('✓ Test 7 Passed: Hourly session credits properly enforce access boundaries');
  }

  // Test 8: Weekly plan duration calculation (exactly 7 days)
  {
    const weeklyInfo = calculatePlanPeriod({
      id: 'plan_weekly',
      name: 'Weekly Sprint',
      billingCycle: 'weekly',
      period: '/ week',
    });
    assert(weeklyInfo.durationDays === 7, 'Weekly plan must have durationDays = 7');
    assert(weeklyInfo.billingCycle === 'weekly', 'Billing cycle must be weekly');
    console.log('✓ Test 8 Passed: Weekly plan duration is exactly 7 days');
  }

  // Test 9: Monthly plan duration calculation (exact calendar month with rollover clamping)
  {
    const baseJan31 = new Date(2026, 0, 31, 12, 0, 0); // Jan 31, 2026
    const febClamped = addOneCalendarMonth(baseJan31);
    assert(febClamped.getMonth() === 1, 'Target month must be February');
    assert(febClamped.getDate() === 28, 'Jan 31 + 1 month in non-leap year must clamp to Feb 28');

    const monthlyInfo = calculatePlanPeriod(
      { id: 'plan_monthly', name: 'Elite Monthly', billingCycle: 'monthly', period: '/ month' },
      undefined,
      baseJan31
    );
    assert(monthlyInfo.billingCycle === 'monthly', 'Billing cycle must be monthly');
    assert(monthlyInfo.durationDays === 28, 'Duration for Jan 31 to Feb 28 must be 28 days');
    console.log('✓ Test 9 Passed: Monthly calendar addition correctly clamps Jan 31 -> Feb 28');
  }

  // Test 10: Reminders evaluation (24h for weekly, 3d and 24h for monthly)
  {
    const now = new Date();

    // 2 days remaining on monthly -> 3_day reminder due
    const monthlyExpiresIn48h = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
    const monthlyReminders = evaluateDueReminders(monthlyExpiresIn48h, 'monthly', [], now);
    assert(monthlyReminders.includes('3_day'), 'Monthly plan with 48h remaining must trigger 3_day reminder');

    // 12 hours remaining on weekly -> 24_hour reminder due
    const weeklyExpiresIn12h = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString();
    const weeklyReminders = evaluateDueReminders(weeklyExpiresIn12h, 'weekly', [], now);
    assert(weeklyReminders.includes('24_hour'), 'Weekly plan with 12h remaining must trigger 24_hour reminder');
    console.log('✓ Test 10 Passed: Expiration reminders trigger at exact intervals');
  }

  console.log('\n--- ALL MOBILE TESTS PASSED SUCCESSFULLY (10/10) ---');
  return true;
}

if (typeof (globalThis as any).process !== 'undefined') {
  const argv = (globalThis as any).process.argv || [];
  if (argv.some((arg: string) => arg.includes('subscriptionAccess'))) {
    runMobileTestSuite()
      .then(() => (globalThis as any).process.exit(0))
      .catch((err) => {
        console.error(err);
        (globalThis as any).process.exit(1);
      });
  }
}

