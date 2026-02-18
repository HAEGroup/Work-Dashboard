import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../config/database';
import { authenticate, authorize } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { RentvineClient } from './client';

const router = Router();

// ============================================================
// CONFIG
// ============================================================

const configSchema = z.object({
  apiKey: z.string().min(1),
  apiSecret: z.string().min(1),
  baseUrl: z.string().url().optional(),
});

// GET /api/rentvine/config
router.get('/config', authenticate, authorize('ADMIN'), async (_req: Request, res: Response) => {
  const config = await prisma.rentvineConfig.findFirst();
  if (!config) {
    res.json({ config: null });
    return;
  }
  res.json({
    config: {
      id: config.id,
      baseUrl: config.baseUrl,
      isActive: config.isActive,
      lastSyncAt: config.lastSyncAt,
    },
  });
});

// POST /api/rentvine/config
router.post('/config', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const parsed = configSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid config data');

  // Delete existing config and create new
  await prisma.rentvineConfig.deleteMany();
  const config = await prisma.rentvineConfig.create({
    data: parsed.data,
  });

  res.status(201).json({
    config: { id: config.id, baseUrl: config.baseUrl, isActive: config.isActive },
  });
});

// ============================================================
// SYNC
// ============================================================

// POST /api/rentvine/sync
router.post('/sync', authenticate, authorize('ADMIN', 'MANAGER'), async (_req: Request, res: Response) => {
  const config = await prisma.rentvineConfig.findFirst({ where: { isActive: true } });
  if (!config) throw new AppError(400, 'Rentvine not configured');

  const client = new RentvineClient(config.apiKey, config.apiSecret, config.baseUrl);
  const results = await syncAllData(client);

  await prisma.rentvineConfig.update({
    where: { id: config.id },
    data: { lastSyncAt: new Date() },
  });

  res.json({ results });
});

async function syncAllData(client: RentvineClient) {
  const results = {
    properties: 0,
    units: 0,
    tenants: 0,
    maintenanceRequests: 0,
    transactions: 0,
  };

  // Sync properties
  const properties = await client.getProperties();
  for (const prop of properties) {
    await prisma.rentvineProperty.upsert({
      where: { rentvineId: String(prop.id) },
      create: {
        rentvineId: String(prop.id),
        name: prop.name || prop.address || 'Unknown',
        address: prop.address,
        city: prop.city,
        state: prop.state,
        zip: prop.zip,
        type: prop.type,
        status: prop.status,
        ownerId: prop.owner_id ? String(prop.owner_id) : null,
        ownerName: prop.owner_name,
        rawData: prop,
        lastSyncAt: new Date(),
      },
      update: {
        name: prop.name || prop.address || 'Unknown',
        address: prop.address,
        city: prop.city,
        state: prop.state,
        zip: prop.zip,
        type: prop.type,
        status: prop.status,
        ownerId: prop.owner_id ? String(prop.owner_id) : null,
        ownerName: prop.owner_name,
        rawData: prop,
        lastSyncAt: new Date(),
      },
    });
    results.properties++;
  }

  // Sync units
  const units = await client.getUnits();
  for (const unit of units) {
    const property = await prisma.rentvineProperty.findUnique({
      where: { rentvineId: String(unit.property_id) },
    });
    if (!property) continue;

    await prisma.rentvineUnit.upsert({
      where: { rentvineId: String(unit.id) },
      create: {
        rentvineId: String(unit.id),
        propertyId: property.id,
        name: unit.name || 'Unit',
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms,
        sqft: unit.sqft,
        rent: unit.rent,
        status: unit.status,
        rawData: unit,
        lastSyncAt: new Date(),
      },
      update: {
        name: unit.name || 'Unit',
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms,
        sqft: unit.sqft,
        rent: unit.rent,
        status: unit.status,
        rawData: unit,
        lastSyncAt: new Date(),
      },
    });
    results.units++;
  }

  // Sync tenants
  const tenants = await client.getTenants();
  for (const tenant of tenants) {
    const property = await prisma.rentvineProperty.findUnique({
      where: { rentvineId: String(tenant.property_id) },
    });
    if (!property) continue;

    let unitId: string | null = null;
    if (tenant.unit_id) {
      const unit = await prisma.rentvineUnit.findUnique({
        where: { rentvineId: String(tenant.unit_id) },
      });
      unitId = unit?.id || null;
    }

    await prisma.rentvineTenant.upsert({
      where: { rentvineId: String(tenant.id) },
      create: {
        rentvineId: String(tenant.id),
        propertyId: property.id,
        unitId,
        firstName: tenant.first_name || '',
        lastName: tenant.last_name || '',
        email: tenant.email,
        phone: tenant.phone,
        leaseStart: tenant.lease_start ? new Date(tenant.lease_start) : null,
        leaseEnd: tenant.lease_end ? new Date(tenant.lease_end) : null,
        rentAmount: tenant.rent_amount,
        status: tenant.status,
        rawData: tenant,
        lastSyncAt: new Date(),
      },
      update: {
        firstName: tenant.first_name || '',
        lastName: tenant.last_name || '',
        email: tenant.email,
        phone: tenant.phone,
        leaseStart: tenant.lease_start ? new Date(tenant.lease_start) : null,
        leaseEnd: tenant.lease_end ? new Date(tenant.lease_end) : null,
        rentAmount: tenant.rent_amount,
        status: tenant.status,
        rawData: tenant,
        lastSyncAt: new Date(),
      },
    });
    results.tenants++;
  }

  // Sync maintenance requests
  const requests = await client.getMaintenanceRequests();
  for (const req of requests) {
    const property = await prisma.rentvineProperty.findUnique({
      where: { rentvineId: String(req.property_id) },
    });
    if (!property) continue;

    await prisma.rentvineMaintenanceRequest.upsert({
      where: { rentvineId: String(req.id) },
      create: {
        rentvineId: String(req.id),
        propertyId: property.id,
        title: req.title || req.description || 'Maintenance Request',
        description: req.description,
        status: req.status,
        priority: req.priority,
        requestedBy: req.requested_by,
        assignedTo: req.assigned_to,
        rawData: req,
        lastSyncAt: new Date(),
      },
      update: {
        title: req.title || req.description || 'Maintenance Request',
        description: req.description,
        status: req.status,
        priority: req.priority,
        requestedBy: req.requested_by,
        assignedTo: req.assigned_to,
        rawData: req,
        lastSyncAt: new Date(),
      },
    });
    results.maintenanceRequests++;
  }

  // Sync transactions
  const transactions = await client.getTransactions();
  for (const txn of transactions) {
    await prisma.rentvineTransaction.upsert({
      where: { rentvineId: String(txn.id) },
      create: {
        rentvineId: String(txn.id),
        propertyId: txn.property_id ? String(txn.property_id) : null,
        type: txn.type || 'other',
        amount: txn.amount || 0,
        date: new Date(txn.date || Date.now()),
        description: txn.description,
        category: txn.category,
        status: txn.status,
        rawData: txn,
        lastSyncAt: new Date(),
      },
      update: {
        type: txn.type || 'other',
        amount: txn.amount || 0,
        date: new Date(txn.date || Date.now()),
        description: txn.description,
        category: txn.category,
        status: txn.status,
        rawData: txn,
        lastSyncAt: new Date(),
      },
    });
    results.transactions++;
  }

  return results;
}

