import { supabase } from './src/integrations/supabase/client.ts';

async function testSupabase() {
    try {
        console.log('Attempting to connect to Supabase...');
        const { data, error } = await supabase.from('items_metadata').select('*').limit(1);

        if (error) {
            console.error('Error fetching from Supabase:', error.message);
            process.exit(1);
        } else {
            console.log('Successfully connected to Supabase!');
            console.log('Sample Data:', data);
            process.exit(0);
        }
    } catch (err) {
        console.error('Unexpected error:', err);
        process.exit(1);
    }
}

testSupabase();
