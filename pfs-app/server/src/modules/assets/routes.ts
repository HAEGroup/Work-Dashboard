import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { authenticate, AuthRequest } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

const assetCategoryEnum = z.enum([
  'CASH_AND_EQUIVALENTS',
  'INVESTMENTS',
  'RETIREMENT_ACCOUNTS',
  'REAL_ESTATE',
  'VEHICLES',
  'BUSINESS_INTERESTS',
  'PERSONAL_PROPERTY',
  'LIFE_INSURANCE_CSV',
  'OTHER',
]);

const createAssetSchema = z.object({
  category: assetCategoryEnum,
  description: z.string().min(1),
  value: z.number().min(0),
  sortOrder: z.number().int().optional(),
  notes: z.string().optional(),
});

const updateAssetSchema = createAssetSchema.partial();

// Helper: verify statement belongs to user
async function verifyStatementOwnership(statementId: string, userId: string) {
  return prisma.statement.findFirst({
    where: { id: statementId, userId },
  });
}

// POST /api/statements/:statementId/assets
router.post('/:statementId/assets', async (req: AuthRequest, res: Response) => {
  try {
    const statement = await verifyStatementOwnership(req.params.statementId, req.userId!);
    if (!statement) {
      res.status(404).json({ error: 'Statement not found' });
      return;
    }

    const data = createAssetSchema.parse(req.body);

    const asset = await prisma.asset.create({
      data: {
        statementId: statement.id,
        ...data,
      },
    });

    res.status(201).json({ asset });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// PATCH /api/statements/:statementId/assets/:id
router.patch('/:statementId/assets/:id', async (req: AuthRequest, res: Response) => {
  try {
    const statement = await verifyStatementOwnership(req.params.statementId, req.userId!);
    if (!statement) {
      res.status(404).json({ error: 'Statement not found' });
      return;
    }

    const data = updateAssetSchema.parse(req.body);

    const asset = await prisma.asset.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ asset });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// DELETE /api/statements/:statementId/assets/:id
router.delete('/:statementId/assets/:id', async (req: AuthRequest, res: Response) => {
  const statement = await verifyStatementOwnership(req.params.statementId, req.userId!);
  if (!statement) {
    res.status(404).json({ error: 'Statement not found' });
    return;
  }

  await prisma.asset.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
