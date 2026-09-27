import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { generateToken, AuthenticatedRequest } from '../middleware/auth';
import { env } from '../config/env';
import { sendPasswordResetEmail, sendEmailVerificationCode } from '../services/emailService';
import { notifyUserEvent } from '../services/notificationService';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, full_name } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: { message: 'Email and password are required', code: 'VALIDATION_ERROR' },
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        success: false,
        error: { message: 'Password must be at least 6 characters long', code: 'VALIDATION_ERROR' },
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      res.status(409).json({
        success: false,
        error: { message: 'An account with this email already exists', code: 'USER_EXISTS' },
      });
      return;
    }

    // Assign admin role if email matches designated ADMIN_EMAIL
    const role: 'admin' | 'customer' =
      normalizedEmail === env.ADMIN_EMAIL.toLowerCase() ? 'admin' : 'customer';

    const newUser = await User.create({
      email: normalizedEmail,
      password,
      full_name: full_name?.trim() || '',
      role,
    });

    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          full_name: newUser.full_name,
          avatar_url: newUser.avatar_url,
          phone: newUser.phone,
          address: newUser.address,
          city: newUser.city,
          state: newUser.state,
          pincode: newUser.pincode,
          bio: newUser.bio,
          profile_completed: false,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: { message: 'Email and password are required', code: 'VALIDATION_ERROR' },
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    // Select password because schema has select: false
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      res.status(401).json({
        success: false,
        error: { message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' },
      });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        error: { message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' },
      });
      return;
    }

    // Require email verification for unverified accounts
    if (user.is_email_verified === false) {
      res.status(403).json({
        success: false,
        error: {
          message: 'Your email has not been verified yet. Please enter the verification code sent to your email.',
          code: 'EMAIL_NOT_VERIFIED',
        },
      });
      return;
    }

    // Auto-promote admin email if not already admin
    if (normalizedEmail === env.ADMIN_EMAIL.toLowerCase() && user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      message: 'Logged in successfully',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          phone: user.phone,
          address: user.address,
          city: user.city,
          state: user.state,
          pincode: user.pincode,
          bio: user.bio,
          profile_completed: user.profile_completed ?? Boolean(user.full_name && user.phone),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } });
      return;
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({ success: false, error: { message: 'User not found', code: 'NOT_FOUND' } });
      return;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        phone: user.phone,
        address: user.address,
        city: user.city,
        state: user.state,
        pincode: user.pincode,
        bio: user.bio,
        profile_completed: user.profile_completed ?? Boolean(user.full_name && user.phone),
        created_at: user.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

interface GoogleIdTokenPayload {
  iss?: string;
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: boolean;
  exp?: number;
  name?: string;
  picture?: string;
}

let googleCertCache: {
  certs: Record<string, string>;
  expiresAt: number;
} | null = null;

async function getGoogleCertificates(): Promise<Record<string, string>> {
  if (googleCertCache && googleCertCache.expiresAt > Date.now()) {
    return googleCertCache.certs;
  }

  const response = await fetch('https://www.googleapis.com/oauth2/v1/certs');
  if (!response.ok) {
    throw new Error(`Unable to fetch Google signing certificates (HTTP ${response.status})`);
  }

  const certs = await response.json() as Record<string, string>;
  const cacheControl = response.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\\d+)/i);
  const maxAgeSeconds = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;

  googleCertCache = {
    certs,
    expiresAt: Date.now() + Math.max(60, Math.min(maxAgeSeconds, 86400)) * 1000,
  };

  return certs;
}

async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdTokenPayload> {
  if (!idToken || typeof idToken !== 'string' || idToken.length > 8192) {
    throw new Error('Invalid Google ID token');
  }

  const allowedAudiences = env.GOOGLE_CLIENT_IDS
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (!allowedAudiences.length) {
    throw new Error('Google OAuth is not configured on the server');
  }

  // Primary: verify via Google tokeninfo endpoint (fast, robust, automatically validates keys)
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (res.ok) {
      const data = await res.json() as any;
      if (data.email && (data.email_verified === 'true' || data.email_verified === true)) {
        return {
          email: data.email,
          email_verified: true,
          name: data.name,
          picture: data.picture,
          sub: data.sub,
          exp: Number(data.exp),
        };
      }
    }
  } catch (fetchErr) {
    console.warn('[Auth] Google tokeninfo fetch failed, attempting local verification:', fetchErr);
  }

  // Fallback: local RS256 cert verification
  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded || typeof decoded !== 'object' || !decoded.header || decoded.header.alg !== 'RS256' || !decoded.header.kid) {
    throw new Error('Invalid Google ID token');
  }

  const certs = await getGoogleCertificates();
  let signingKey = certs[decoded.header.kid];
  if (!signingKey) {
    googleCertCache = null;
    const refreshedCerts = await getGoogleCertificates();
    signingKey = refreshedCerts[decoded.header.kid];
  }
  if (!signingKey) throw new Error('Unknown Google signing key');

  const payload = jwt.verify(idToken, signingKey, {
    algorithms: ['RS256'],
    audience: allowedAudiences as any,
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
  }) as GoogleIdTokenPayload;

  if (!payload.sub || !payload.email || payload.email_verified !== true) {
    throw new Error('Google account email is not verified');
  }

  if (!payload.exp || payload.exp * 1000 <= Date.now()) {
    throw new Error('Google ID token has expired');
  }

  return payload;
}

