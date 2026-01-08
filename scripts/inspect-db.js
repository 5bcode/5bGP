
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://kyyxqrocfrifjhcenwpe.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eXhxcm9jZnJpZmpoY2Vud3BlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NDg4NTQsImV4cCI6MjA4MjUyNDg1NH0.wDfrdqyCgguWdq6XIdiNZZ3MSfhMpYt35Ak_sDT9w04";

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
    console.log('Fetching schema information...');

    // Note: The anon key usually doesn't have permissions to query information_schema or pg_tables
    // directly unless explicitly granted. However, we can try to "guess" or use a common PostgREST hack
    // if the API exposes it, or just report the restriction.

    const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

    if (error) {
        console.log('Restricted access: Cannot list tables directly via information_schema with the anon key.');
        console.log('Error details:', error.message);

        // Fallback: try to see if we can access common tables to verify if ANY table exists
        const commonTables = ['profiles', 'users', 'items', 'market_data', 'trade_history'];
        console.log('\nTesting common table names...');
        for (const table of commonTables) {
            const { error: tableError } = await supabase.from(table).select('*').limit(0);
            if (!tableError) {
                console.log(`[FOUND] Table '${table}' is accessible.`);
            } else if (tableError.code !== 'PGRST116' && tableError.code !== '42P01') {
                // PGRST116/42P01 usually means table doesn't exist. 
                // Other errors (like 42501 - permission denied) imply the table EXISTS but is protected by RLS.
                console.log(`[EXIST?] Table '${table}' might exist but returned error: ${tableError.message} (Code: ${tableError.code})`);
            }
        }
    } else {
        console.log('Tables found in public schema:');
        console.table(data);
    }
}

listTables();
