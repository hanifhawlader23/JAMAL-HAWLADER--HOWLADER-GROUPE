import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parse } from 'cookie';
import { sql } from '../_lib/db.js';
export default async function handler(req: VercelRequest, res: VercelResponse){
  try{ const raw=(req.headers as any)?.cookie ?? ((req as any)?.headers?.get?.('cookie')) ?? ''; const cookies=parse(raw); const email=cookies['session_email']; if(!email) return res.status(401).end();
    const rows:any[] = await sql`select id,email,role,coalesce(name,'') as name from users where lower(email)=lower(${email}) limit 1;`;
    if(!rows.length) return res.status(401).end(); const u=rows[0]; return res.status(200).json({id:String(u.id), username:String(u.email), role:String(u.role), fullName:String(u.name||'')});
  }catch(e){ return res.status(500).json({error:String(e)}); }
}
