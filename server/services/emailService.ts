import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env';

interface PasswordResetEmailOptions {
  email: string;
  name?: string;
  token: string;
  resetUrl: string;
}

let transporter: Transporter | null = null;

const cleanEnv = (val?: string) => val?.trim().replace(/^['"]|['"]$/g, '');

function getTransporter(): Transporter | null {
  const host = cleanEnv(process.env.SMTP_HOST);
  const user = cleanEnv(process.env.SMTP_USER);
  const pass = cleanEnv(process.env.SMTP_PASS);
  const port = Number(cleanEnv(process.env.SMTP_PORT) || 587);

  if (host && user && pass) {
    if (!transporter) {
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        pool: true,
        maxConnections: 3,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
      });
    }
    return transporter;
  }
  return null;
}

export async function sendPasswordResetEmail({
  email,
  name,
  token,
  resetUrl,
}: PasswordResetEmailOptions): Promise<{ success: boolean; simulated?: boolean; messageId?: string }> {
  const clientName = name || email.split('@')[0] || 'Valued Member';
  const fromAddress = process.env.SMTP_FROM?.trim() || '"RenewX Crew Security" <security@renewx.com>';

  const mailOptions = {
    from: fromAddress,
    to: email,
    subject: 'RenewX Crew • Password Reset Verification Link',
    text: `Hello ${clientName},

We received a request to change or reset your RenewX account password.

Please open this link to verify and change your password:
${resetUrl}

This verification link will expire in 30 minutes.

If you did not request a password change, please ignore this email or review your account security immediately.

— RenewX Crew Security Team`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Password</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #0f172a; }
    .container { max-width: 580px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: #0a0a0a; padding: 28px 24px; text-align: center; }
    .logo-title { color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: -0.5px; margin: 0; }
    .logo-accent { color: #ffc400; }
    .logo-sub { color: #94a3b8; font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-top: 4px; }
    .content { padding: 32px 28px; }
    .greeting { font-size: 18px; font-weight: 700; margin-bottom: 12px; color: #0f172a; }
    .description { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .btn-wrap { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background-color: #ffc400; color: #0a0a0a; font-size: 15px; font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 2px 8px rgba(255, 196, 0, 0.35); }
    .link-fallback { background: #f1f5f9; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 12px; color: #334155; word-break: break-all; margin-top: 20px; }
    .notice { font-size: 12px; color: #94a3b8; line-height: 1.5; margin-top: 28px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
    .footer { background: #f8fafc; padding: 18px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo-title">Renew<span class="logo-accent">X</span></h1>
      <div class="logo-sub">CREW • ACCOUNT SECURITY</div>
    </div>
    <div class="content">
      <div class="greeting">Hello ${clientName},</div>
      <div class="description">
        We received a request to verify your email and set a new password for your <strong>RenewX</strong> account.
      </div>
      <div class="btn-wrap">
        <a href="${resetUrl}" class="btn" target="_blank">Verify & Change Password</a>
      </div>
      <div class="description" style="margin-bottom: 8px; font-size: 12px; color: #64748b;">
        Or copy and paste this verification URL into your web browser:
      </div>
      <div class="link-fallback">${resetUrl}</div>
      <div class="notice">
        <strong>Security Notice:</strong> This single-use link expires in 30 minutes. If you did not request a password change, please disregard this email or review your account security.
      </div>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} RenewX Crew Inc. • 256-bit Encrypted Identity Verification
    </div>
  </div>
</body>
</html>
    `,
  };

  const activeTransporter = getTransporter();

  if (activeTransporter) {
    try {
      const info = await activeTransporter.sendMail(mailOptions);
      console.log(`[Email] Sent password reset email to ${email} (MessageID: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error('[Email] Failed to send via SMTP, falling back to simulated log:', err);
    }
  }

  // Development / fallback simulation
  console.log('\n=============================================================');
  console.log('📧 [RENEWX EMAIL DISPATCH] Password Reset Verification Link');
  console.log(`To: ${email}`);
  console.log(`Verification Token: ${token}`);
  console.log(`Verification Link: ${resetUrl}`);
  console.log('=============================================================\n');

  return { success: true, simulated: true };
}

interface EmailVerificationCodeOptions {
  email: string;
  name?: string;
  code: string;
}

export async function sendEmailVerificationCode({
  email,
  name,
  code,
}: EmailVerificationCodeOptions): Promise<{ success: boolean; simulated?: boolean; messageId?: string }> {
  const clientName = name || email.split('@')[0] || 'Valued Member';
  const fromAddress = process.env.SMTP_FROM?.trim() || '"RenewX Security" <security@renewx.com>';

  const mailOptions = {
    from: fromAddress,
    to: email,
    subject: 'RenewX • Verify Your New Email Address',
    text: `Hello ${clientName},

Your 6-digit verification code to update your RenewX account email is:

${code}

This code expires in 15 minutes. If you did not request this email change, please ignore this message.

— RenewX Security Team`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Verify Your New Email</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #0f172a; }
    .container { max-width: 540px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: #0a0a0a; padding: 24px; text-align: center; }
    .logo-title { color: #ffffff; font-size: 22px; font-weight: 900; margin: 0; }
    .logo-accent { color: #059669; }
    .content { padding: 32px 28px; text-align: center; }
    .greeting { font-size: 18px; font-weight: 700; margin-bottom: 12px; color: #0f172a; text-align: left; }
    .desc { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; text-align: left; }
    .code-box { display: inline-block; background: #f0fdf4; border: 2px dashed #059669; border-radius: 12px; padding: 16px 36px; margin: 16px 0; }
    .code { font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #047857; font-family: monospace; }
    .expiry { font-size: 12px; color: #64748b; margin-top: 12px; }
    .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-title">Renew<span class="logo-accent">X</span></div>
    </div>
    <div class="content">
      <div class="greeting">Hello ${clientName},</div>
      <div class="desc">We received a request to update your account email to this address. Use the 6-digit verification code below to confirm this change:</div>
      <div class="code-box">
        <div class="code">${code}</div>
      </div>
      <div class="expiry">This verification code will expire in 15 minutes.</div>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} RenewX Inc. • Account Security Verification
    </div>
  </div>
</body>
</html>
    `,
  };

  const activeTransporter = getTransporter();

  if (activeTransporter) {
    try {
      const info = await activeTransporter.sendMail(mailOptions);
      console.log(`[Email] Sent email verification code to ${email} (MessageID: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error('[Email] Failed to send via SMTP, falling back to simulated log:', err);
    }
  }

  // Development / fallback simulation
  console.log('\n=============================================================');
  console.log('📧 [RENEWX EMAIL DISPATCH] New Email Verification Code');
  console.log(`To: ${email}`);
  console.log(`Verification Code: ${code}`);
  console.log('=============================================================\n');

  return { success: true, simulated: true };
}

