import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_lib/db.js';
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  await sql`
    insert into users (email, password_hash, role, name)
    values
    (lower('admin@hawlader.eu'), crypt('Hawlader@2025!', gen_salt('bf')), 'admin', 'Admin'),
    (lower('hanif@hawlader.eu'),  crypt('Hanif@2025!',   gen_salt('bf')), 'admin', 'Hanif')
    on conflict (email) do update
    set role='admin', password_hash=excluded.password_hash, is_active=true;`;
  res.status(200).json({ ok:true, step:'seed' });
}
