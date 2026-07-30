/**
 * Proves SMTP actually works, before a real user needs a password reset.
 *
 *   npm run check:mail                      verify the credentials only
 *   npm run check:mail you@example.com      also send a real reset style email
 *
 * Without this, a wrong SMTP password shows up as a password reset that says
 * "check your email" and delivers nothing: the forgot password endpoint
 * deliberately swallows delivery errors so it cannot be used to discover which
 * email addresses have accounts.
 */
import { env } from '../src/config/env';
import { sendPasswordResetEmail, verifyMailTransport } from '../src/services/mail.service';

const recipient = process.argv[2];

async function main(): Promise<void> {
  console.log('\nMail check');
  console.log('----------');
  console.log(`host       : ${env.mail.host || '(not set)'}`);
  console.log(`port       : ${env.mail.port}`);
  console.log(`secure     : ${env.mail.secure}`);
  console.log(`user       : ${env.mail.user || '(not set)'}`);
  console.log(`password   : ${env.mail.password ? `set, ${env.mail.password.length} chars` : '(not set)'}`);
  console.log(`from       : ${env.mail.from}`);
  console.log(`configured : ${env.mail.isConfigured}\n`);

  if (!env.mail.isConfigured) {
    console.log('SMTP_HOST, SMTP_USER and SMTP_PASSWORD must all be set.');
    console.log('Until then reset links are printed to the API console, which is');
    console.log('fine locally. Production refuses to boot without them.\n');
    process.exit(1);
  }

  // 1. Credentials. This does a real SMTP handshake and login.
  const ok = await verifyMailTransport();
  if (!ok) {
    console.log('\n  FAIL  SMTP login rejected. See the error above.\n');
    console.log('Brevo: SMTP_USER is the login shown under SMTP & API > SMTP,');
    console.log('not your account email, and SMTP_PASSWORD is the SMTP key.\n');
    process.exit(1);
  }
  console.log('  PASS  SMTP credentials accepted');

  if (!recipient) {
    console.log('\nPass an address to also send a real email:');
    console.log('  npm run check:mail you@example.com\n');
    return;
  }

  // 2. Send the actual template a user would receive, so the From address,
  //    the HTML and the link are all exercised.
  await sendPasswordResetEmail({
    to: recipient,
    roleLabel: 'Driver',
    resetUrl: `${env.frontendUrl}/driver/reset-password?token=check-mail-test-token`,
    expiresInMinutes: env.passwordReset.ttlMinutes,
  });

  console.log(`  PASS  reset email handed to ${env.mail.host}`);
  console.log(`\nCheck the inbox for ${recipient}, including spam.`);
  console.log('Nothing arriving while the send succeeded means the sender address');
  console.log(`in MAIL_FROM (${env.mail.from}) is not verified with your provider.\n`);
}

void main().catch((error) => {
  console.error('\nMail check failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
