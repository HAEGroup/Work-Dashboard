import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../../config/database';
import { authenticate, authorize } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

// ============================================================
// ENTITIES
// ============================================================

const entitySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

// GET /api/accounting/entities
router.get('/entities', authenticate, async (_req: Request, res: Response) => {
  const entities = await prisma.entity.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
  res.json({ entities });
});

// POST /api/accounting/entities
router.post('/entities', authenticate, authorize('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  const parsed = entitySchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid entity data');

  const entity = await prisma.entity.create({ data: parsed.data });
  res.status(201).json({ entity });
});

// PATCH /api/accounting/entities/:id
router.patch('/entities/:id', authenticate, authorize('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  const parsed = entitySchema.partial().safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid entity data');

  const entity = await prisma.entity.update({
    where: { id: req.params.id as string },
    data: parsed.data,
  });
  res.json({ entity });
});

// ============================================================
// CHART OF ACCOUNTS
// ============================================================

const accountSchema = z.object({
  entityId: z.string().uuid(),
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']),
  parentId: z.string().uuid().optional().nullable(),
  description: z.string().optional(),
});

// GET /api/accounting/accounts?entityId=...
router.get('/accounts', authenticate, async (req: Request, res: Response) => {
  const { entityId } = req.query;
  const accounts = await prisma.account.findMany({
    where: {
      ...(entityId ? { entityId: entityId as string } : {}),
      isActive: true,
    },
    include: { children: true },
    orderBy: { code: 'asc' },
  });
  res.json({ accounts });
});

// POST /api/accounting/accounts
router.post('/accounts', authenticate, authorize('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  const parsed = accountSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid account data');

  const account = await prisma.account.create({ data: parsed.data });
  res.status(201).json({ account });
});

// PATCH /api/accounting/accounts/:id
router.patch('/accounts/:id', authenticate, authorize('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  const parsed = accountSchema.partial().safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid account data');

  const account = await prisma.account.update({
    where: { id: req.params.id as string },
    data: parsed.data,
  });
  res.json({ account });
});

// ============================================================
// JOURNAL ENTRIES
// ============================================================

const journalLineSchema = z.object({
  accountId: z.string().uuid(),
  debit: z.number().min(0).default(0),
  credit: z.number().min(0).default(0),
  description: z.string().optional(),
});

const journalEntrySchema = z.object({
  entityId: z.string().uuid(),
  date: z.string().transform(s => new Date(s)),
  reference: z.string().optional(),
  description: z.string().min(1),
  lines: z.array(journalLineSchema).min(2),
});

// GET /api/accounting/journal-entries?entityId=...&from=...&to=...
router.get('/journal-entries', authenticate, async (req: Request, res: Response) => {
  const { entityId, from, to, page = '1', limit = '50' } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const where: Record<string, unknown> = {};
  if (entityId) where.entityId = entityId;
  if (from || to) {
    where.date = {};
    if (from) (where.date as Record<string, unknown>).gte = new Date(from as string);
    if (to) (where.date as Record<string, unknown>).lte = new Date(to as string);
  }

  const [entries, total] = await Promise.all([
    prisma.journalEntry.findMany({
      where,
      include: {
        lines: { include: { account: { select: { code: true, name: true, type: true } } } },
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { date: 'desc' },
      skip,
      take: parseInt(limit as string),
    }),
    prisma.journalEntry.count({ where }),
  ]);

  res.json({ entries, total, page: parseInt(page as string), limit: parseInt(limit as string) });
});

// POST /api/accounting/journal-entries
router.post('/journal-entries', authenticate, authorize('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  const parsed = journalEntrySchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid journal entry data');

  const { lines, ...entryData } = parsed.data;

  // Validate debits = credits
  const totalDebits = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredits = lines.reduce((sum, l) => sum + l.credit, 0);
  if (Math.abs(totalDebits - totalCredits) > 0.001) {
    throw new AppError(400, `Debits ($${totalDebits.toFixed(2)}) must equal credits ($${totalCredits.toFixed(2)})`);
  }

  // Each line must have either a debit or credit, not both
  for (const line of lines) {
    if (line.debit > 0 && line.credit > 0) {
      throw new AppError(400, 'A journal line cannot have both debit and credit');
    }
    if (line.debit === 0 && line.credit === 0) {
      throw new AppError(400, 'A journal line must have either a debit or credit amount');
    }
  }

  const entry = await prisma.journalEntry.create({
    data: {
      ...entryData,
      userId: req.user!.id,
      lines: {
        create: lines.map(l => ({
          accountId: l.accountId,
          debit: new Decimal(l.debit),
          credit: new Decimal(l.credit),
          description: l.description,
        })),
      },
    },
    include: {
      lines: { include: { account: { select: { code: true, name: true, type: true } } } },
    },
  });

  res.status(201).json({ entry });
});

// POST /api/accounting/journal-entries/:id/post
router.post('/journal-entries/:id/post', authenticate, authorize('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  const entry = await prisma.journalEntry.update({
    where: { id: req.params.id as string },
    data: { isPosted: true },
  });
  res.json({ entry });
});

// DELETE /api/accounting/journal-entries/:id (only unposted)
router.delete('/journal-entries/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const entry = await prisma.journalEntry.findUnique({ where: { id: req.params.id as string } });
  if (!entry) throw new AppError(404, 'Journal entry not found');
  if (entry.isPosted) throw new AppError(400, 'Cannot delete a posted journal entry');

  await prisma.journalEntry.delete({ where: { id: req.params.id as string } });
  res.json({ message: 'Journal entry deleted' });
});

