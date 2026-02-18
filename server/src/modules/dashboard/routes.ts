import { Router, Request, Response } from 'express';
import prisma from '../../config/database';
import { authenticate } from '../../middleware/auth';

const router = Router();

// GET /api/dashboard
router.get('/', authenticate, async (req: Request, res: Response) => {
  const userId = req.user!.id;

  // Run all queries in parallel
  const [
    taskCounts,
    myTasks,
    upcomingEvents,
    unreadEmailCount,
    recentMaintenanceRequests,
    propertyCount,
    tenantCount,
    activeTimer,
  ] = await Promise.all([
    // Task counts by status
    prisma.task.groupBy({
      by: ['status'],
      _count: { id: true },
    }),

    // My assigned tasks that are active
    prisma.task.findMany({
      where: {
        assignments: { some: { userId } },
        status: { in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW'] },
      },
      include: {
        project: { select: { name: true, color: true } },
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
      take: 10,
    }),

    // Upcoming calendar events (next 7 days)
    prisma.calendarEvent.findMany({
      where: {
        userId,
        startTime: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { startTime: 'asc' },
      take: 10,
    }),

    // Unread email count
    prisma.emailMessage.count({
      where: {
        account: { userId },
        isRead: false,
      },
    }),

    // Recent maintenance requests
    prisma.rentvineMaintenanceRequest.findMany({
      where: { status: { not: 'closed' } },
      include: {
        property: { select: { name: true, address: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),

    // Property count
    prisma.rentvineProperty.count(),

    // Tenant count
    prisma.rentvineTenant.count({ where: { status: 'active' } }),

    // Active time entry
    prisma.timeEntry.findFirst({
      where: { userId, endTime: null },
      include: { task: { select: { id: true, title: true } } },
    }),
  ]);

  // Format task counts
  const taskSummary: Record<string, number> = {};
  for (const group of taskCounts) {
    taskSummary[group.status] = group._count.id;
  }

  res.json({
    tasks: {
      summary: taskSummary,
      myTasks,
    },
    calendar: {
      upcomingEvents,
    },
    email: {
      unreadCount: unreadEmailCount,
    },
    properties: {
      total: propertyCount,
      activeTenants: tenantCount,
      recentMaintenanceRequests,
    },
    timeTracking: {
      activeTimer,
    },
  });
});

export default router;
