import z from "zod";
import * as dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
    EMAIL_USER: z.email(),
    EMAIL_PASS:z.string().min(1),
    SUPABASE_URL:z.url(),
    SUPABASE_ANON_KEY:z.string().min(1),
    API_KEY:z.string().min(1)
});

export const ENV = envSchema.parse(process.env);


