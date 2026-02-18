import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';
import { simpleParser, ParsedMail } from 'mailparser';
import { Prisma } from '@prisma/client';
import prisma from '../../config/database';

interface EmailAccountData {
  id: string;
  emailAddress: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  username: string;
  password: string;
}

interface SendEmailData {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  isHtml: boolean;
}

export async function fetchEmails(account: EmailAccountData): Promise<number> {
  const client = new ImapFlow({
    host: account.imapHost,
    port: account.imapPort,
    secure: true,
    auth: {
      user: account.username,
      pass: account.password,
    },
    logger: false,
  });

  let newCount = 0;

  try {
    await client.connect();

    const lock = await client.getMailboxLock('INBOX');
    try {
      // Get the latest UID we have stored
      const latestMessage = await prisma.emailMessage.findFirst({
        where: { accountId: account.id, folder: 'INBOX' },
        orderBy: { uid: 'desc' },
        select: { uid: true },
      });

      const sinceUid = latestMessage?.uid ? latestMessage.uid + 1 : 1;

      for await (const message of client.fetch(`${sinceUid}:*`, {
        uid: true,
        envelope: true,
        source: true,
        flags: true,
      })) {
        if (message.uid < sinceUid) continue;

        const parsed: ParsedMail = await simpleParser(message.source as Buffer);

        await prisma.emailMessage.upsert({
          where: {
            accountId_uid_folder: {
              accountId: account.id,
              uid: message.uid,
              folder: 'INBOX',
            },
          },
          create: {
            accountId: account.id,
            messageId: parsed.messageId || null,
            folder: 'INBOX',
            fromAddress: parsed.from?.value[0]?.address || 'unknown',
            fromName: parsed.from?.value[0]?.name || null,
            toAddresses: parsed.to
              ? (Array.isArray(parsed.to) ? parsed.to : [parsed.to]).map((t: any) => t.value).flat()
              : [],
            ccAddresses: parsed.cc
              ? (Array.isArray(parsed.cc) ? parsed.cc : [parsed.cc]).map((t: any) => t.value).flat()
              : Prisma.JsonNull,
            subject: parsed.subject || null,
            bodyText: parsed.text || null,
            bodyHtml: parsed.html || null,
            isRead: message.flags?.has('\\Seen') || false,
            hasAttachments: (parsed.attachments?.length || 0) > 0,
            date: parsed.date || new Date(),
            uid: message.uid,
          },
          update: {},
        });

        newCount++;
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  return newCount;
}

export async function sendEmail(account: EmailAccountData, data: SendEmailData): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: account.smtpHost,
    port: account.smtpPort,
    secure: account.smtpPort === 465,
    auth: {
      user: account.username,
      pass: account.password,
    },
  });

  await transporter.sendMail({
    from: account.emailAddress,
    to: data.to.join(', '),
    cc: data.cc?.join(', '),
    bcc: data.bcc?.join(', '),
    subject: data.subject,
    ...(data.isHtml ? { html: data.body } : { text: data.body }),
  });
}
