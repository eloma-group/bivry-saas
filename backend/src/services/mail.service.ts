import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

/**
 * SMTP delivery.
 *
 * When SMTP_HOST / SMTP_USER / SMTP_PASSWORD are set the message is sent for
 * real. When they are not (local development) the message is printed to the
 * console instead, so the whole forgot password / reset password flow can be
 * tested without a mail server. `assertProductionConfig` refuses to boot
 * production without SMTP, so reset links can never silently go nowhere.
 */

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  transporter ??= nodemailer.createTransport({
    host: env.mail.host,
    port: env.mail.port,
    secure: env.mail.secure,
    auth: { user: env.mail.user, pass: env.mail.password },
    // Azure Communication Services and Microsoft 365 both need a little
    // headroom on a cold connection.
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  return transporter;
}

export async function sendMail(message: MailMessage): Promise<void> {
  if (!env.mail.isConfigured) {
    logger.info('Mail not configured, printing message instead', {
      to: message.to,
      subject: message.subject,
      body: message.text,
    });
    return;
  }

  try {
    const info = await getTransporter().sendMail({
      from: env.mail.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    logger.info(`Mail sent to ${message.to} (${info.messageId})`);
  } catch (error) {
    // The forgot password endpoint must not reveal whether an address exists,
    // so a delivery failure is logged and swallowed instead of returned.
    logger.error(`Could not send mail to ${message.to}`, error);
  }
}

/** Checks the SMTP credentials at boot rather than at the first reset request. */
export async function verifyMailTransport(): Promise<boolean> {
  if (!env.mail.isConfigured) {
    logger.warn('SMTP is not configured. Emails will be printed to the console.');
    return true;
  }

  try {
    await getTransporter().verify();
    logger.success(`SMTP ready (${env.mail.host}:${env.mail.port})`);
    return true;
  } catch (error) {
    logger.error('SMTP verification failed', error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Inline styles only, so it renders the same in every mail client. */
function layout(params: {
  heading: string;
  lines: string[];
  button?: { label: string; url: string };
}): string {
  const paragraphs = params.lines
    .map((line) => `<p style="margin:0 0 14px;line-height:1.6">${escapeHtml(line)}</p>`)
    .join('');

  const button = params.button
    ? `<p style="margin:24px 0">
         <a href="${escapeHtml(params.button.url)}"
            style="background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;display:inline-block;font-weight:600">
           ${escapeHtml(params.button.label)}
         </a>
       </p>
       <p style="margin:0 0 14px;font-size:12px;color:#64748b;word-break:break-all">
         If the button does not work, paste this link into your browser:<br>${escapeHtml(
           params.button.url,
         )}
       </p>`
    : '';

  return `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:15px;color:#0f172a;max-width:560px;margin:0 auto;padding:24px">
    <h1 style="font-size:20px;margin:0 0 18px">${escapeHtml(params.heading)}</h1>
    ${paragraphs}
    ${button}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0 14px">
    <p style="margin:0;font-size:12px;color:#64748b">BIVRY Fleet Management</p>
  </div>`;
}

export async function sendPasswordResetEmail(params: {
  to: string;
  roleLabel: string;
  resetUrl: string;
  expiresInMinutes: number;
}): Promise<void> {
  const lines = [
    `A password reset was requested for your BIVRY ${params.roleLabel} account.`,
    `This link expires in ${params.expiresInMinutes} minutes and can only be used once.`,
    'If you did not request this you can safely ignore this email. Your password will not change.',
  ];

  await sendMail({
    to: params.to,
    subject: `Reset your BIVRY ${params.roleLabel} password`,
    text: [lines[0], '', `Reset link: ${params.resetUrl}`, '', lines[1], lines[2]].join('\n'),
    html: layout({
      heading: 'Reset your password',
      lines,
      button: { label: 'Reset password', url: params.resetUrl },
    }),
  });
}

export async function sendPasswordChangedEmail(params: {
  to: string;
  roleLabel: string;
}): Promise<void> {
  const lines = [
    `The password for your BIVRY ${params.roleLabel} account was just changed.`,
    'Every other signed in device has been logged out.',
    'If this was not you, contact your administrator immediately.',
  ];

  await sendMail({
    to: params.to,
    subject: `Your BIVRY ${params.roleLabel} password was changed`,
    text: lines.join('\n\n'),
    html: layout({ heading: 'Password changed', lines }),
  });
}
