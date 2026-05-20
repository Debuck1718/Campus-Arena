import { Client } from 'pg';

const dbUrl =
  process.env.DATABASE_URL ||
  'postgresql://postgres:CampusArena12345%25@db.xrgnetsyuobshitnpgmi.supabase.co:5432/postgres';

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  const res = await client.query(
    `UPDATE auth.users SET email_confirmed_at = now() WHERE email = $1 RETURNING id;`,
    ['flowtest001@campusarena.com']
  );
  console.log('updated', res.rowCount, 'rows', res.rows);
} catch (err) {
  console.error(err);
  process.exit(1);
} finally {
  await client.end();
}
