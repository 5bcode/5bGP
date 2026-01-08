
const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:ZrJVXLs2VlGd5gTP@db.kyyxqrocfrifjhcenwpe.supabase.co:5432/postgres"
});

async function main() {
    try {
        await client.connect();
        console.log('Connected to PostgreSQL database');

        const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

        console.log('\nTables in public schema:');
        if (res.rows.length === 0) {
            console.log('No tables found.');
        } else {
            for (let row of res.rows) {
                console.log(`- ${row.table_name}`);
                const colRes = await client.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = $1 AND table_schema = 'public';
        `, [row.table_name]);
                colRes.rows.forEach(col => {
                    console.log(`  * ${col.column_name} (${col.data_type})`);
                });
            }
        }

    } catch (err) {
        console.error('Error executing query', err.stack);
    } finally {
        await client.end();
    }
}

main();
