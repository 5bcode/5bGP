
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://kyyxqrocfrifjhcenwpe.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eXhxcm9jZnJpZmpoY2Vud3BlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NDg4NTQsImV4cCI6MjA4MjUyNDg1NH0.wDfrdqyCgguWdq6XIdiNZZ3MSfhMpYt35Ak_sDT9w04";

const supabase = createClient(supabaseUrl, supabaseKey);

async function finalProbe() {
    const tables = ['trades', 'watchlists', 'items_metadata', 'active_offers'];
    console.log('Final Table Probe:');
    for (const t of tables) {
        const { error } = await supabase.from(t).select('*').limit(0);
        if (error) {
            console.log(`- ${t}: ${error.message} (${error.code})`);
        } else {
            console.log(`- ${t}: ONLINE`);
        }
    }
}

finalProbe();
