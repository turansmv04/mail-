import {createClient} from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();


const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if(!supabaseKey  || !supabaseUrl) {
    throw new Error("Supabase url ve ya key .env-de tapilmadi.")
};

export const supabase = createClient(supabaseUrl,supabaseKey);