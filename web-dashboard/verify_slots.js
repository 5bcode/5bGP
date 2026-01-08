import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://kyyxqrocfrifjhcenwpe.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eXhxcm9jZnJpZmpoY2Vud3BlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NDg4NTQsImV4cCI6MjA4MjUyNDg1NH0.wDfrdqyCgguWdq6XIdiNZZ3MSfhMpYt35Ak_sDT9w04";
const userId = "b5f828e9-4fe5-4918-beea-ae829487e319";

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking active_offers for user:", userId);
    const { data, error } = await supabase
        .from("active_offers")
        .select("*")
        .eq("user_id", userId);

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Found", data.length, "offers.");
        if (data.length > 0) {
            console.log(JSON.stringify(data, null, 2));
        } else {
            console.log("No offers found. Is the plugin running and logged in?");
        }
    }
}

check();
