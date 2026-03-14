import nodemailer from 'nodemailer';
import { ENV } from './config';
import { logger } from './logger';

const transport = nodemailer.createTransport({
    host: ENV.SMTP_HOST,
    port: ENV.SMTP_PORT,
    secure: true,
    auth: {
        user: ENV.EMAIL_USER,
        pass: ENV.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized:false
    }
});

export const sendAutoReply = async (to: string, text: string) => {
    try {
        await transport.sendMail({
            from: ENV.EMAIL_USER,
            to: to,
            subject: "About the application",
            text: text,
        });
        logger.info({ to }, "Email sent");
    } catch (error: any) {
        logger.error({ err: error.message, to }, "Email sending error");
        throw error;
    }
};