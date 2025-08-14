// /api/auth/me — spinner fix
// Always returns 200 with { user: {...} } or { user: null }
// Works without DB; uses DB if available.
// Node runtime safe: no req.headers.get()

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parse } from 'cookie';

function getHeader(req: any, name: string) {
  const h = req?.headers;
  if (!h) return undefined;
  const key = name.toLowerCase();
  if (typeof (h as any).get === 'function') return (h as any).get(name) ?? (h as any).get(key);
  return (h as any)[name] ?? (h as any)[key];
}

async function tryLoadFromDb(email: string) {
  try {
    if (!process.env.DATABASE_URL) return null;
    const mod: any = await import('@neondatabase/serverless').catch(() => null as any);
    if (!mod?.neon) return null;
    const sql = mod.neon(process.env.DATABASE_URL!);
    const rows: any[] = await sql`select id, email, role, coalesce(name,'') as name from users where lower(email)=lower(${email}) limit 1;`;
    if (!rows?.length) return null;
    const r = rows[0];
    return { id: String(r.id), username: String(r.email), role: String(r.role), fullName: String(r.name || '') };
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // read cookie from Node/Edge styles
    const rawCookie = String(getHeader(req, 'cookie') || '');
    const cookies = parse(rawCookie);
    const email = cookies['session_email'] ?? cookies['session_token'];

    if (!email) {
      // not logged in → no 401, just { user: null } so UI won't spin forever
      return res.status(200).json({ user: null });
    }

    // Try DB; if not available, return minimal user from cookie
    const userFromDb = await tryLoadFromDb(String(email));
    const user = userFromDb ?? { id: null, username: String(email), role: 'user', fullName: '' };

    return res.status(200).json({ user });
  } catch (e: any) {
    // Even on error, keep the shape
    return res.status(200).json({ user: null, error: String(e?.message || e) });
  }
}
