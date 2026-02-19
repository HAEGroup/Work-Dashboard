import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { authenticate, AuthRequest } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

const createStatementSchema = z.object({
  name: z.string().min(1).default('Personal Financial Statement'),
  asOfDate: z.string().transform(s => new Date(s)),
  notes: z.string().optional(),
  fullName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  phone: z.string().optional(),
  employer: z.string().optional(),
  jobTitle: z.string().optional(),
  annualSalary: z.number().optional(),
  otherIncome: z.number().optional(),
  otherIncomeDesc: z.string().optional(),
});

const updateStatementSchema = createStatementSchema.partial();

// GET /api/statements - list all statements for the user
router.get('/', async (req: AuthRequest, res: Response) => {
  const statements = await prisma.statement.findMany({
    where: { userId: req.userId },
    orderBy: { asOfDate: 'desc' },
    include: {
      _count: { select: { assets: true, liabilities: true } },
    },
  });

  // Calculate totals for each statement
  const statementsWithTotals = await Promise.all(
    statements.map(async (stmt) => {
      const [assetTotal, liabilityTotal] = await Promise.all([
        prisma.asset.aggregate({
          where: { statementId: stmt.id },
          _sum: { value: true },
        }),
        prisma.liability.aggregate({
          where: { statementId: stmt.id },
          _sum: { balance: true },
        }),
      ]);

      return {
        ...stmt,
        totalAssets: assetTotal._sum.value || 0,
        totalLiabilities: liabilityTotal._sum.balance || 0,
        netWorth:
          Number(assetTotal._sum.value || 0) -
          Number(liabilityTotal._sum.balance || 0),
      };
    })
  );

  res.json({ statements: statementsWithTotals });
});

// GET /api/statements/:id - get a single statement with all details
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const statement = await prisma.statement.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: {
      assets: { orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] },
      liabilities: { orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] },
    },
  });

  if (!statement) {
    res.status(404).json({ error: 'Statement not found' });
    return;
  }

  const totalAssets = statement.assets.reduce(
    (sum, a) => sum + Number(a.value),
    0
  );
  const totalLiabilities = statement.liabilities.reduce(
    (sum, l) => sum + Number(l.balance),
    0
  );

  res.json({
    statement: {
      ...statement,
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
    },
  });
});

// POST /api/statements - create a new statement
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = createStatementSchema.parse(req.body);

    const statement = await prisma.statement.create({
      data: {
        ...data,
        userId: req.userId!,
        annualSalary: data.annualSalary ?? undefined,
        otherIncome: data.otherIncome ?? undefined,
      },
    });

    res.status(201).json({ statement });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// PATCH /api/statements/:id - update a statement
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.statement.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) {
      res.status(404).json({ error: 'Statement not found' });
      return;
    }

    const data = updateStatementSchema.parse(req.body);

    const statement = await prisma.statement.update({
      where: { id: req.params.id },
      data: {
        ...data,
        annualSalary: data.annualSalary ?? undefined,
        otherIncome: data.otherIncome ?? undefined,
      },
    });

    res.json({ statement });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// DELETE /api/statements/:id - delete a statement (cascades to assets/liabilities)
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const existing = await prisma.statement.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) {
    res.status(404).json({ error: 'Statement not found' });
    return;
  }

  await prisma.statement.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// POST /api/statements/:id/duplicate - duplicate a statement to a new date
router.post('/:id/duplicate', async (req: AuthRequest, res: Response) => {
  const { asOfDate } = z.object({ asOfDate: z.string().transform(s => new Date(s)) }).parse(req.body);

  const source = await prisma.statement.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { assets: true, liabilities: true },
  });

  if (!source) {
    res.status(404).json({ error: 'Statement not found' });
    return;
  }

  const newStatement = await prisma.statement.create({
    data: {
      userId: req.userId!,
      name: source.name,
      asOfDate,
      notes: source.notes,
      fullName: source.fullName,
      address: source.address,
      city: source.city,
      state: source.state,
      zip: source.zip,
      phone: source.phone,
      employer: source.employer,
      jobTitle: source.jobTitle,
      annualSalary: source.annualSalary,
      otherIncome: source.otherIncome,
      otherIncomeDesc: source.otherIncomeDesc,
      assets: {
        create: source.assets.map(a => ({
          category: a.category,
          description: a.description,
          value: a.value,
          sortOrder: a.sortOrder,
          notes: a.notes,
        })),
      },
      liabilities: {
        create: source.liabilities.map(l => ({
          category: l.category,
          description: l.description,
          balance: l.balance,
          monthlyPayment: l.monthlyPayment,
          interestRate: l.interestRate,
          creditor: l.creditor,
          maturityDate: l.maturityDate,
          sortOrder: l.sortOrder,
          notes: l.notes,
        })),
      },
    },
    include: { assets: true, liabilities: true },
  });

  res.status(201).json({ statement: newStatement });
});

export default router;
