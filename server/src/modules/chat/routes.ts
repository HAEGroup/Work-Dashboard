import { Router, Request, Response } from 'express';
import prisma from '../../config/database';
import { env } from '../../config/env';
import { authenticate } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import {
  getGoogleChatAuthUrl,
  handleGoogleChatCallback,
  listSpaces,
  getSpaceMembers,
  listMessages,
  sendMessage,
  disconnectChat,
} from './google-chat';

const router = Router();

// ============================================================
// GOOGLE CHAT OAUTH
// ============================================================

// GET /api/chat/google/auth-url
router.get('/google/auth-url', authenticate, (req: Request, res: Response) => {
  const url = getGoogleChatAuthUrl(req.user!.id);
  res.json({ url });
});

// GET /api/chat/google/callback
router.get('/google/callback', async (req: Request, res: Response) => {
  const { code, state } = req.query;
  if (!code || !state) throw new AppError(400, 'Missing code or state');

  await handleGoogleChatCallback(state as string, code as string);
  res.redirect('/chat?google=connected');
});

// GET /api/chat/google/status
router.get('/google/status', authenticate, async (req: Request, res: Response) => {
  const configured = !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  const sync = await prisma.googleChatSync.findUnique({
    where: { userId: req.user!.id },
  });
  res.json({ configured, connected: !!sync });
});

// POST /api/chat/google/disconnect
router.post('/google/disconnect', authenticate, async (req: Request, res: Response) => {
  await disconnectChat(req.user!.id);
  res.json({ message: 'Disconnected from Google Chat' });
});

// ============================================================
// SPACES & MESSAGES (requires auth + Google Chat connected)
// ============================================================

// GET /api/chat/spaces
router.get('/spaces', authenticate, async (req: Request, res: Response) => {
  const spaces = await listSpaces(req.user!.id);
  res.json({ spaces });
});

// GET /api/chat/spaces/:spaceId/members
router.get('/spaces/:spaceId/members', authenticate, async (req: Request, res: Response) => {
  const spaceName = `spaces/${req.params.spaceId as string}`;
  const members = await getSpaceMembers(req.user!.id, spaceName);
  res.json({ members });
});

// GET /api/chat/spaces/:spaceId/messages
router.get('/spaces/:spaceId/messages', authenticate, async (req: Request, res: Response) => {
  const spaceName = `spaces/${req.params.spaceId as string}`;
  const pageSize = parseInt(req.query.pageSize as string) || 25;
  const pageToken = req.query.pageToken as string | undefined;

  const result = await listMessages(req.user!.id, spaceName, pageSize, pageToken);
  res.json(result);
});

// POST /api/chat/spaces/:spaceId/messages
router.post('/spaces/:spaceId/messages', authenticate, async (req: Request, res: Response) => {
  const spaceName = `spaces/${req.params.spaceId as string}`;
  const { text } = req.body;
  if (!text || typeof text !== 'string') throw new AppError(400, 'Message text is required');

  const message = await sendMessage(req.user!.id, spaceName, text);
  res.status(201).json({ message });
});

export default router;
