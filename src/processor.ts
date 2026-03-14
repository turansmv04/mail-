import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { supabase } from './supabase';
import { analyzeEmail } from './ai';
import { sendAutoReply } from './mailer';
import pLimit from 'p-limit';
import { ENV } from './config';
import { logger } from './logger';

let isProcessing = false;  

const processSingleEmail = async (
    client: ImapFlow,
    msgId: number
): Promise<string> => {
    const message = await client.fetchOne(msgId, { source: true });
    if (!message || !message.source) return 'IGNORE';

    const parsed = await simpleParser(message.source);

    const subject  = parsed.subject ?? 'No subject';
    const sender   = parsed.from?.value?.[0]?.address ?? 'unknown@mail.com';
    const attachmentInfo = parsed.attachments?.length
        ? `\n\nAttachments: ${parsed.attachments
              .map(a => `${a.filename} (${a.contentType})`)
              .join(', ')}`
        : '';
    const body = (parsed.text ?? 'No text').slice(0, 3000) + attachmentInfo;

    logger.info({ msgId, sender, subject }, 'Email is being analyzed');

    const aiResult = await analyzeEmail(subject, body, sender);
    logger.info({ msgId, status: aiResult.status }, 'AI decision');

    if (aiResult.status === 'IMPORTANT') {
        const messageId =
            parsed.messageId ?? `${sender}-${subject}-${Date.now()}`;

        const { error } = await supabase
            .from('important_emails')
            .upsert(
                {
                    sender_email:  sender,
                    subject:       subject,
                    body_content:  body,
                    summary:       aiResult.summary,
                    message_id:    messageId
                },
                { onConflict: 'message_id' }
            );

        if (error) throw new Error(`Supabase error: ${error.message}`);
        logger.info({ msgId, sender }, 'Important email saved to database');

    } else if (aiResult.status === 'REPLY' && aiResult.reply_text) {
        logger.info({ msgId, sender }, 'Sending automatic reply');
        await sendAutoReply(sender, aiResult.reply_text);
        logger.info({ msgId, sender }, 'Reply sent successfully');

    } else {
        logger.info({ msgId, sender, subject }, 'Email ignored');
    }

    await client.messageFlagsAdd(msgId, ['\\Seen']);
    logger.info({ msgId, subject }, 'Marked as read');

    return aiResult.status;
};

const processEmails = async (client: ImapFlow): Promise<void> => {
    if (isProcessing) {
        logger.info('Already processing, skipping...');
        return;
    }
    isProcessing = true;

    const stats = { total: 0, important: 0, reply: 0, ignore: 0, error: 0 };
    let lock: Awaited<ReturnType<typeof client.getMailboxLock>> | undefined;

    try {
        lock = await client.getMailboxLock('INBOX');
        const messages = await client.search({ seen: false });
        lock.release();
        lock = undefined;

        if (!messages || !messages.length) {
            logger.info('No new emails');
            return;
        }

        logger.info({ count: messages.length }, 'Processing unread emails');

        const limit = pLimit(3);

        const tasks = messages.map(msgId =>
            limit(async () => {
                stats.total++;
                try {
                    const status = await processSingleEmail(client, msgId);
                    if (status === 'IMPORTANT') stats.important++;
                    else if (status === 'REPLY')     stats.reply++;
                    else                              stats.ignore++;
                } catch (err: any) {
                    stats.error++;
                    logger.error({ msgId, err: err.message }, 'Email caused an error, skipping');
                }
            })
        );

        await Promise.allSettled(tasks);
        logger.info({ stats }, 'Email processing statistics');

    } catch (err: any) {
        logger.error({ err: err.message }, 'processEmails error');
    } finally {
        lock?.release();
        isProcessing = false;
    }
};

export const startIdleListener = async (): Promise<void> => {
    const client = new ImapFlow({
        host:    ENV.IMAP_HOST,
        port:    ENV.IMAP_PORT,
        secure:  true,
        auth:    { user: ENV.EMAIL_USER, pass: ENV.EMAIL_PASS },
        logger:  false,
        disableAutoIdle: false
    });

    await client.connect();
    await client.mailboxOpen('INBOX');
    logger.info('Waiting for new emails...');

    await processEmails(client);

    client.on('exists', async () => {
        logger.info('Processing new emails...');
        await processEmails(client);
    });

    client.on('error', async  (err: Error) => {
        logger.error({ err: err.message }, 'IMAP error — reconnecting in 5 seconds');
            try{
                await client.logout();
            }
            catch(e) {}
        setTimeout(() => startIdleListener(), 5_000);
    });
};