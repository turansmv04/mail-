import { ImapFlow } from "imapflow";
import { simpleParser } from 'mailparser';
import * as dotenv from 'dotenv';
import {supabase} from './supabase.js'
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

export const fetchAndSaveEmails = async () => {
    await client.connect();

    const lock = await client.getMailboxLock('INBOX');
    
    try {
        const messages = await client.search({ seen: false });
        
        if (messages && messages.length > 0) {
            console.log(`${messages.length} yeni məktub tapıldı. Emal olunur...`);

            for (const msgId of messages) {
                const message = await client.fetchOne(msgId, { source: true });
                
                if (message && message.source) {
                    const parsed = await simpleParser(message.source);
                    
                    console.log(`İşlənir: ${parsed.subject}`);

            
                    const { error } = await supabase
                        .from('important_emails')
                        .insert([
                            { 
                                sender_email: parsed.from?.value?.[0]?.address ?? 'namelum@mail.com', 
                                subject: parsed.subject ?? 'Mövzusuz', 
                                body_content: parsed.text ?? 'Mətn tapılmadı',
                                summary: "AI analizi gözlənilir..." 
                            }
                        ]);

                    if (error) {
                        console.error("Supabase xətası:", error.message);
                    } else {
                        console.log(`✅ Bazaya yazıldı: ${parsed.subject}`);
                    }
                }
            }
        } else {
            console.log("Yeni məktub yoxdur. Qutu təmizdir.");
        }
    } catch (error) {
        console.error("Sistem xətası baş verdi:", error);
    } finally {
        lock.release();
    }

    await client.logout();
};

fetchAndSaveEmails().catch(err => console.error("Kritik xəta:", err));