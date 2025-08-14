import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parse } from 'cookie';
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const rawCookie = (req.headers as any)?.cookie ?? ((req as any)?.headers?.get?.('cookie')) ?? '';
    const cookies = parse(rawCookie);
    const email = cookies['session_email'];
    const role  = cookies['session_role'];
    if (!email || !role) return res.status(401).json({ ok: false });
    return res.status(200).json({ ok: true, user: { email, role } });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
