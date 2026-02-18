import { google } from 'googleapis';
import prisma from '../../config/database';
import { env } from '../../config/env';

function createOAuth2Client() {
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI?.replace('/api/calendar/google/callback', '/api/chat/google/callback')
      || 'http://localhost:3001/api/chat/google/callback',
  );
}

export function getGoogleChatAuthUrl(userId: string): string {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error('Google is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment.');
  }
  const oauth2Client = createOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/chat.spaces.readonly',
      'https://www.googleapis.com/auth/chat.messages',
      'https://www.googleapis.com/auth/chat.messages.create',
      'https://www.googleapis.com/auth/chat.memberships.readonly',
    ],
    prompt: 'consent',
    state: userId,
  });
}

export async function handleGoogleChatCallback(userId: string, code: string): Promise<void> {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  await prisma.googleChatSync.upsert({
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

async function getAuthenticatedChatClient(userId: string) {
  const sync = await prisma.googleChatSync.findUnique({ where: { userId } });
  if (!sync) throw new Error('Google Chat not connected');

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: sync.accessToken,
    refresh_token: sync.refreshToken,
    expiry_date: sync.tokenExpiry.getTime(),
  });

  // Handle token refresh
  oauth2Client.on('tokens', async (tokens) => {
    await prisma.googleChatSync.update({
      where: { userId },
      data: {
        accessToken: tokens.access_token!,
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        tokenExpiry: new Date(tokens.expiry_date!),
      },
    });
  });

  return google.chat({ version: 'v1', auth: oauth2Client });
}

export async function listSpaces(userId: string) {
  const chat = await getAuthenticatedChatClient(userId);
  const response = await chat.spaces.list({ pageSize: 100 });
  return response.data.spaces || [];
}

export async function getSpaceMembers(userId: string, spaceName: string) {
  const chat = await getAuthenticatedChatClient(userId);
  const response = await chat.spaces.members.list({
    parent: spaceName,
    pageSize: 100,
  });
  return response.data.memberships || [];
}

export async function listMessages(userId: string, spaceName: string, pageSize = 25, pageToken?: string) {
  const chat = await getAuthenticatedChatClient(userId);
  const params: Record<string, unknown> = {
    parent: spaceName,
    pageSize,
    orderBy: 'createTime desc',
  };
  if (pageToken) params.pageToken = pageToken;

  const response = await chat.spaces.messages.list(params as any);
  return {
    messages: response.data.messages || [],
    nextPageToken: response.data.nextPageToken,
  };
}

export async function sendMessage(userId: string, spaceName: string, text: string) {
  const chat = await getAuthenticatedChatClient(userId);
  const response = await chat.spaces.messages.create({
    parent: spaceName,
    requestBody: { text },
  });
  return response.data;
}

export async function disconnectChat(userId: string) {
  await prisma.googleChatSync.delete({ where: { userId } });
}
