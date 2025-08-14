// Drop-in /api/data.ts (Node runtime safe, Edge-compatible header reading)
// - Fixes: "TypeError: req.headers.get is not a function"
// - Auth: reads 'session_email' or 'session_token' cookie
// - DB: if DATABASE_URL and @neondatabase/serverless exist, returns counts from DB
//       otherwise returns mock stats so the UI never crashes.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parse } from 'cookie';

function getHeader(req: any, name: string) {
  const h = req?.headers;
  if (!h) return undefined;
  const key = name.toLowerCase();
  // Edge-style Headers.get()
  if (typeof (h as any).get === 'function') {
    return (h as any).get(name) ?? (h as any).get(key);
  }
  // Node-style object
  return (h as any)[name] ?? (h as any)[key];
}

function requireAuth(req: VercelRequest) {
  const rawCookie = String(getHeader(req, 'cookie') || '');
  const cookies = parse(rawCookie);
  const session = cookies['session_email'] ?? cookies['session_token'];
  if (!session) throw new Error('unauthorized');
  return session;
}

async function tryDbStats() {
  try {
    if (!process.env.DATABASE_URL) return null;
    // dynamic import so build doesn't fail if package is missing
    const mod: any = await import('@neondatabase/serverless').catch(() => null as any);
    if (!mod?.neon) return null;
    const sql = mod.neon(process.env.DATABASE_URL!);
    const rows: any[] = await sql`
      with e as (select count(*)::int as entries from entries),
           d as (select count(*)::int as deliveries from deliveries),
           c as (select count(*)::int as clients from clients),
           p as (select count(*)::int as products from products)
      select e.entries, d.deliveries, c.clients, p.products from e,d,c,p;`;
    return rows?.[0] ?? null;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ ok:false, message:'method_not_allowed' });

    const me = requireAuth(req);           // throws 401 if missing
    const stats = await tryDbStats();      // null => fallback

    return res.status(200).json({
      ok: true,
      me,
      stats: stats ?? { entries: 0, deliveries: 0, clients: 0, products: 0 }
    });
  } catch (e: any) {
    const msg = e?.message || String(e);
    const code = msg === 'unauthorized' ? 401 : 500;
    return res.status(code).json({ ok:false, message: msg });
  }
}
