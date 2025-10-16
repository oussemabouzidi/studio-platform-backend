// Alternative database connection using Supabase REST API
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cxdbwekciccqkleqehuw.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key-here';

const supabase = createClient(supabaseUrl, supabaseKey);

export const supabaseClient = supabase;

// Alternative method to get studios using Supabase REST API
export async function getAllStudiosSupabase() {
  try {
    const { data, error } = await supabase
      .from('studio')
      .select(`
        id,
        name,
        avatar_link,
        location,
        description,
        email,
        phone,
        website,
        instagram,
        soundCloud,
        youtube,
        studio_rules,
        cancellation_policy
      `);
    
    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }
    
    return data || [];
  } catch (error) {
    console.error('Supabase query error:', error);
    throw error;
  }
}
