type BaseTemplateParams = {
  pharmacy_name: string;
};

// Layout wrapper for all emails
const buildEmailWrapper = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #334155;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
    }
    .wrapper {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      margin-top: 24px;
      margin-bottom: 24px;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    }
    .header {
      background-color: #ffffff;
      padding: 32px 24px;
      text-align: center;
      border-top: 5px solid #006C75;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
      letter-spacing: -0.025em;
    }
    .content {
      padding: 40px 32px;
    }
    .alert-box {
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
      font-weight: 600;
    }
    .alert-amber {
      background-color: #fffbeb;
      color: #b45309;
      border: 1px solid #fde68a;
    }
    .alert-red {
      background-color: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }
    .alert-green {
      background-color: #f0fdf4;
      color: #15803d;
      border: 1px solid #bbf7d0;
    }
    .button {
      display: inline-block;
      background-color: #006C75;
      color: #ffffff;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 12px;
      font-weight: 700;
      margin-top: 16px;
      margin-bottom: 16px;
      text-align: center;
    }
    .footer {
      text-align: center;
      padding: 32px;
      background-color: #f8fafc;
      color: #94a3b8;
      font-size: 13px;
      border-top: 1px solid #e2e8f0;
    }
    .footer a {
      color: #006C75;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <img src="https://pharmacore.365health.online/images/preview%20image.png" alt="PharmaCore" width="240" style="max-width: 240px; height: auto; display: block; margin: 0 auto;">
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      This is an automated message from PharmaCore by 365Health. <br>
      Need help? Contact us at <a href="mailto:hello@365health.online">hello@365health.online</a>
    </div>
  </div>
</body>
</html>
`;

export const renderTrialReminder = ({ pharmacy_name, days_remaining, trial_ends_at }: BaseTemplateParams & { days_remaining: number; trial_ends_at: string; }) => {
  const isUrgent = days_remaining <= 1;
  const isWarning = days_remaining <= 3 && days_remaining > 1;
  
  let alertHtml = '';
  if (isUrgent) {
    alertHtml = `<div class="alert-box alert-red">🚨 CRITICAL: Your free trial ends in ${days_remaining} day(s). Action is required to avoid service interruption.</div>`;
  } else if (isWarning) {
    alertHtml = `<div class="alert-box alert-amber">⚠️ Heads up! Your free trial ends in ${days_remaining} day(s).</div>`;
  }

  const content = `
    ${alertHtml}
    <p>Hi <strong>${pharmacy_name}</strong>,</p>
    <p>Your 30-day free trial of PharmaCore is scheduled to end on <strong>${trial_ends_at}</strong>. That's ${days_remaining} day(s) from now.</p>
    
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <h3 style="margin-top: 0; color: #0f172a;">Current Subscription Plans:</h3>
      <ul style="margin-bottom: 0; padding-left: 20px;">
        <li style="margin-bottom: 8px;"><strong>Basic Plan:</strong> ₦10,000 / month</li>
        <li><strong>Pro Plan:</strong> ₦20,000 / month</li>
      </ul>
    </div>

    <p>Your data is completely safe. Subscribing takes less than 2 minutes and ensures your pharmacy continues to operate smoothly.</p>
    
    <div style="text-align: center;">
      <a href="https://pharmacore.365health.online/subscription" class="button">Subscribe Now →</a>
    </div>
  `;
  return buildEmailWrapper(content);
};

export const renderRenewalReminder = ({ pharmacy_name, days_remaining, subscription_expires_at, plan, amount_due }: BaseTemplateParams & { days_remaining: number; subscription_expires_at: string; plan: string; amount_due: string; }) => {
  const isUrgent = days_remaining <= 3;
  
  let alertHtml = '';
  if (isUrgent) {
    alertHtml = `<div class="alert-box alert-red">🚨 Action Required: Your subscription expires in ${days_remaining} day(s).</div>`;
  } else if (days_remaining <= 7) {
    alertHtml = `<div class="alert-box alert-amber">⚠️ Reminder: Your subscription renews in ${days_remaining} day(s).</div>`;
  }

  const content = `
    ${alertHtml}
    <p>Hi <strong>${pharmacy_name}</strong>,</p>
    <p>We're writing to remind you that your <strong>${plan.toUpperCase()}</strong> subscription plan expires on <strong>${subscription_expires_at}</strong>.</p>
    
    <p><strong>Amount Due:</strong> ₦${amount_due}</p>

    <p>Renewing takes less than 2 minutes and your pharmacy data remains entirely intact.</p>
    
    <div style="text-align: center;">
      <a href="https://pharmacore.365health.online/subscription" class="button">Renew Now →</a>
    </div>
  `;
  return buildEmailWrapper(content);
};

export const renderGracePeriodNotice = ({ pharmacy_name, expired_date }: BaseTemplateParams & { expired_date: string }) => {
  const content = `
    <div class="alert-box alert-red" style="font-size: 16px;">
      ⚠️ Your subscription expired on ${expired_date}. Your account is now in read-only mode.
    </div>
    <p>Hi <strong>${pharmacy_name}</strong>,</p>
    <p>You have exactly <strong>3 days</strong> to renew before your account is fully suspended.</p>
    
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <h3 style="margin-top: 0; color: #0f172a;">What read-only means:</h3>
      <p style="margin-bottom: 0;">You can still safely log in and view your data and reports, but you <strong>cannot process new sales, add inventory, or manage patients.</strong></p>
    </div>
    
    <div style="text-align: center;">
      <a href="https://pharmacore.365health.online/subscription" class="button">Renew Now — Restore Full Access →</a>
    </div>
  `;
  return buildEmailWrapper(content);
};

export const renderSuspendedNotice = ({ pharmacy_name, suspended_reason }: BaseTemplateParams & { suspended_reason: string }) => {
  const content = `
    <div class="alert-box alert-red" style="font-size: 16px;">
      ⛔ Your PharmaCore account has been officially suspended.
    </div>
    <p>Hi <strong>${pharmacy_name}</strong>,</p>
    
    <p><strong>Reason:</strong> ${suspended_reason}</p>
    
    <p>Please note that your data remains completely safe and is retained securely for 90 days. You can regain full access at any time by renewing your subscription.</p>
    
    <div style="text-align: center;">
      <a href="https://pharmacore.365health.online/subscription" class="button">Reactivate Your Account →</a>
    </div>
  `;
  return buildEmailWrapper(content);
};

export const renderSubscriptionRenewed = ({ pharmacy_name, plan, billing_cycle, new_expiry_date, amount_paid }: BaseTemplateParams & { plan: string, billing_cycle: string, new_expiry_date: string, amount_paid: string }) => {
  const content = `
    <div class="alert-box alert-green" style="font-size: 16px; text-align: center;">
      ✅ Your subscription has been securely renewed.
    </div>
    <p>Hi <strong>${pharmacy_name}</strong>,</p>
    <p>Thank you for your payment! We've successfully applied the renewal to your account.</p>
    
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <ul style="margin: 0; padding-left: 20px;">
        <li style="margin-bottom: 8px;"><strong>Plan details:</strong> ${plan.toUpperCase()} (${billing_cycle})</li>
        <li style="margin-bottom: 8px;"><strong>Amount paid:</strong> ₦${amount_paid}</li>
        <li><strong>New Expiry Date:</strong> ${new_expiry_date}</li>
      </ul>
    </div>
    
    <div style="text-align: center;">
      <a href="https://pharmacore.365health.online/dashboard" class="button">Go to PharmaCore Dashboard →</a>
    </div>
  `;
  return buildEmailWrapper(content);
};
