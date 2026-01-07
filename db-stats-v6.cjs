
const { Client } = require('pg');

const client = new Client({
    user: 'postgres',
    host: '2a05:d016:571:a40f:7d6a:9380:ffeb:ac13',
    database: 'postgres',
    password: 'ZrJVXLs2VlGd5gTP',
    port: 5432,
});

async function main() {
    try {
        console.log('Attempting to connect via IPv6...');
        await client.connect();
        console.log('Connected!');

        const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('Tables:', res.rows.map(r => r.table_name).join(', '));

    } catch (err) {
        console.error('Connection failed:', err.message);
    } finally {
        await client.end();
    }
}

main();
