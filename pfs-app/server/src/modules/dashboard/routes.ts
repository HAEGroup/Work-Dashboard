import { Router, Response } from 'express';
import { prisma } from '../../config/database';
import { authenticate, AuthRequest } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/dashboard - net worth history + current breakdown
router.get('/', async (req: AuthRequest, res: Response) => {
  // Get all statements ordered by date
  const statements = await prisma.statement.findMany({
    where: { userId: req.userId },
    orderBy: { asOfDate: 'asc' },
    include: {
      assets: true,
      liabilities: true,
    },
  });

  // Build net worth history
  const netWorthHistory = statements.map(stmt => {
    const totalAssets = stmt.assets.reduce((s, a) => s + Number(a.value), 0);
    const totalLiabilities = stmt.liabilities.reduce((s, l) => s + Number(l.balance), 0);
    return {
      date: stmt.asOfDate,
      statementId: stmt.id,
      statementName: stmt.name,
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
    };
  });

  // Get latest statement breakdown
  const latest = statements[statements.length - 1];
  let assetBreakdown: Record<string, number> = {};
  let liabilityBreakdown: Record<string, number> = {};

  if (latest) {
    for (const asset of latest.assets) {
      const cat = asset.category;
      assetBreakdown[cat] = (assetBreakdown[cat] || 0) + Number(asset.value);
    }
    for (const liability of latest.liabilities) {
      const cat = liability.category;
      liabilityBreakdown[cat] = (liabilityBreakdown[cat] || 0) + Number(liability.balance);
    }
  }

  res.json({
    netWorthHistory,
    assetBreakdown,
    liabilityBreakdown,
    statementCount: statements.length,
  });
});

export default router;
