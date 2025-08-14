import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serialize } from 'cookie';
import { sql } from '../_lib/db.js';
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const body = (req.body ?? {}) as any;
  const userEmail = String(body.email ?? body.username ?? '').toLowerCase();
  const password  = String(body.password ?? '');
  if (!userEmail || !password) return res.status(400).json({ error: 'missing_fields' });
  try {
    const rows: any[] = await sql`
      select id, email, role
      from users
      where lower(email)=lower(${userEmail})
        and is_active=true
        and password_hash = crypt(${password}, password_hash)
      limit 1;`;
    if (!rows.length) return res.status(401).json({ error:'invalid_credentials' });
    res.setHeader('Set-Cookie', [
      serialize('session_email', String(rows[0].email), { httpOnly:true, secure:true, sameSite:'strict', path:'/', maxAge:60*60*24*7 }),
      serialize('session_role',  String(rows[0].role),  { httpOnly:true, secure:true, sameSite:'strict', path:'/', maxAge:60*60*24*7 }),
    ]);
    return res.status(200).json({ ok:true, role: rows[0].role });
  } catch (e) {
    return res.status(500).json({ ok:false, error:String(e) });
  }
}
