import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parse } from 'cookie';
import { sql } from '../_lib/db.js';

// Returns the raw User object the frontend expects
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const rawCookie = (req.headers as any)?.cookie ?? ((req as any)?.headers?.get?.('cookie')) ?? '';
    const cookies = parse(rawCookie);
    const email = cookies['session_email'];
    if (!email) return res.status(401).end();

    const rows: any[] = await sql`select id, email, role, coalesce(name, '') as name from users where lower(email)=lower(${email}) limit 1;`;
    if (!rows.length) return res.status(401).end();
    const row = rows[0];

    const user = {
      id: String(row.id),
      username: String(row.email),
      role: String(row.role),
      fullName: String(row.name || '')
    };
    return res.status(200).json(user);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
