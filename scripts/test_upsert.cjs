const https = require('https');

// Test 1: Remove quantity_filled
const data1 = JSON.stringify([
    {
        user_id: "b5f828e9-4fe5-4918-beea-ae829487e319",
        slot: 1,
        item_id: 4151,
        item_name: "Abyssal whip (Test 1)",
        price: 1500000,
        quantity: 1,
        // quantity_filled removed
        offer_type: "buy",
        status: "TEST_ACTIVE",
        updated_at: new Date().toISOString()
    }
]);

// Test 2: Try quantity_sold
const data2 = JSON.stringify([
    {
        user_id: "b5f828e9-4fe5-4918-beea-ae829487e319",
        slot: 2,
        item_id: 4151,
        item_name: "Abyssal whip (Test 2)",
        price: 1500000,
        quantity: 1,
        quantity_sold: 0,
        offer_type: "buy",
        status: "TEST_ACTIVE",
        updated_at: new Date().toISOString()
    }
]);

const options = {
    hostname: 'kyyxqrocfrifjhcenwpe.supabase.co',
    path: '/rest/v1/active_offers?on_conflict=user_id,slot',
    method: 'POST',
    headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eXhxcm9jZnJpZmpoY2Vud3BlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NDg4NTQsImV4cCI6MjA4MjUyNDg1NH0.wDfrdqyCgguWdq6XIdiNZZ3MSfhMpYt35Ak_sDT9w04',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eXhxcm9jZnJpZmpoY2Vud3BlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NDg4NTQsImV4cCI6MjA4MjUyNDg1NH0.wDfrdqyCgguWdq6XIdiNZZ3MSfhMpYt35Ak_sDT9w04',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
        // Content-Length will be set in request
    }
};

function send(d, label) {
    const opts = { ...options, headers: { ...options.headers, 'Content-Length': d.length } };
    const req = https.request(opts, (res) => {
        console.log(`${label} STATUS: ${res.statusCode}`);
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            console.log(`${label} BODY: ${chunk}`);
        });
    });
    req.write(d);
    req.end();
}

send(data1, "TEST 1 (No Filled)");
setTimeout(() => send(data2, "TEST 2 (quantity_sold)"), 2000);
