import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../config/database';
import { authenticate } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

// ============================================================
// PROJECTS
// ============================================================

const projectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string().optional(),
});

// GET /api/tasks/projects
router.get('/projects', authenticate, async (_req: Request, res: Response) => {
  const projects = await prisma.project.findMany({
    where: { isArchived: false },
    include: {
      tasks: {
        select: { id: true, status: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  const projectsWithCounts = projects.map(p => ({
    ...p,
    taskCounts: {
      total: p.tasks.length,
      done: p.tasks.filter(t => t.status === 'DONE').length,
      inProgress: p.tasks.filter(t => t.status === 'IN_PROGRESS').length,
    },
    tasks: undefined,
  }));

  res.json({ projects: projectsWithCounts });
});

// POST /api/tasks/projects
router.post('/projects', authenticate, async (req: Request, res: Response) => {
  const parsed = projectSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid project data');

  const project = await prisma.project.create({ data: parsed.data });
  res.status(201).json({ project });
});

// PATCH /api/tasks/projects/:id
router.patch('/projects/:id', authenticate, async (req: Request, res: Response) => {
  const parsed = projectSchema.partial().extend({
    isArchived: z.boolean().optional(),
  }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid project data');

  const project = await prisma.project.update({
    where: { id: req.params.id as string },
    data: parsed.data,
  });
  res.json({ project });
});

// ============================================================
// TASKS
// ============================================================

const taskSchema = z.object({
  projectId: z.string().uuid().optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dueDate: z.string().transform(s => new Date(s)).optional().nullable(),
  startDate: z.string().transform(s => new Date(s)).optional().nullable(),
  estimatedHours: z.number().optional().nullable(),
  sortOrder: z.number().optional(),
  assigneeIds: z.array(z.string().uuid()).optional(),
});

// GET /api/tasks?projectId=...&status=...&assigneeId=...
router.get('/', authenticate, async (req: Request, res: Response) => {
  const { projectId, status, assigneeId, parentId, page = '1', limit = '100' } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const where: Record<string, unknown> = {};
  if (projectId) where.projectId = projectId;
  if (status) where.status = status;
  if (parentId === 'null') where.parentId = null;
  else if (parentId) where.parentId = parentId;
  if (assigneeId) {
    where.assignments = { some: { userId: assigneeId as string } };
  }

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        assignments: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
        children: {
          select: { id: true, title: true, status: true, priority: true },
        },
        dependencies: {
          include: { dependsOn: { select: { id: true, title: true, status: true } } },
        },
        project: { select: { id: true, name: true, color: true } },
        _count: { select: { timeEntries: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      skip,
      take: parseInt(limit as string),
    }),
    prisma.task.count({ where }),
  ]);

  res.json({ tasks, total, page: parseInt(page as string), limit: parseInt(limit as string) });
});

// GET /api/tasks/:id
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const task = await prisma.task.findUnique({
    where: { id: req.params.id as string },
    include: {
      assignments: {
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      },
      children: {
        include: {
          assignments: {
            include: { user: { select: { id: true, firstName: true, lastName: true } } },
          },
        },
        orderBy: { sortOrder: 'asc' },
      },
      dependencies: {
        include: { dependsOn: { select: { id: true, title: true, status: true } } },
      },
      dependents: {
        include: { task: { select: { id: true, title: true, status: true } } },
      },
      timeEntries: {
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { startTime: 'desc' },
        take: 20,
      },
      project: { select: { id: true, name: true, color: true } },
    },
  });

  if (!task) throw new AppError(404, 'Task not found');
  res.json({ task });
});

// POST /api/tasks
router.post('/', authenticate, async (req: Request, res: Response) => {
  const parsed = taskSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid task data');

  const { assigneeIds, ...taskData } = parsed.data;

  const task = await prisma.task.create({
    data: {
      ...taskData,
      ...(assigneeIds?.length ? {
        assignments: {
          create: assigneeIds.map(userId => ({ userId })),
        },
      } : {}),
    },
    include: {
      assignments: {
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      },
      project: { select: { id: true, name: true, color: true } },
    },
  });

  res.status(201).json({ task });
});

// PATCH /api/tasks/:id
router.patch('/:id', authenticate, async (req: Request, res: Response) => {
  const parsed = taskSchema.partial().safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid task data');

  const { assigneeIds, ...taskData } = parsed.data;

  const task = await prisma.task.update({
    where: { id: req.params.id as string },
    data: taskData,
    include: {
      assignments: {
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      },
      project: { select: { id: true, name: true, color: true } },
    },
  });

  // Update assignments if provided
  if (assigneeIds !== undefined) {
    await prisma.taskAssignment.deleteMany({ where: { taskId: req.params.id as string } });
    if (assigneeIds.length > 0) {
      await prisma.taskAssignment.createMany({
        data: assigneeIds.map(userId => ({ taskId: req.params.id as string, userId })),
      });
    }
  }

  res.json({ task });
});

// DELETE /api/tasks/:id
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  await prisma.task.delete({ where: { id: req.params.id as string } });
  res.json({ message: 'Task deleted' });
});

// ============================================================
// TASK DEPENDENCIES
// ============================================================

// POST /api/tasks/:id/dependencies
router.post('/:id/dependencies', authenticate, async (req: Request, res: Response) => {
  const { dependsOnId } = req.body;
  if (!dependsOnId) throw new AppError(400, 'dependsOnId is required');

  // Prevent circular dependencies
  if (dependsOnId === req.params.id) {
    throw new AppError(400, 'A task cannot depend on itself');
  }

  const dependency = await prisma.taskDependency.create({
    data: { taskId: req.params.id as string, dependsOnId },
    include: { dependsOn: { select: { id: true, title: true, status: true } } },
  });

  res.status(201).json({ dependency });
});

// DELETE /api/tasks/:id/dependencies/:depId
router.delete('/:id/dependencies/:depId', authenticate, async (req: Request, res: Response) => {
  await prisma.taskDependency.delete({ where: { id: req.params.depId as string } });
  res.json({ message: 'Dependency removed' });
});

// ============================================================
// TIME TRACKING
// ============================================================

// POST /api/tasks/:id/time-entries
router.post('/:id/time-entries', authenticate, async (req: Request, res: Response) => {
  const schema = z.object({
    startTime: z.string().transform(s => new Date(s)),
    endTime: z.string().transform(s => new Date(s)).optional(),
    description: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid time entry data');

  const entry = await prisma.timeEntry.create({
    data: {
      taskId: req.params.id as string,
      userId: req.user!.id,
      ...parsed.data,
    },
    include: { user: { select: { id: true, firstName: true, lastName: true } } },
  });

  res.status(201).json({ entry });
});

// PATCH /api/tasks/time-entries/:id (stop timer)
router.patch('/time-entries/:id', authenticate, async (req: Request, res: Response) => {
  const { endTime, description } = req.body;

  const entry = await prisma.timeEntry.update({
    where: { id: req.params.id as string },
    data: {
      ...(endTime ? { endTime: new Date(endTime) } : {}),
      ...(description !== undefined ? { description } : {}),
    },
  });

  res.json({ entry });
});

// GET /api/tasks/time-entries/active
router.get('/time-entries/active', authenticate, async (req: Request, res: Response) => {
  const activeEntry = await prisma.timeEntry.findFirst({
    where: { userId: req.user!.id, endTime: null },
    include: {
      task: { select: { id: true, title: true } },
    },
  });

  res.json({ entry: activeEntry });
});

export default router;