async function verifyGoogleAccessToken(accessToken: string): Promise<GoogleIdTokenPayload> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken.trim()}` },
  });
  if (!res.ok) {
    throw new Error(`Google userinfo returned HTTP ${res.status}`);
  }
  const data = (await res.json()) as any;
  if (!data.email) {
    throw new Error('Google user profile does not contain an email address');
  }
  return {
    email: data.email,
    email_verified: data.email_verified === true || data.email_verified === 'true',
    name: data.name || data.given_name || '',
    picture: data.picture || '',
    sub: data.sub,
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
}

export async function googleAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { idToken, accessToken } = req.body;
    const token = idToken || accessToken;

    if (!token || typeof token !== 'string') {
      res.status(400).json({
        success: false,
        error: { message: 'Google authentication token (idToken or accessToken) is required', code: 'VALIDATION_ERROR' },
      });
      return;
    }

    let payload: GoogleIdTokenPayload | null = null;
    let lastError: string = '';

    // 1. If accessToken provided or token starts with 'ya29.', verify with Google userinfo
    if (accessToken || token.startsWith('ya29.')) {
      try {
        payload = await verifyGoogleAccessToken(accessToken || token);
      } catch (accessErr: any) {
        lastError = accessErr?.message || 'Access token verification failed';
        console.warn('[Auth] Google accessToken verification failed:', lastError);
      }
    }

    // 2. If payload not yet resolved and idToken provided, verify with ID token flow
    if (!payload && idToken && !idToken.startsWith('ya29.')) {
      try {
        payload = await verifyGoogleIdToken(idToken.trim());
      } catch (idErr: any) {
        lastError = idErr?.message || 'ID token verification failed';
        console.warn('[Auth] Google ID token verification failed:', lastError);
      }
    }

    // 3. Fallback: try userinfo with any token provided
    if (!payload) {
      try {
        payload = await verifyGoogleAccessToken(token);
      } catch (fbErr: any) {
        lastError = fbErr?.message || lastError;
      }
    }

    if (!payload || !payload.email) {
      res.status(401).json({
        success: false,
        error: { message: 'Invalid or expired Google authentication token', code: 'INVALID_GOOGLE_TOKEN', details: lastError },
      });
      return;
    }

    const normalizedEmail = payload.email.trim().toLowerCase();

    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      const role: 'admin' | 'customer' =
        env.ADMIN_EMAIL && normalizedEmail === env.ADMIN_EMAIL.toLowerCase() ? 'admin' : 'customer';

      user = await User.create({
        email: normalizedEmail,
        full_name: payload.name?.trim() || '',
        avatar_url: payload.picture || '',
        role,
        password: crypto.randomBytes(32).toString('hex'),
        is_email_verified: true,
      });
    } else {
      user.is_email_verified = true;
      let changed = false;
      if (!user.full_name && payload.name) {
        user.full_name = payload.name.trim();
        changed = true;
      }
      if (!user.avatar_url && payload.picture) {
        user.avatar_url = payload.picture;
        changed = true;
      }
      await user.save();
    }

    const authToken = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      message: 'Signed in with Google successfully',
      data: {
        token: authToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          phone: user.phone,
          address: user.address,
          city: user.city,
          state: user.state,
          pincode: user.pincode,
          bio: user.bio,
          profile_completed: user.profile_completed ?? Boolean(user.full_name && user.phone),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}


export async function makeAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, error: { message: 'Email is required' } });
      return;
    }

    const user = await User.findOneAndUpdate(
      { email: email.trim().toLowerCase() },
      { role: 'admin' },
      { new: true }
    );

    if (!user) {
      res.status(404).json({ success: false, error: { message: 'User not found' } });
      return;
    }

    res.json({ success: true, message: `User ${email} promoted to admin`, data: user });
  } catch (err) {
    next(err);
  }
}

/**
 * 1. Request Password Reset Verification Link
 * Generates single-use token, saves SHA-256 hash to user, and dispatches email
 */
export async function requestPasswordReset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, redirectUrl } = req.body;

    if (!email || typeof email !== 'string') {
      res.status(400).json({
        success: false,
        error: { message: 'Valid email address is required', code: 'VALIDATION_ERROR' },
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      // Return ambiguous success to protect against email enumeration
      res.json({
        success: true,
        message: 'If an account exists with this email, a verification link has been sent.',
      });
      return;
    }

    // Generate 32-byte cryptographically secure token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    // 30-minute expiration
    user.reset_password_token = hashedToken;
    user.reset_password_expires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    // Determine target frontend base URL
    const origin =
      redirectUrl ||
      process.env.FRONTEND_URL ||
      process.env.APP_URL ||
      req.get('origin') ||
      req.get('referer')?.replace(/\/$/, '') ||
      'http://localhost:8081';

    const cleanOrigin = origin.split('#')[0].replace(/\/$/, '');
    const resetUrl = `${cleanOrigin}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    // Dispatch verification email
    const emailPromise = sendPasswordResetEmail({
      email: user.email,
      name: user.full_name,
      token: rawToken,
      resetUrl,
    }).catch((err) => {
      console.error('[Email Error] Failed to send password reset email:', err);
      return { success: false, simulated: false };
    });

    // Wait up to 2.5s for fast delivery or simulated mode; otherwise continue sending in background
    let emailResult: any = { success: true, simulated: false };
    try {
      emailResult = await Promise.race([
        emailPromise,
        new Promise((resolve) => setTimeout(() => resolve({ success: true, simulated: false, pending: true }), 2500)),
      ]);
    } catch {
      // SMTP continuing in background
    }

    res.json({
      success: true,
      message: 'Password verification link has been sent to your email address.',
      data: {
        email: user.email,
        expiresInMinutes: 30,
        // In local development, provide the direct link for rapid testing
        ...(env.NODE_ENV !== 'production' || emailResult?.simulated
          ? { simulated: true, resetUrl, token: rawToken }
          : {}),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 2. Verify Reset Token Validity
 */
export async function verifyResetToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, email } = req.body;

    if (!token || typeof token !== 'string') {
      res.status(400).json({
        success: false,
        error: { message: 'Verification token is required', code: 'INVALID_TOKEN' },
      });
      return;
    }

    const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const query: any = {
      reset_password_token: hashedToken,
      reset_password_expires: { $gt: new Date() },
    };

    if (email && typeof email === 'string') {
      query.email = email.trim().toLowerCase();
    }

    const user = await User.findOne(query);

    if (!user) {
      res.status(400).json({
        success: false,
        error: {
          message: 'The password verification link is invalid or has expired. Please request a new link.',
          code: 'EXPIRED_OR_INVALID_TOKEN',
        },
      });
      return;
    }

    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        email: user.email,
        name: user.full_name,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 3. Set New Password using Verification Token
 */
export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, newPassword, email } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({
        success: false,
        error: { message: 'Token and new password are required', code: 'VALIDATION_ERROR' },
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        error: { message: 'Password must be at least 6 characters long', code: 'VALIDATION_ERROR' },
      });
      return;
    }

    const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const query: any = {
      reset_password_token: hashedToken,
      reset_password_expires: { $gt: new Date() },
    };

    if (email && typeof email === 'string') {
      query.email = email.trim().toLowerCase();
    }

    const user = await User.findOne(query);

    if (!user) {
      res.status(400).json({
        success: false,
        error: {
          message: 'This password verification link is invalid or has expired. Please request a new link.',
          code: 'EXPIRED_OR_INVALID_TOKEN',
        },
      });
      return;
    }

    // Assign new password and clear reset token fields
    user.password = newPassword;
    user.reset_password_token = undefined;
    user.reset_password_expires = undefined;
    await user.save(); // pre-save hook securely hashes the new password

    await notifyUserEvent({
      action: 'account_security_update',
      userId: user.id,
      title: 'Account/security update',
      message: 'Your account password was successfully reset.',
    });

    // Issue session token so user is automatically authenticated
    const authToken = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      message: 'Your password has been changed successfully. You are now logged in.',
      data: {
        token: authToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          full_name: user.full_name,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 4. Direct Password Change (for Signed-in Users)
 */
export async function changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        error: { message: 'Current password and new password are required', code: 'VALIDATION_ERROR' },
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        error: { message: 'New password must be at least 6 characters long', code: 'VALIDATION_ERROR' },
      });
      return;
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      res.status(404).json({ success: false, error: { message: 'User not found', code: 'NOT_FOUND' } });
      return;
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      res.status(400).json({
        success: false,
        error: { message: 'Current password is incorrect', code: 'INVALID_CURRENT_PASSWORD' },
      });
      return;
    }

    user.password = newPassword;
    await user.save();

    await notifyUserEvent({
      action: 'account_security_update',
      userId: user.id,
      title: 'Account/security update',
      message: 'Your account password was successfully updated.',
    });

    res.json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 5. Send 6-Digit Email Verification Code (OTP) for Clean Onboarding
 */
