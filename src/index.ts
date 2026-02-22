import { ImapFlow } from "imapflow";
import { simpleParser } from 'mailparser';
import * as dotenv from 'dotenv';
import { supabase } from './supabase.js';
import { analyzeEmail } from './ai.js';
import { sendAutoReply } from "./mailler.js";
dotenv.config();

const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER!,
        pass: process.env.EMAIL_PASS!
    },
    logger: false
});

export const fetchAndProcessEmails = async () => {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    
    try {
        const messages = await client.search({ seen: false }); 
        
        if (messages) {
            for (const msgId of messages) {
                const message = await client.fetchOne(msgId, { source: true });
                
                if (message) { 
                    const parsed = await simpleParser(message.source!);
                    
                    const subject = parsed.subject ?? 'Movzusuz';
                    const body = parsed.text ?? 'Metn yoxdur';
                    const sender = parsed.from?.value?.[0]?.address ?? 'namelum@mail.com';

                    console.log(`Analiz edilir: ${subject}`);

                    const aiResult = await analyzeEmail(subject, body);
                    console.log(`AI Qerari: ${aiResult.status}`);
                    
                    if (aiResult.status === "IMPORTANT") {
                        const { error } = await supabase
                            .from('important_emails')
                            .insert([{ 
                                sender_email: sender, 
                                subject: subject, 
                                body_content: body,
                                summary: aiResult.summary 
                            }]);

                        if (!error) console.log("Vacib email bazaya yazildi.");
                    } else {
                        console.log(`Avtomatik cavab: ${aiResult.reply_text}`);
                        if(aiResult.reply_text) {
                             await sendAutoReply(sender, aiResult.reply_text)
                        }
                    }

await client.messageFlagsAdd(msgId, ['\\Seen']);
console.log("Gordum ve oxundu etdim", subject);



                }
            }
        }
    } finally {
        lock.release();
    }
    await client.logout();
};

fetchAndProcessEmails().catch(err => console.error(err));