import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    const migrations = [
      path.resolve(
        process.cwd(),
        'supabase',
        'migrations',
        '0012_fix_quick_match_and_online_status.sql'
      ),
      path.resolve(process.cwd(), 'supabase', 'migrations', '0013_add_missing_fields_and_rls.sql')
    ];

    for (const m of migrations) {
      console.log('\n--- Running migration:', m, '\n');
      const sql = fs.readFileSync(m, 'utf8');
      try {
        await client.query(sql);
        console.log('Migration OK:', m);
      } catch (err) {
        console.error('Migration ERROR for', m);
        console.error(err);
        // continue to next to gather all errors
      }
    }
  } catch (err) {
    console.error('DB connection error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
