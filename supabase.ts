
import { createClient } from '@supabase/supabase-js';

// Note: These values should be provided by the environment
// In this specific sandbox environment, we use placeholders or global variables if provided
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
