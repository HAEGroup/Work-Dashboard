import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import prisma from '../../config/database';
import { env } from '../../config/env';
import { authenticate, authorize } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

async function getSmtpTransporter() {
  // Try database config first, fall back to env vars
  const dbConfig = await prisma.smtpConfig.findFirst({ where: { isActive: true } });

  const host = dbConfig?.host || env.SMTP_HOST;
  const port = dbConfig?.port || env.SMTP_PORT;
  const user = dbConfig?.username || env.SMTP_USER;
  const pass = dbConfig?.password || env.SMTP_PASS;
  const from = dbConfig?.fromEmail || env.SMTP_FROM;

  if (!host || !user || !pass) return null;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return { transporter, from };
}

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['ADMIN', 'MANAGER', 'VIEWER']).optional(),
});

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'VIEWER']).optional(),
  isActive: z.boolean().optional(),
});

function generateToken(userId: string): string {
  return jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as SignOptions);
}

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, 'Invalid email or password format');
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    throw new AppError(401, 'Invalid credentials');
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new AppError(401, 'Invalid credentials');
  }

  const token = generateToken(user.id);

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
  });
});

// GET /api/auth/me
router.get('/me', authenticate, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

// POST /api/auth/register (admin only, or first user)
router.post('/register', async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, 'Invalid registration data');
  }

  const userCount = await prisma.user.count();
  const isFirstUser = userCount === 0;

  // Only admins can create users after the first one
  if (!isFirstUser) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(401, 'Authentication required');
    }
    const token = authHeader.substring(7);
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string };
      const requestingUser = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (!requestingUser || requestingUser.role !== 'ADMIN') {
        throw new AppError(403, 'Only admins can create users');
      }
    } catch {
      throw new AppError(401, 'Invalid token');
    }
  }

  const { email, password, firstName, lastName, role } = parsed.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError(409, 'Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      role: isFirstUser ? 'ADMIN' : (role || 'VIEWER'),
    },
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
  });

  const token = generateToken(user.id);
  res.status(201).json({ token, user });
});

// GET /api/auth/users (admin only)
router.get('/users', authenticate, authorize('ADMIN'), async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ users });
});

// PATCH /api/auth/users/:id (admin only)
router.patch('/users/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, 'Invalid update data');
  }

  const user = await prisma.user.update({
    where: { id: req.params.id as string },
    data: parsed.data,
    select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
  });

  res.json({ user });
});

// POST /api/auth/users/:id/reset-password (admin only)
router.post('/users/:id/reset-password', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const schema = z.object({ password: z.string().min(8) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, 'Password must be at least 8 characters');
  }

  const targetUser = await prisma.user.findUnique({ where: { id: req.params.id as string } });
  if (!targetUser) throw new AppError(404, 'User not found');

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.update({
    where: { id: req.params.id as string },
    data: { passwordHash },
  });

  res.json({ message: 'Password reset successfully' });
});

// POST /api/auth/change-password (authenticated user)
router.post('/change-password', authenticate, async (req: Request, res: Response) => {
  const schema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, 'New password must be at least 8 characters');
  }

  const userRecord = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!userRecord) throw new AppError(404, 'User not found');

  const isValid = await bcrypt.compare(parsed.data.currentPassword, userRecord.passwordHash);
  if (!isValid) {
    throw new AppError(401, 'Current password is incorrect');
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({
    where: { id: req.user!.id },
    data: { passwordHash },
  });

  res.json({ message: 'Password changed successfully' });
});

// POST /api/auth/users/:id/generate-reset-link (admin only)
router.post('/users/:id/generate-reset-link', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const targetUser = await prisma.user.findUnique({ where: { id: req.params.id as string } });
  if (!targetUser) throw new AppError(404, 'User not found');

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.passwordResetToken.create({
    data: { userId: targetUser.id, token, expiresAt },
  });

  res.json({ token, expiresAt: expiresAt.toISOString() });
});

// POST /api/auth/reset-password-with-token (public)
router.post('/reset-password-with-token', async (req: Request, res: Response) => {
  const schema = z.object({
    token: z.string().min(1),
    password: z.string().min(8),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid request data');

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token: parsed.data.token },
  });

  if (!resetToken) throw new AppError(400, 'Invalid or expired reset link');
  if (resetToken.usedAt) throw new AppError(400, 'This reset link has already been used');
  if (resetToken.expiresAt < new Date()) throw new AppError(400, 'This reset link has expired');

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  res.json({ message: 'Password reset successfully' });
});

// POST /api/auth/forgot-password (public)
router.post('/forgot-password', async (req: Request, res: Response) => {
  const schema = z.object({ email: z.string().email() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Please enter a valid email address');

  const smtp = await getSmtpTransporter();
  if (!smtp) {
    res.json({ message: 'smtpNotConfigured' });
    return;
  }

  // Always return success to prevent email enumeration
  const successMsg = 'If an account exists with that email, a password reset link has been sent.';

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !user.isActive) {
    res.json({ message: successMsg });
    return;
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  });

  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${token}`;

  await smtp.transporter.sendMail({
    from: smtp.from,
    to: user.email,
    subject: 'Password Reset - Work Dashboard',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1e40af;">Password Reset</h2>
        <p>Hi ${user.firstName},</p>
        <p>We received a request to reset your Work Dashboard password. Click the button below to set a new password:</p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Reset Password
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">This link expires in 24 hours. If you didn't request this, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px;">Work Dashboard</p>
      </div>
    `,
  });

  res.json({ message: successMsg });
});

// GET /api/auth/smtp-config (admin only)
router.get('/smtp-config', authenticate, authorize('ADMIN'), async (_req: Request, res: Response) => {
  const config = await prisma.smtpConfig.findFirst({ where: { isActive: true } });
  if (config) {
    res.json({
      config: {
        id: config.id,
        host: config.host,
        port: config.port,
        username: config.username,
        fromEmail: config.fromEmail,
        isActive: config.isActive,
      },
    });
  } else {
    // Return env-based config if set
    if (env.SMTP_HOST) {
      res.json({
        config: {
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          username: env.SMTP_USER,
          fromEmail: env.SMTP_FROM,
          isActive: true,
          source: 'env',
        },
      });
    } else {
      res.json({ config: null });
    }
  }
});

// POST /api/auth/smtp-config (admin only)
const smtpConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().default(587),
  username: z.string().min(1),
  password: z.string().min(1),
  fromEmail: z.string().email(),
});

router.post('/smtp-config', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const parsed = smtpConfigSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid SMTP configuration');

  // Deactivate any existing config
  await prisma.smtpConfig.updateMany({ where: { isActive: true }, data: { isActive: false } });

  const config = await prisma.smtpConfig.create({
    data: parsed.data,
  });

  res.json({
    config: {
      id: config.id,
      host: config.host,
      port: config.port,
      username: config.username,
      fromEmail: config.fromEmail,
      isActive: config.isActive,
    },
  });
});

// POST /api/auth/smtp-config/test (admin only)
router.post('/smtp-config/test', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const smtp = await getSmtpTransporter();
  if (!smtp) throw new AppError(400, 'SMTP is not configured');

  try {
    await smtp.transporter.verify();
    res.json({ message: 'SMTP connection successful' });
  } catch (err: any) {
    throw new AppError(400, `SMTP connection failed: ${err.message}`);
  }
});

export default router;
