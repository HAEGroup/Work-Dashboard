import { google } from 'googleapis';
import prisma from '../../config/database';
import { env } from '../../config/env';

const oauth2Client = new google.auth.OAuth2(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_REDIRECT_URI,
);

export function getGoogleAuthUrl(userId: string): string {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error('Google Calendar is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment or Settings.');
  }
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
    prompt: 'consent',
    state: userId,
  });
}

export async function handleGoogleCallback(userId: string, code: string): Promise<void> {
  const { tokens } = await oauth2Client.getToken(code);

  await prisma.googleCalendarSync.upsert({
    where: { userId },
    create: {
      userId,
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token!,
      tokenExpiry: new Date(tokens.expiry_date!),
    },
    update: {
      accessToken: tokens.access_token!,
      ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
      tokenExpiry: new Date(tokens.expiry_date!),
    },
  });
}

async function getAuthenticatedCalendar(userId: string) {
  const sync = await prisma.googleCalendarSync.findUnique({ where: { userId } });
  if (!sync) throw new Error('Google Calendar not connected');

  oauth2Client.setCredentials({
    access_token: sync.accessToken,
    refresh_token: sync.refreshToken,
    expiry_date: sync.tokenExpiry.getTime(),
  });

  // Handle token refresh
  oauth2Client.on('tokens', async (tokens) => {
    await prisma.googleCalendarSync.update({
      where: { userId },
      data: {
        accessToken: tokens.access_token!,
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        tokenExpiry: new Date(tokens.expiry_date!),
      },
    });
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export async function syncGoogleCalendar(userId: string): Promise<number> {
  const calendar = await getAuthenticatedCalendar(userId);
  const sync = await prisma.googleCalendarSync.findUnique({ where: { userId } });
  if (!sync) throw new Error('Google Calendar not connected');

  let eventCount = 0;
  let pageToken: string | undefined;

  const params: Record<string, unknown> = {
    calendarId: sync.calendarId,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 250,
  };

  if (sync.syncToken) {
    params.syncToken = sync.syncToken;
  } else {
    // Initial sync: get events from last 30 days
    params.timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  do {
    if (pageToken) params.pageToken = pageToken;

    const response = await calendar.events.list(params as any);

    const events = (response as any).data.items || [];

    for (const event of events) {
      if (!event.id) continue;

      if (event.status === 'cancelled') {
        await prisma.calendarEvent.deleteMany({
          where: { googleEventId: event.id, userId },
        });
        continue;
      }

      const startTime = event.start?.dateTime
        ? new Date(event.start.dateTime)
        : new Date(event.start?.date || Date.now());
      const endTime = event.end?.dateTime
        ? new Date(event.end.dateTime)
        : new Date(event.end?.date || Date.now());
      const allDay = !event.start?.dateTime;

      await prisma.calendarEvent.upsert({
        where: {
          id: (await prisma.calendarEvent.findFirst({
            where: { googleEventId: event.id, userId },
            select: { id: true },
          }))?.id || 'nonexistent',
        },
        create: {
          userId,
          title: event.summary || 'Untitled',
          description: event.description || null,
          location: event.location || null,
          startTime,
          endTime,
          allDay,
          googleEventId: event.id,
          googleCalendarId: sync.calendarId,
        },
        update: {
          title: event.summary || 'Untitled',
          description: event.description || null,
          location: event.location || null,
          startTime,
          endTime,
          allDay,
        },
      });

      eventCount++;
    }

    pageToken = (response as any).data.nextPageToken || undefined;

    if ((response as any).data.nextSyncToken) {
      await prisma.googleCalendarSync.update({
        where: { userId },
        data: {
          syncToken: (response as any).data.nextSyncToken,
          lastSyncAt: new Date(),
        },
      });
    }
  } while (pageToken);

  return eventCount;
}
