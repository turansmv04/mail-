import { createClient } from '@supabase/supabase-js';
import { Database } from './types/supabase';
import { ENV } from './config';

export const supabase = createClient<Database>(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY);