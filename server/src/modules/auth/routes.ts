import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../../config/database';
import { env } from '../../config/env';
import { authenticate, authorize } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

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

export default router;
