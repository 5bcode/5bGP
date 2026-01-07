
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://kyyxqrocfrifjhcenwpe.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eXhxcm9jZnJpZmpoY2Vud3BlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NDg4NTQsImV4cCI6MjA4MjUyNDg1NH0.wDfrdqyCgguWdq6XIdiNZZ3MSfhMpYt35Ak_sDT9w04";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkApiKeyTable() {
    const { error } = await supabase.from('api_keys').select('*').limit(0);
    if (error) {
        console.log('api_keys:', error.message);
    } else {
        console.log('api_keys: ONLINE');
    }
}

checkApiKeyTable();
