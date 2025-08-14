import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serialize } from 'cookie';
import { sql } from '../_lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const body = (req.body ?? {}) as any;
    const userEmail = String(body.username ?? body.email ?? '').toLowerCase();
    const password  = String(body.password ?? '');
    if (!userEmail || !password) return res.status(400).json({ message: 'missing_fields' });

    const rows: any[] = await sql`
      select id, email, role, coalesce(name, '') as name
      from users
      where lower(email)=lower(${userEmail})
        and is_active=true
        and password_hash = crypt(${password}, password_hash)
      limit 1;`;
    if (!rows.length) return res.status(401).json({ message: 'invalid_credentials' });

    const row = rows[0];
    // set cookies for session
    res.setHeader('Set-Cookie', [
      serialize('session_email', String(row.email), { httpOnly:true, secure:true, sameSite:'strict', path:'/', maxAge:60*60*24*7 }),
    ]);

    // return the exact shape the app expects
    const user = {
      id: String(row.id),
      username: String(row.email),
      role: String(row.role),
      fullName: String(row.name || '')
    };
    return res.status(200).json({ user });
  } catch (e) {
    return res.status(500).json({ message: String(e) });
  }
}
