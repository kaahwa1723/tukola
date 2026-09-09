/**
 * Transactional email templates — Tukola brand.
 *
 * Brand colors: primary #2952E8, accent #00C8FF, navy #0A0F2C.
 * Table-based layout (email-client safe), single 600px column, mobile
 * friendly. Every template returns { subject, html, text } — always send
 * both bodies so plain-text clients and spam filters are happy.
 *
 * All user-supplied strings (names, job titles, dispute reasons) are
 * HTML-escaped before they enter a template.
 */

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

const BRAND = {
  primary: '#2952E8',
  accent: '#00C8FF',
  navy: '#0A0F2C',
};

const APP_URL = 'https://tukolaapp.com';

/** HTML-escape any user-supplied string before it enters a template. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** UGX 150,000-style formatting for money amounts. */
export function formatUgx(amount: number): string {
  return `UGX ${Math.round(amount).toLocaleString('en-US')}`;
}

function button(label: string, href: string): string {
  return `
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
          <tr>
            <td style="background:${BRAND.primary};border-radius:8px;">
              <a href="${href}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">${esc(label)}</a>
            </td>
          </tr>
        </table>`;
}

function layout(heading: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(heading)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:${BRAND.navy};padding:20px 32px;">
              <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.5px;">Tukola</span><span style="color:${BRAND.accent};font-size:20px;font-weight:700;">.</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;color:#1a1f36;font-size:15px;line-height:1.6;">
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${BRAND.navy};">${esc(heading)}</h1>
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e8ebf4;color:#8a90a6;font-size:12px;line-height:1.5;">
              Tukola — connecting Ugandan employers with trusted fundis.<br />
              <a href="${APP_URL}" style="color:${BRAND.primary};text-decoration:none;">tukolaapp.com</a>
              &nbsp;·&nbsp; Do not reply to this email.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function footerText(): string {
  return `\n\n—\nTukola · ${APP_URL}\nDo not reply to this email.`;
}

// ── Templates ──────────────────────────────────────────────────────────────

export function welcomeEmail(name: string, role: string): EmailTemplate {
  const safeName = esc(name);
  const isWorker = role === 'worker';
  const subject = 'Welcome to Tukola';
  const body = `
              <p style="margin:0 0 12px;">Hi ${safeName},</p>
              <p style="margin:0 0 12px;">Welcome to Tukola — your account is ready.</p>
              <p style="margin:0 0 12px;">${
                isWorker
                  ? 'Browse jobs near you, apply in one tap, and get paid securely through escrow when the work is done.'
                  : 'Post a job in minutes, review rated fundis, and pay safely — your money stays in escrow until the work is complete.'
              }</p>
              ${button(isWorker ? 'Find work' : 'Post a job', APP_URL)}`;
  const text = `Hi ${name},

Welcome to Tukola — your account is ready.

${isWorker
    ? 'Browse jobs near you, apply in one tap, and get paid securely through escrow when the work is done.'
    : 'Post a job in minutes, review rated fundis, and pay safely — your money stays in escrow until the work is complete.'}

Get started: ${APP_URL}${footerText()}`;
  return { subject, html: layout(subject, body), text };
}

export function applicationAcceptedEmail(workerName: string, jobTitle: string): EmailTemplate {
  const subject = 'You’ve been chosen for a job';
  const body = `
              <p style="margin:0 0 12px;">Hi ${esc(workerName)},</p>
              <p style="margin:0 0 12px;">Good news — the employer accepted your application for <strong>${esc(jobTitle)}</strong>.</p>
              <p style="margin:0 0 12px;">Open the app to see the job details and coordinate with the employer. Payment is handled securely through Tukola escrow.</p>
              ${button('View job', APP_URL)}`;
  const text = `Hi ${workerName},

Good news — the employer accepted your application for "${jobTitle}".

Open the app to see the job details and coordinate with the employer. Payment is handled securely through Tukola escrow.

View job: ${APP_URL}${footerText()}`;
  return { subject, html: layout(subject, body), text };
}

export function paymentHeldEmail(workerName: string, jobTitle: string, amountUgx: number): EmailTemplate {
  const subject = 'Payment secured — you can start work';
  const amount = formatUgx(amountUgx);
  const body = `
              <p style="margin:0 0 12px;">Hi ${esc(workerName)},</p>
              <p style="margin:0 0 12px;">The employer has deposited <strong>${amount}</strong> into Tukola escrow for <strong>${esc(jobTitle)}</strong>.</p>
              <p style="margin:0 0 12px;">The money is held safely and will be paid out to you when the job is completed and confirmed. You can start work with confidence.</p>
              ${button('View job', APP_URL)}`;
  const text = `Hi ${workerName},

The employer has deposited ${amount} into Tukola escrow for "${jobTitle}".

The money is held safely and will be paid out to you when the job is completed and confirmed. You can start work with confidence.

View job: ${APP_URL}${footerText()}`;
  return { subject, html: layout(subject, body), text };
}

export function paymentReleasedEmail(
  recipientName: string,
  jobTitle: string,
  amountUgx: number,
  isFundi: boolean
): EmailTemplate {
  const subject = isFundi ? 'You’ve been paid' : 'Payment released';
  const amount = formatUgx(amountUgx);
  const body = `
              <p style="margin:0 0 12px;">Hi ${esc(recipientName)},</p>
              <p style="margin:0 0 12px;">${
                isFundi
                  ? `Payment for <strong>${esc(jobTitle)}</strong> has been released — <strong>${amount}</strong> is on its way to your mobile money.`
                  : `The escrow payment of <strong>${amount}</strong> for <strong>${esc(jobTitle)}</strong> has been released to your fundi. Thank you for using Tukola.`
              }</p>
              <p style="margin:0 0 12px;">${isFundi ? 'Keep up the great work — every completed job builds your rating.' : 'We hope the job went well. Your ratings help fundis build their reputation.'}</p>
              ${button('Open Tukola', APP_URL)}`;
  const text = `Hi ${recipientName},

${isFundi
    ? `Payment for "${jobTitle}" has been released — ${amount} is on its way to your mobile money.`
    : `The escrow payment of ${amount} for "${jobTitle}" has been released to your fundi. Thank you for using Tukola.`}

Open Tukola: ${APP_URL}${footerText()}`;
  return { subject, html: layout(subject, body), text };
}

export function disputeOpenedEmail(
  recipientName: string,
  jobTitle: string,
  reason: string
): EmailTemplate {
  const subject = 'Dispute opened on a job';
  const body = `
              <p style="margin:0 0 12px;">Hi ${esc(recipientName)},</p>
              <p style="margin:0 0 12px;">A dispute has been opened for <strong>${esc(jobTitle)}</strong>. The escrowed payment is frozen until our team reviews the case.</p>
              <p style="margin:0 0 12px;padding:12px 16px;background:#f4f6fb;border-left:3px solid ${BRAND.primary};border-radius:4px;">Reason: ${esc(reason)}</p>
              <p style="margin:0 0 12px;">Our team will review both sides and resolve the dispute. You may be contacted for more information.</p>`;
  const text = `Hi ${recipientName},

A dispute has been opened for "${jobTitle}". The escrowed payment is frozen until our team reviews the case.

Reason: ${reason}

Our team will review both sides and resolve the dispute. You may be contacted for more information.${footerText()}`;
  return { subject, html: layout(subject, body), text };
}
