
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://kyyxqrocfrifjhcenwpe.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eXhxcm9jZnJpZmpoY2Vud3BlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NDg4NTQsImV4cCI6MjA4MjUyNDg1NH0.wDfrdqyCgguWdq6XIdiNZZ3MSfhMpYt35Ak_sDT9w04";

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data, error } = await supabase.rpc('get_service_status'); // Generic RPC check
    if (error) {
        console.log('RPC failed, checking auth/health...');
        const { data: authData, error: authError } = await supabase.auth.getSession();
        if (authError) {
            console.error('Auth check failed:', authError.message);
        } else {
            console.log('Supabase endpoint is reachable. Auth session checked.');
        }
    } else {
        console.log('Successfully connected and RPC call succeeded.');
    }
}

test();
