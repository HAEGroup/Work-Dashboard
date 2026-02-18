import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../config/database';
import { authenticate } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();
router.use(authenticate);

// ============================================================
// BOARDS
// ============================================================

// GET /api/crm/boards
router.get('/boards', async (_req: Request, res: Response) => {
  const boards = await prisma.crmBoard.findMany({
    orderBy: { position: 'asc' },
    include: {
      _count: { select: { groups: true, columns: true } },
    },
  });
  res.json({ boards });
});

// POST /api/crm/boards
const createBoardSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
});

router.post('/boards', async (req: Request, res: Response) => {
  const parsed = createBoardSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid board data');

  const maxPos = await prisma.crmBoard.aggregate({ _max: { position: true } });

  const board = await prisma.crmBoard.create({
    data: {
      ...parsed.data,
      position: (maxPos._max?.position ?? -1) + 1,
      groups: {
        create: [
          { name: 'New Group', color: '#3b82f6', position: 0 },
        ],
      },
      columns: {
        create: [
          { name: 'Status', type: 'STATUS', position: 0, config: { options: [
            { label: 'New', color: '#6b7280' },
            { label: 'Working on it', color: '#f59e0b' },
            { label: 'Done', color: '#22c55e' },
            { label: 'Stuck', color: '#ef4444' },
          ] } },
          { name: 'Person', type: 'PERSON', position: 1 },
          { name: 'Date', type: 'DATE', position: 2 },
        ],
      },
    },
    include: {
      groups: true,
      columns: { orderBy: { position: 'asc' } },
    },
  });

  res.status(201).json({ board });
});

// PATCH /api/crm/boards/:id
router.patch('/boards/:id', async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    color: z.string().optional(),
    icon: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid data');

  const board = await prisma.crmBoard.update({
    where: { id: req.params.id as string },
    data: parsed.data,
  });
  res.json({ board });
});

// DELETE /api/crm/boards/:id
router.delete('/boards/:id', async (req: Request, res: Response) => {
  await prisma.crmBoard.delete({ where: { id: req.params.id as string } });
  res.json({ message: 'Board deleted' });
});

// ============================================================
// BOARD DATA (full board with groups, items, columns, values)
// ============================================================

// GET /api/crm/boards/:id/data
router.get('/boards/:id/data', async (req: Request, res: Response) => {
  const board = await prisma.crmBoard.findUnique({
    where: { id: req.params.id as string },
    include: {
      columns: { orderBy: { position: 'asc' } },
      groups: {
        orderBy: { position: 'asc' },
        include: {
          items: {
            orderBy: { position: 'asc' },
            include: {
              cellValues: true,
            },
          },
        },
      },
    },
  });

  if (!board) throw new AppError(404, 'Board not found');

  // Also return users for PERSON columns
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, firstName: true, lastName: true, email: true },
  });

  res.json({ board, users });
});

// ============================================================
// COLUMNS
// ============================================================

const createColumnSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['TEXT', 'NUMBER', 'STATUS', 'DATE', 'PERSON', 'EMAIL', 'PHONE', 'LINK', 'DROPDOWN', 'CHECKBOX', 'RATING']),
  config: z.any().optional(),
  width: z.number().optional(),
});

// POST /api/crm/boards/:boardId/columns
router.post('/boards/:boardId/columns', async (req: Request, res: Response) => {
  const parsed = createColumnSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid column data');

  const boardId = req.params.boardId as string;
  const maxPos = await prisma.crmColumn.aggregate({
    where: { boardId },
    _max: { position: true },
  });

  let config = parsed.data.config;
  if (parsed.data.type === 'STATUS' && !config) {
    config = { options: [
      { label: 'New', color: '#6b7280' },
      { label: 'Working on it', color: '#f59e0b' },
      { label: 'Done', color: '#22c55e' },
      { label: 'Stuck', color: '#ef4444' },
    ] };
  }
  if (parsed.data.type === 'DROPDOWN' && !config) {
    config = { options: [
      { label: 'Option 1', color: '#3b82f6' },
      { label: 'Option 2', color: '#8b5cf6' },
    ] };
  }

  const column = await prisma.crmColumn.create({
    data: {
      boardId,
      name: parsed.data.name,
      type: parsed.data.type,
      config,
      width: parsed.data.width,
      position: (maxPos._max?.position ?? -1) + 1,
    },
  });

  res.status(201).json({ column });
});

