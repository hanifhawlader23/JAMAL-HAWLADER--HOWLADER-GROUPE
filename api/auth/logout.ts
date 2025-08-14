import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serialize } from 'cookie';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const clear = (name: string) => serialize(name, '', { httpOnly:true, secure:true, sameSite:'strict', path:'/', maxAge:0 });
  res.setHeader('Set-Cookie', [clear('session_email')]);
  return res.status(200).json({ ok: true });
}