// ============================================================
// DATA ENDPOINTS
// ============================================================

// GET /api/rentvine/properties
router.get('/properties', authenticate, async (req: Request, res: Response) => {
  const { status, search } = req.query;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } },
      { address: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const properties = await prisma.rentvineProperty.findMany({
    where,
    include: {
      units: { select: { id: true, name: true, rent: true, status: true } },
      _count: { select: { tenants: true, maintenanceRequests: true } },
    },
    orderBy: { name: 'asc' },
  });

  res.json({ properties });
});

// GET /api/rentvine/properties/:id
router.get('/properties/:id', authenticate, async (req: Request, res: Response) => {
  const property = await prisma.rentvineProperty.findUnique({
    where: { id: req.params.id as string },
    include: {
      units: {
        include: {
          tenants: { select: { id: true, firstName: true, lastName: true, status: true, rentAmount: true } },
        },
      },
      tenants: true,
      maintenanceRequests: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!property) throw new AppError(404, 'Property not found');
  res.json({ property });
});

// GET /api/rentvine/tenants
router.get('/tenants', authenticate, async (req: Request, res: Response) => {
  const { status, propertyId, search } = req.query;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (propertyId) where.propertyId = propertyId;
  if (search) {
    where.OR = [
      { firstName: { contains: search as string, mode: 'insensitive' } },
      { lastName: { contains: search as string, mode: 'insensitive' } },
      { email: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const tenants = await prisma.rentvineTenant.findMany({
    where,
    include: {
      property: { select: { id: true, name: true, address: true } },
      unit: { select: { id: true, name: true } },
    },
    orderBy: { lastName: 'asc' },
  });

  res.json({ tenants });
});

// GET /api/rentvine/maintenance
router.get('/maintenance', authenticate, async (req: Request, res: Response) => {
  const { status, propertyId, priority } = req.query;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (propertyId) where.propertyId = propertyId;
  if (priority) where.priority = priority;

  const requests = await prisma.rentvineMaintenanceRequest.findMany({
    where,
    include: {
      property: { select: { id: true, name: true, address: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ requests });
});

// GET /api/rentvine/transactions
router.get('/transactions', authenticate, async (req: Request, res: Response) => {
  const { type, from, to, propertyId, page = '1', limit = '50' } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (propertyId) where.propertyId = propertyId;
  if (from || to) {
    where.date = {};
    if (from) (where.date as Record<string, unknown>).gte = new Date(from as string);
    if (to) (where.date as Record<string, unknown>).lte = new Date(to as string);
  }

  const [transactions, total] = await Promise.all([
    prisma.rentvineTransaction.findMany({
      where,
      orderBy: { date: 'desc' },
      skip,
      take: parseInt(limit as string),
    }),
    prisma.rentvineTransaction.count({ where }),
  ]);

  res.json({ transactions, total, page: parseInt(page as string), limit: parseInt(limit as string) });
});

export default router;
