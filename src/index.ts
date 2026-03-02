import { ImapFlow } from "imapflow";
import { simpleParser } from 'mailparser';
import { supabase } from './supabase';
import { analyzeEmail } from './ai';
import { sendAutoReply } from "./mailler";
import pLimit from "p-limit";
import { ENV } from "./config";
import { logger } from "./logger";

let isProcessing = false;

const startIdleListener = async () => {
    const client = new ImapFlow({
        host: 'imap.gmail.com',
        port: 993,
        secure: true,
        auth: {
            user: ENV.EMAIL_USER,
            pass: ENV.EMAIL_PASS
        },
        logger: false,
        disableAutoIdle: false
    });

    await client.connect();
    await client.mailboxOpen('INBOX');

    logger.info("Yeni email gozlenilir....");

    await processEmails(client);

    client.on("exists", async () => {
        logger.info("Yeni mailler islenilir..");
        await processEmails(client);
    });

    client.on("error", async (err) => {
        logger.error({ err: err.message }, "Imap xeta");
        setTimeout(() => startIdleListener(), 5000);
    });
};

const processSingleEmail = async (client: ImapFlow, msgId: number): Promise<string> => {
    const message = await client.fetchOne(msgId, { source: true });

    if (!message || !message.source) return "IGNORE";

    const parsed = await simpleParser(message.source);

    const subject = parsed.subject ?? 'Mövzusuz';
    const sender = parsed.from?.value?.[0]?.address ?? 'namelum@mail.com';

    const attachmentInfo = parsed.attachments?.length
        ? `\n\nƏlavə fayllar: ${parsed.attachments.map(a => `${a.filename} (${a.contentType})`).join(', ')}`
        : '';

    const body = (parsed.text ?? 'Mətn yoxdur').slice(0, 3000) + attachmentInfo;

    logger.info({ msgId, sender, subject }, "Email analiz edilir");

    const aiResult = await analyzeEmail(subject, body, sender);
    logger.info({ msgId, status: aiResult.status }, "AI qerari");

    if (aiResult.status === "IMPORTANT") {
        const messageId = parsed.messageId ?? `${sender}-${subject}-${Date.now()}`;

        const { error } = await supabase
            .from('important_emails')
            .upsert({
                sender_email: sender,
                subject: subject,
                body_content: body,
                summary: aiResult.summary,
                message_id: messageId
            }, { onConflict: 'message_id' });

        if (!error) logger.info({ msgId, sender }, "Vacib email bazaya yazildi");
        else throw new Error(`Supabase xətası: ${error.message}`);

    } else if (aiResult.status === "REPLY" && aiResult.reply_text) {
        logger.info({ msgId, sender }, "Avtomatik cavab gonderilir");
        await sendAutoReply(sender, aiResult.reply_text);
        logger.info({ msgId, sender }, "Cavab ugurla gonderildi");

    } else if (aiResult.status === "IGNORE") {
        logger.info({ msgId, sender, subject }, "Email ignore edildi");
    }

    await client.messageFlagsAdd(msgId, ['\\Seen']);
    logger.info({ msgId, subject }, "Oxundu olaraq isarelendi");

    return aiResult.status;
};

const processEmails = async (client: ImapFlow) => {
    if (isProcessing) {
        logger.info("Artiq islenilir, kecilir...");
        return;
    }
    isProcessing = true;

    const stats = { total: 0, important: 0, reply: 0, ignore: 0, error: 0 };

    let lock;
    try {
        lock = await client.getMailboxLock('INBOX');

        const messages = await client.search({ seen: false });

        if (messages && messages.length > 0) {
            logger.info({ count: messages.length }, "Yeni oxunmamis mailler emal olunur");

            const limit = pLimit(3);

            const tasks = messages.map(msgId =>
                limit(async () => {
                    stats.total++;
                    try {
                        const status = await processSingleEmail(client, msgId);
                        if (status === "IMPORTANT") stats.important++;
                        else if (status === "REPLY") stats.reply++;
                        else if (status === "IGNORE") stats.ignore++;
                    } catch (emailErr: any) {
                        stats.error++;
                        logger.error({ msgId, err: emailErr.message }, "Email xeta verdi, kecilir");
                    }
                })
            );

            await Promise.allSettled(tasks);

            logger.info({ stats }, "Email emal statistikasi");

        } else {
            logger.info("Yeni mail yoxdur");
        }

    } catch (err: any) {
        logger.error({ err: err.message }, "Process xetasi");
    } finally {
        if (lock) lock.release();
        isProcessing = false;
    }
};

startIdleListener().catch(err => {
    console.error("FATAL ERROR", err);
    process.exit(1);
});