import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { authenticate, AuthRequest } from './middleware/auth';
import { generateStatementPdf } from './utils/pdfGenerator';
import authRoutes from './modules/auth/routes';
import statementRoutes from './modules/statements/routes';
import assetRoutes from './modules/assets/routes';
import liabilityRoutes from './modules/liabilities/routes';
import dashboardRoutes from './modules/dashboard/routes';

const app = express();

app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'pfs-app' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/statements', statementRoutes);
app.use('/api/statements', assetRoutes);
app.use('/api/statements', liabilityRoutes);
app.use('/api/dashboard', dashboardRoutes);

// PDF export endpoint
app.get('/api/statements/:id/pdf', authenticate, async (req: AuthRequest, res) => {
  try {
    const pdf = await generateStatementPdf(req.params.id, req.userId!);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="pfs-${req.params.id}.pdf"`);
    res.send(pdf);
  } catch (err) {
    if (err instanceof Error && err.message === 'Statement not found') {
      res.status(404).json({ error: 'Statement not found' });
      return;
    }
    throw err;
  }
});

app.use(errorHandler);

app.listen(Number(env.PORT), '0.0.0.0', () => {
  console.log(`PFS Server running on port ${env.PORT}`);
});