// PATCH /api/crm/columns/:id
router.patch('/columns/:id', async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().min(1).optional(),
    config: z.any().optional(),
    width: z.number().optional(),
    position: z.number().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid data');

  const column = await prisma.crmColumn.update({
    where: { id: req.params.id as string },
    data: parsed.data,
  });
  res.json({ column });
});

// DELETE /api/crm/columns/:id
router.delete('/columns/:id', async (req: Request, res: Response) => {
  await prisma.crmColumn.delete({ where: { id: req.params.id as string } });
  res.json({ message: 'Column deleted' });
});

// ============================================================
// GROUPS
// ============================================================

// POST /api/crm/boards/:boardId/groups
router.post('/boards/:boardId/groups', async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().min(1),
    color: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid group data');

  const boardId = req.params.boardId as string;
  const maxPos = await prisma.crmGroup.aggregate({
    where: { boardId },
    _max: { position: true },
  });

  const group = await prisma.crmGroup.create({
    data: {
      boardId,
      name: parsed.data.name,
      color: parsed.data.color,
      position: (maxPos._max?.position ?? -1) + 1,
    },
    include: { items: true },
  });

  res.status(201).json({ group });
});

// PATCH /api/crm/groups/:id
router.patch('/groups/:id', async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().min(1).optional(),
    color: z.string().optional(),
    collapsed: z.boolean().optional(),
    position: z.number().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid data');

  const group = await prisma.crmGroup.update({
    where: { id: req.params.id as string },
    data: parsed.data,
  });
  res.json({ group });
});

// DELETE /api/crm/groups/:id
router.delete('/groups/:id', async (req: Request, res: Response) => {
  await prisma.crmGroup.delete({ where: { id: req.params.id as string } });
  res.json({ message: 'Group deleted' });
});

// ============================================================
// ITEMS
// ============================================================

// POST /api/crm/groups/:groupId/items
router.post('/groups/:groupId/items', async (req: Request, res: Response) => {
  const schema = z.object({ name: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Item name is required');

  const groupId = req.params.groupId as string;
  const maxPos = await prisma.crmItem.aggregate({
    where: { groupId },
    _max: { position: true },
  });

  const item = await prisma.crmItem.create({
    data: {
      groupId,
      name: parsed.data.name,
      position: (maxPos._max?.position ?? -1) + 1,
    },
    include: { cellValues: true },
  });

  res.status(201).json({ item });
});

// PATCH /api/crm/items/:id
router.patch('/items/:id', async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().min(1).optional(),
    groupId: z.string().optional(),
    position: z.number().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid data');

  const item = await prisma.crmItem.update({
    where: { id: req.params.id as string },
    data: parsed.data,
  });
  res.json({ item });
});

// DELETE /api/crm/items/:id
router.delete('/items/:id', async (req: Request, res: Response) => {
  await prisma.crmItem.delete({ where: { id: req.params.id as string } });
  res.json({ message: 'Item deleted' });
});

// ============================================================
// CELL VALUES
// ============================================================

// PUT /api/crm/items/:itemId/cells/:columnId
router.put('/items/:itemId/cells/:columnId', async (req: Request, res: Response) => {
  const schema = z.object({ value: z.any() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Value is required');

  const itemId = req.params.itemId as string;
  const columnId = req.params.columnId as string;

  const cell = await prisma.crmCellValue.upsert({
    where: { itemId_columnId: { itemId, columnId } },
    create: { itemId, columnId, value: parsed.data.value },
    update: { value: parsed.data.value },
  });

  res.json({ cell });
});

// ============================================================
// ACTIVITIES
// ============================================================

// GET /api/crm/items/:itemId/activities
router.get('/items/:itemId/activities', async (req: Request, res: Response) => {
  const activities = await prisma.crmActivity.findMany({
    where: { itemId: req.params.itemId as string },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
    },
    take: 50,
  });
  res.json({ activities });
});

// POST /api/crm/items/:itemId/activities
router.post('/items/:itemId/activities', async (req: Request, res: Response) => {
  const schema = z.object({
    type: z.string().min(1),
    content: z.string().min(1),
    metadata: z.any().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid activity data');

  const activity = await prisma.crmActivity.create({
    data: {
      itemId: req.params.itemId as string,
      userId: req.user!.id,
      ...parsed.data,
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  res.status(201).json({ activity });
});

export default router;
