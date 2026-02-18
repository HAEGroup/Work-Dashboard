import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../config/database';
import { authenticate } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { fetchEmails, sendEmail } from './service';

const router = Router();

// ============================================================
// EMAIL ACCOUNTS
// ============================================================

const emailAccountSchema = z.object({
  label: z.string().min(1),
  emailAddress: z.string().email(),
  imapHost: z.string().min(1),
  imapPort: z.number().default(993),
  smtpHost: z.string().min(1),
  smtpPort: z.number().default(587),
  username: z.string().min(1),
  password: z.string().min(1),
});

// GET /api/email/accounts
router.get('/accounts', authenticate, async (req: Request, res: Response) => {
  const accounts = await prisma.emailAccount.findMany({
    where: { userId: req.user!.id },
    select: {
      id: true,
      label: true,
      emailAddress: true,
      imapHost: true,
      imapPort: true,
      smtpHost: true,
      smtpPort: true,
      username: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ accounts });
});

// POST /api/email/accounts
router.post('/accounts', authenticate, async (req: Request, res: Response) => {
  const parsed = emailAccountSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid email account data');

  const account = await prisma.emailAccount.create({
    data: { ...parsed.data, userId: req.user!.id },
    select: { id: true, label: true, emailAddress: true, isActive: true },
  });

  res.status(201).json({ account });
});

// DELETE /api/email/accounts/:id
router.delete('/accounts/:id', authenticate, async (req: Request, res: Response) => {
  const account = await prisma.emailAccount.findFirst({
    where: { id: req.params.id as string, userId: req.user!.id },
  });
  if (!account) throw new AppError(404, 'Email account not found');

  await prisma.emailAccount.delete({ where: { id: req.params.id as string } });
  res.json({ message: 'Email account deleted' });
});

// ============================================================
// MESSAGES
// ============================================================

// POST /api/email/accounts/:id/sync
router.post('/accounts/:id/sync', authenticate, async (req: Request, res: Response) => {
  const account = await prisma.emailAccount.findFirst({
    where: { id: req.params.id as string, userId: req.user!.id },
  });
  if (!account) throw new AppError(404, 'Email account not found');

  const count = await fetchEmails(account);
  res.json({ message: `Synced ${count} new messages` });
});

// GET /api/email/accounts/:id/messages?folder=...&page=...
router.get('/accounts/:id/messages', authenticate, async (req: Request, res: Response) => {
  const { folder = 'INBOX', page = '1', limit = '50', search } = req.query;

  const account = await prisma.emailAccount.findFirst({
    where: { id: req.params.id as string, userId: req.user!.id },
  });
  if (!account) throw new AppError(404, 'Email account not found');

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const where: Record<string, unknown> = {
    accountId: req.params.id as string,
    folder: folder as string,
  };

  if (search) {
    where.OR = [
      { subject: { contains: search as string, mode: 'insensitive' } },
      { fromAddress: { contains: search as string, mode: 'insensitive' } },
      { fromName: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const [messages, total] = await Promise.all([
    prisma.emailMessage.findMany({
      where,
      select: {
        id: true,
        messageId: true,
        folder: true,
        fromAddress: true,
        fromName: true,
        toAddresses: true,
        subject: true,
        isRead: true,
        isStarred: true,
        hasAttachments: true,
        date: true,
      },
      orderBy: { date: 'desc' },
      skip,
      take: parseInt(limit as string),
    }),
    prisma.emailMessage.count({ where }),
  ]);

  res.json({ messages, total, page: parseInt(page as string), limit: parseInt(limit as string) });
});

// GET /api/email/messages/:id
router.get('/messages/:id', authenticate, async (req: Request, res: Response) => {
  const message = await prisma.emailMessage.findUnique({
    where: { id: req.params.id as string },
    include: {
      attachments: { select: { id: true, filename: true, mimeType: true, size: true } },
      account: { select: { userId: true } },
    },
  });

  if (!message || message.account.userId !== req.user!.id) {
    throw new AppError(404, 'Message not found');
  }

  // Mark as read
  if (!message.isRead) {
    await prisma.emailMessage.update({
      where: { id: req.params.id as string },
      data: { isRead: true },
    });
  }

  res.json({ message });
});

// PATCH /api/email/messages/:id (star/unstar, read/unread)
router.patch('/messages/:id', authenticate, async (req: Request, res: Response) => {
  const { isRead, isStarred } = req.body;

  const message = await prisma.emailMessage.findUnique({
    where: { id: req.params.id as string },
    include: { account: { select: { userId: true } } },
  });
  if (!message || message.account.userId !== req.user!.id) {
    throw new AppError(404, 'Message not found');
  }

  const data: Record<string, boolean> = {};
  if (typeof isRead === 'boolean') data.isRead = isRead;
  if (typeof isStarred === 'boolean') data.isStarred = isStarred;

  const updated = await prisma.emailMessage.update({
    where: { id: req.params.id as string },
    data,
  });

  res.json({ message: updated });
});

// POST /api/email/send
const sendEmailSchema = z.object({
  accountId: z.string().uuid(),
  to: z.array(z.string().email()),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  subject: z.string(),
  body: z.string(),
  isHtml: z.boolean().default(false),
});

router.post('/send', authenticate, async (req: Request, res: Response) => {
  const parsed = sendEmailSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid email data');

  const account = await prisma.emailAccount.findFirst({
    where: { id: parsed.data.accountId, userId: req.user!.id },
  });
  if (!account) throw new AppError(404, 'Email account not found');

  await sendEmail(account, parsed.data);
  res.json({ message: 'Email sent successfully' });
});

export default router;