// ============================================================
// REPORTS
// ============================================================

// GET /api/accounting/reports/trial-balance?entityId=...&asOf=...
router.get('/reports/trial-balance', authenticate, async (req: Request, res: Response) => {
  const { entityId, asOf } = req.query;
  if (!entityId) throw new AppError(400, 'entityId is required');

  const dateFilter = asOf ? { lte: new Date(asOf as string) } : undefined;

  const accounts = await prisma.account.findMany({
    where: { entityId: entityId as string, isActive: true },
    include: {
      lines: {
        where: {
          journalEntry: {
            isPosted: true,
            ...(dateFilter ? { date: dateFilter } : {}),
          },
        },
      },
    },
    orderBy: { code: 'asc' },
  });

  const trialBalance = accounts.map(account => {
    const totalDebit = account.lines.reduce((sum, l) => sum + Number(l.debit), 0);
    const totalCredit = account.lines.reduce((sum, l) => sum + Number(l.credit), 0);
    return {
      accountId: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      debit: totalDebit,
      credit: totalCredit,
      balance: totalDebit - totalCredit,
    };
  }).filter(a => a.debit !== 0 || a.credit !== 0);

  res.json({ trialBalance, asOf: asOf || new Date().toISOString() });
});

// GET /api/accounting/reports/balance-sheet?entityId=...&asOf=...
router.get('/reports/balance-sheet', authenticate, async (req: Request, res: Response) => {
  const { entityId, asOf } = req.query;
  if (!entityId) throw new AppError(400, 'entityId is required');

  const dateFilter = asOf ? { lte: new Date(asOf as string) } : undefined;

  const accounts = await prisma.account.findMany({
    where: {
      entityId: entityId as string,
      isActive: true,
      type: { in: ['ASSET', 'LIABILITY', 'EQUITY'] },
    },
    include: {
      lines: {
        where: {
          journalEntry: {
            isPosted: true,
            ...(dateFilter ? { date: dateFilter } : {}),
          },
        },
      },
    },
    orderBy: { code: 'asc' },
  });

  const sections: Record<string, Array<{ code: string; name: string; balance: number }>> = {
    ASSET: [],
    LIABILITY: [],
    EQUITY: [],
  };

  for (const account of accounts) {
    const totalDebit = account.lines.reduce((sum, l) => sum + Number(l.debit), 0);
    const totalCredit = account.lines.reduce((sum, l) => sum + Number(l.credit), 0);
    // Assets: debit normal. Liabilities/Equity: credit normal.
    const balance = account.type === 'ASSET'
      ? totalDebit - totalCredit
      : totalCredit - totalDebit;

    if (balance !== 0) {
      sections[account.type].push({ code: account.code, name: account.name, balance });
    }
  }

  const totalAssets = sections.ASSET.reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = sections.LIABILITY.reduce((s, a) => s + a.balance, 0);
  const totalEquity = sections.EQUITY.reduce((s, a) => s + a.balance, 0);

  res.json({
    assets: { accounts: sections.ASSET, total: totalAssets },
    liabilities: { accounts: sections.LIABILITY, total: totalLiabilities },
    equity: { accounts: sections.EQUITY, total: totalEquity },
    balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
    asOf: asOf || new Date().toISOString(),
  });
});

// GET /api/accounting/reports/income-statement?entityId=...&from=...&to=...
router.get('/reports/income-statement', authenticate, async (req: Request, res: Response) => {
  const { entityId, from, to } = req.query;
  if (!entityId) throw new AppError(400, 'entityId is required');

  const dateWhere: Record<string, unknown> = {};
  if (from) dateWhere.gte = new Date(from as string);
  if (to) dateWhere.lte = new Date(to as string);

  const accounts = await prisma.account.findMany({
    where: {
      entityId: entityId as string,
      isActive: true,
      type: { in: ['REVENUE', 'EXPENSE'] },
    },
    include: {
      lines: {
        where: {
          journalEntry: {
            isPosted: true,
            ...(Object.keys(dateWhere).length > 0 ? { date: dateWhere } : {}),
          },
        },
      },
    },
    orderBy: { code: 'asc' },
  });

  const revenue: Array<{ code: string; name: string; amount: number }> = [];
  const expenses: Array<{ code: string; name: string; amount: number }> = [];

  for (const account of accounts) {
    const totalDebit = account.lines.reduce((sum, l) => sum + Number(l.debit), 0);
    const totalCredit = account.lines.reduce((sum, l) => sum + Number(l.credit), 0);
    const amount = account.type === 'REVENUE'
      ? totalCredit - totalDebit
      : totalDebit - totalCredit;

    if (amount !== 0) {
      const entry = { code: account.code, name: account.name, amount };
      if (account.type === 'REVENUE') revenue.push(entry);
      else expenses.push(entry);
    }
  }

  const totalRevenue = revenue.reduce((s, a) => s + a.amount, 0);
  const totalExpenses = expenses.reduce((s, a) => s + a.amount, 0);

  res.json({
    revenue: { accounts: revenue, total: totalRevenue },
    expenses: { accounts: expenses, total: totalExpenses },
    netIncome: totalRevenue - totalExpenses,
    from: from || null,
    to: to || null,
  });
});

export default router;
