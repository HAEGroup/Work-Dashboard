import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { authenticate, AuthRequest } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

const liabilityCategoryEnum = z.enum([
  'MORTGAGE',
  'HOME_EQUITY_LOAN',
  'AUTO_LOAN',
  'STUDENT_LOAN',
  'CREDIT_CARD',
  'BUSINESS_LOAN',
  'PERSONAL_LOAN',
  'TAX_LIABILITY',
  'OTHER',
]);

const createLiabilitySchema = z.object({
  category: liabilityCategoryEnum,
  description: z.string().min(1),
  balance: z.number().min(0),
  monthlyPayment: z.number().min(0).optional(),
  interestRate: z.number().min(0).max(100).optional(),
  creditor: z.string().optional(),
  maturityDate: z.string().transform(s => new Date(s)).optional(),
  sortOrder: z.number().int().optional(),
  notes: z.string().optional(),
});

const updateLiabilitySchema = createLiabilitySchema.partial();

async function verifyStatementOwnership(statementId: string, userId: string) {
  return prisma.statement.findFirst({
    where: { id: statementId, userId },
  });
}

// POST /api/statements/:statementId/liabilities
router.post('/:statementId/liabilities', async (req: AuthRequest, res: Response) => {
  try {
    const statement = await verifyStatementOwnership(req.params.statementId, req.userId!);
    if (!statement) {
      res.status(404).json({ error: 'Statement not found' });
      return;
    }

    const data = createLiabilitySchema.parse(req.body);

    const liability = await prisma.liability.create({
      data: {
        statementId: statement.id,
        ...data,
      },
    });

    res.status(201).json({ liability });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// PATCH /api/statements/:statementId/liabilities/:id
router.patch('/:statementId/liabilities/:id', async (req: AuthRequest, res: Response) => {
  try {
    const statement = await verifyStatementOwnership(req.params.statementId, req.userId!);
    if (!statement) {
      res.status(404).json({ error: 'Statement not found' });
      return;
    }

    const data = updateLiabilitySchema.parse(req.body);

    const liability = await prisma.liability.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ liability });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// DELETE /api/statements/:statementId/liabilities/:id
router.delete('/:statementId/liabilities/:id', async (req: AuthRequest, res: Response) => {
  const statement = await verifyStatementOwnership(req.params.statementId, req.userId!);
  if (!statement) {
    res.status(404).json({ error: 'Statement not found' });
    return;
  }

  await prisma.liability.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