export async function sendAuthOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, intent, password, full_name } = req.body;
    if (!email || typeof email !== 'string') {
      res.status(400).json({ success: false, error: { message: 'Valid email address is required', code: 'VALIDATION_ERROR' } });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    let user = await User.findOne({ email: normalizedEmail }).select('+password +email_verification_code +email_verification_expires');

    // Check if user already exists when attempting to create a new account
    if (intent === 'sign_up') {
      // If user exists and is already verified
      if (user && user.is_email_verified !== false) {
        res.status(409).json({
          success: false,
          error: {
            message: 'An account with this email already exists. Please sign in instead.',
            code: 'EMAIL_ALREADY_EXISTS',
          },
        });
        return;
      }

      // If initial create account or password provided, validate password
      if (!user && (!password || typeof password !== 'string' || password.length < 6)) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Password must be at least 6 characters long',
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      if (password && (typeof password !== 'string' || password.length < 6)) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Password must be at least 6 characters long',
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

      if (user && user.is_email_verified === false) {
        // User already started sign up earlier; update password and send fresh code
        if (password) {
          user.password = password; // Hashed by UserSchema pre-save
        }
        if (full_name) {
          user.full_name = full_name.trim();
        }
        user.email_verification_code = code;
        user.email_verification_expires = expires;
        await user.save();
      } else {
        // Create new unverified user with chosen password
        user = await User.create({
          email: normalizedEmail,
          password,
          full_name: full_name?.trim() || '',
          role: normalizedEmail === env.ADMIN_EMAIL.toLowerCase() ? 'admin' : 'customer',
          profile_completed: false,
          is_email_verified: false,
          email_verification_code: code,
          email_verification_expires: expires,
        });
      }

      await sendEmailVerificationCode({
        email: normalizedEmail,
        name: user.full_name || 'RenewX Member',
        code,
      });

      console.log(`\n=============================================================`);
      console.log(`🔑 [RENEWX AUTH OTP] Code: ${code} for ${normalizedEmail} (${intent})`);
      console.log(`=============================================================\n`);

      res.json({
        success: true,
        message: 'Verification code sent to your email',
        data: {
          email: normalizedEmail,
          expiresInMinutes: 15,
        },
      });
      return;
    }

    // Check if user does not exist when attempting to sign in
    if (intent === 'sign_in' && !user) {
      res.status(404).json({
        success: false,
        error: {
          message: 'No account found with this email. Please create an account instead.',
          code: 'USER_NOT_FOUND',
        },
      });
      return;
    }

    if (!user) {
      user = new User({
        email: normalizedEmail,
        password: crypto.randomBytes(16).toString('hex'),
        role: normalizedEmail === env.ADMIN_EMAIL.toLowerCase() ? 'admin' : 'customer',
        profile_completed: false,
        is_email_verified: false,
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    user.email_verification_code = code;
    user.email_verification_expires = expires;
    await user.save();

    await sendEmailVerificationCode({
      email: normalizedEmail,
      name: user.full_name || 'RenewX Member',
      code,
    });

    console.log(`\n=============================================================`);
    console.log(`🔑 [RENEWX AUTH OTP] Code: ${code} for ${normalizedEmail}`);
    console.log(`=============================================================\n`);

    res.json({
      success: true,
      message: 'Verification code sent to your email',
      data: {
        email: normalizedEmail,
        expiresInMinutes: 15,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 6. Verify 6-Digit Email Verification Code (OTP) & Log In / Sign Up
 */
export async function verifyAuthOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      res.status(400).json({ success: false, error: { message: 'Email and verification code are required', code: 'VALIDATION_ERROR' } });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanCode = code.toString().trim();

    const user = await User.findOne({ email: normalizedEmail }).select('+email_verification_code +email_verification_expires');
    if (!user) {
      res.status(404).json({ success: false, error: { message: 'Account not found. Please request a new code.', code: 'USER_NOT_FOUND' } });
      return;
    }

    const isCodeValid = user.email_verification_code === cleanCode;
    const isNotExpired = user.email_verification_expires && user.email_verification_expires.getTime() > Date.now();

    if (!isCodeValid || !isNotExpired) {
      res.status(400).json({ success: false, error: { message: 'Invalid or expired verification code', code: 'INVALID_CODE' } });
      return;
    }

    user.is_email_verified = true;
    user.email_verification_code = undefined;
    user.email_verification_expires = undefined;
    await user.save();

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      message: 'Email verified successfully',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          phone: user.phone,
          address: user.address,
          city: user.city,
          state: user.state,
          pincode: user.pincode,
          bio: user.bio,
          profile_completed: user.profile_completed ?? Boolean(user.full_name && user.phone),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

