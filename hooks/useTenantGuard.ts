import { useAuth } from '../contexts/AuthContext';
import { TenantStatus } from '../types';

export const useTenantGuard = () => {
  const { profile } = useAuth();
  const tenant = profile?.tenant;

  if (!tenant) {
    return {
      isReadOnly: false,
      isBlocked: false,
      isTrialing: false,
      trialDaysRemaining: 0,
      subscriptionDaysRemaining: 0,
      showRenewalBanner: false,
      isDemo: false,
      isExpiredGifted: false,
    };
  }

  const isDemo = tenant.is_demo === true;
  const isBlocked = tenant.status === TenantStatus.PENDING || tenant.status === TenantStatus.DELETED;
  const isStrictlySuspended = tenant.status === TenantStatus.SUSPENDED; // Check manual suspension vs billing suspension
  const now = new Date();
  
  // 1. Gifted Tenants Override (Before Standard Subscription Logs)
  if (tenant.is_gifted && tenant.gifted_until && !isBlocked && !isStrictlySuspended) {
    const giftedUntilDate = new Date(tenant.gifted_until);
    // Use end of day logic or basic >= comparison for gifted expiration
    if (giftedUntilDate.getTime() >= now.getTime()) {
      return {
        isReadOnly: false,
        isBlocked: false,
        isTrialing: false,
        trialDaysRemaining: 0,
        subscriptionDaysRemaining: Math.ceil((giftedUntilDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        showRenewalBanner: false,
        isDemo,
      };
    }
  }

  // Fallthrough to standard logic if not actively gifted or if gifted_until has passed
  const isReadOnly = tenant.status === TenantStatus.GRACE_PERIOD || tenant.status === TenantStatus.SUSPENDED;

  let trialDaysRemaining = 0;
  let isTrialing = false;

  if (tenant.trial_ends_at && !tenant.subscription_expires_at) {
    const trialEnd = new Date(tenant.trial_ends_at);
    if (trialEnd > now) {
      isTrialing = true;
      trialDaysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }
  }

  let subscriptionDaysRemaining = 0;
  if (tenant.subscription_expires_at) {
    const subEnd = new Date(tenant.subscription_expires_at);
    subscriptionDaysRemaining = Math.ceil((subEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Renewal banner should show if 7 or fewer days left
  const showRenewalBanner = subscriptionDaysRemaining > 0 && subscriptionDaysRemaining <= 7;

  // Check if gifted beta has expired and no active subscription exists
  let isExpiredGifted = false;
  if (tenant.is_gifted && tenant.gifted_until) {
    const giftedUntilDate = new Date(tenant.gifted_until);
    // Use end of day logic or basic < comparison for gifted expiration
    if (giftedUntilDate.getTime() < now.getTime()) {
      // Allow if they have an active paid subscription
      let hasActiveSubscription = false;
      if (tenant.subscription_expires_at) {
        const subEnd = new Date(tenant.subscription_expires_at);
        if (subEnd.getTime() > now.getTime()) {
          hasActiveSubscription = true;
        }
      }
      if (!hasActiveSubscription) {
        isExpiredGifted = true;
      }
    }
  }

  return {
    isReadOnly,
    isBlocked,
    isTrialing,
    trialDaysRemaining,
    subscriptionDaysRemaining,
    showRenewalBanner,
    isDemo,
    isExpiredGifted,
  };
};
