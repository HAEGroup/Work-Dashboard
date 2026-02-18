import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../config/database';
import { authenticate } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { getGoogleAuthUrl, handleGoogleCallback, syncGoogleCalendar } from './google';

const router = Router();

const eventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  startTime: z.string().transform(s => new Date(s)),
  endTime: z.string().transform(s => new Date(s)),
  allDay: z.boolean().default(false),
  recurrenceRule: z.string().optional(),
  color: z.string().optional(),
});

// GET /api/calendar/events?from=...&to=...
router.get('/events', authenticate, async (req: Request, res: Response) => {
  const { from, to } = req.query;

  const where: Record<string, unknown> = { userId: req.user!.id };
  if (from || to) {
    if (from) where.startTime = { ...(where.startTime as object || {}), gte: new Date(from as string) };
    if (to) where.endTime = { ...(where.endTime as object || {}), lte: new Date(to as string) };
  }

  const events = await prisma.calendarEvent.findMany({
    where,
    orderBy: { startTime: 'asc' },
  });

  res.json({ events });
});

// POST /api/calendar/events
router.post('/events', authenticate, async (req: Request, res: Response) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid event data');

  const event = await prisma.calendarEvent.create({
    data: { ...parsed.data, userId: req.user!.id },
  });

  res.status(201).json({ event });
});

// PATCH /api/calendar/events/:id
router.patch('/events/:id', authenticate, async (req: Request, res: Response) => {
  const parsed = eventSchema.partial().safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid event data');

  const existing = await prisma.calendarEvent.findFirst({
    where: { id: req.params.id as string, userId: req.user!.id },
  });
  if (!existing) throw new AppError(404, 'Event not found');

  const event = await prisma.calendarEvent.update({
    where: { id: req.params.id as string },
    data: parsed.data,
  });

  res.json({ event });
});

// DELETE /api/calendar/events/:id
router.delete('/events/:id', authenticate, async (req: Request, res: Response) => {
  const existing = await prisma.calendarEvent.findFirst({
    where: { id: req.params.id as string, userId: req.user!.id },
  });
  if (!existing) throw new AppError(404, 'Event not found');

  await prisma.calendarEvent.delete({ where: { id: req.params.id as string } });
  res.json({ message: 'Event deleted' });
});

// ============================================================
// GOOGLE CALENDAR SYNC
// ============================================================

// GET /api/calendar/google/auth-url
router.get('/google/auth-url', authenticate, (req: Request, res: Response) => {
  const url = getGoogleAuthUrl(req.user!.id);
  res.json({ url });
});

// GET /api/calendar/google/callback
router.get('/google/callback', async (req: Request, res: Response) => {
  const { code, state } = req.query;
  if (!code || !state) throw new AppError(400, 'Missing code or state');

  await handleGoogleCallback(state as string, code as string);
  // Redirect back to the app
  res.redirect('/calendar?google=connected');
});

// POST /api/calendar/google/sync
router.post('/google/sync', authenticate, async (req: Request, res: Response) => {
  const count = await syncGoogleCalendar(req.user!.id);
  res.json({ message: `Synced ${count} events` });
});

// GET /api/calendar/google/status
router.get('/google/status', authenticate, async (req: Request, res: Response) => {
  const { env: appEnv } = await import('../../config/env');
  const configured = !!(appEnv.GOOGLE_CLIENT_ID && appEnv.GOOGLE_CLIENT_SECRET);

  const sync = await prisma.googleCalendarSync.findUnique({
    where: { userId: req.user!.id },
    select: { calendarId: true, lastSyncAt: true },
  });
  res.json({ configured, connected: !!sync, sync });
});

export default router;
