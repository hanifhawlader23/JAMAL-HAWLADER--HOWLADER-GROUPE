import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_lib/db.js';
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const rows: any[] = await sql`select now() as now`;
    const now = Array.isArray(rows) && rows.length ? rows[0].now : null;
    return res.status(200).json({ ok: true, now });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
