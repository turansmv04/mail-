import z from "zod";
import * as dotenv from 'dotenv';
import path from "path";

const envPath = path.resolve(process.cwd(), '.env');

dotenv.config({ path: envPath });

const envSchema = z.object({
    EMAIL_USER: z.email(),
    EMAIL_PASS: z.string().min(1),
    IMAP_HOST: z.string().min(1),
    IMAP_PORT: z.coerce.number(),
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number(),
    SUPABASE_URL: z.url(),
    SUPABASE_ANON_KEY: z.string().min(1),
    API_KEY: z.string().min(1)
});


export const ENV = envSchema.parse(process.env);