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

    const subject  = parsed.subject ?? 'Mövzusuz';
    const sender   = parsed.from?.value?.[0]?.address ?? 'namelum@mail.com';
    const attachmentInfo = parsed.attachments?.length
        ? `\n\nƏlavə fayllar: ${parsed.attachments
              .map(a => `${a.filename} (${a.contentType})`)
              .join(', ')}`
        : '';
    const body = (parsed.text ?? 'Mətn yoxdur').slice(0, 3000) + attachmentInfo;

    logger.info({ msgId, sender, subject }, 'Email analiz edilir');

    const aiResult = await analyzeEmail(subject, body, sender);
    logger.info({ msgId, status: aiResult.status }, 'AI qərari');

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

        if (error) throw new Error(`Supabase xətası: ${error.message}`);
        logger.info({ msgId, sender }, 'Vacib email bazaya yazıldı');

    } else if (aiResult.status === 'REPLY' && aiResult.reply_text) {
        logger.info({ msgId, sender }, 'Avtomatik cavab göndərilir');
        await sendAutoReply(sender, aiResult.reply_text);
        logger.info({ msgId, sender }, 'Cavab uğurla göndərildi');

    } else {
        logger.info({ msgId, sender, subject }, 'Email ignore edildi');
    }

    await client.messageFlagsAdd(msgId, ['\\Seen']);
    logger.info({ msgId, subject }, 'Oxundu olaraq işarələndi');

    return aiResult.status;
};

const processEmails = async (client: ImapFlow): Promise<void> => {
    if (isProcessing) {
        logger.info('Artıq işlənilir, keçilir...');
        return;
    }
    isProcessing = true;

    const stats = { total: 0, important: 0, reply: 0, ignore: 0, error: 0 };
    let lock: Awaited<ReturnType<typeof client.getMailboxLock>> | undefined;

    try {
        lock = await client.getMailboxLock('INBOX');
        const messages = await client.search({ seen: false });

        if (!messages ||!messages.length) {
            logger.info('Yeni mail yoxdur');
            return;
        }

        logger.info({ count: messages.length }, 'Oxunmamış mailler emal olunur');

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
                    logger.error({ msgId, err: err.message }, 'Email xəta verdi, keçilir');
                }
            })
        );

        await Promise.allSettled(tasks);
        logger.info({ stats }, 'Email emal statistikası');

    } catch (err: any) {
        logger.error({ err: err.message }, 'processEmails xətası');
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
    logger.info('Yeni email gözlənilir...');

    await processEmails(client);

    client.on('exists', async () => {
        logger.info('Yeni mailler işlənilir...');
        await processEmails(client);
    });

    client.on('error', (err: Error) => {
        logger.error({ err: err.message }, 'IMAP xətası — 5 saniyə sonra yenidən qoşulur');
        setTimeout(() => startIdleListener(), 5_000);
    });
};