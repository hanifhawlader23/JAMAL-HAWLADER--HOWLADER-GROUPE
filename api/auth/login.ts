import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serialize } from 'cookie';
import { sql } from '../_lib/db.js';
export default async function handler(req: VercelRequest, res: VercelResponse){
  if(req.method!=='POST') return res.status(405).end();
  try{ const b=(req.body??{}) as any; const email=String(b.username??b.email??'').toLowerCase(); const password=String(b.password??'');
    if(!email||!password) return res.status(400).json({message:'missing_fields'});
    const rows:any[] = await sql`select id,email,role,coalesce(name,'') as name from users where lower(email)=lower(${email}) and is_active=true and password_hash=crypt(${password},password_hash) limit 1;`;
    if(!rows.length) return res.status(401).json({message:'invalid_credentials'});
    const u=rows[0]; res.setHeader('Set-Cookie',[serialize('session_email',String(u.email),{httpOnly:true,secure:true,sameSite:'strict',path:'/',maxAge:60*60*24*7})]);
    return res.status(200).json({user:{id:String(u.id), username:String(u.email), role:String(u.role), fullName:String(u.name||'')}});
  }catch(e){ return res.status(500).json({message:String(e)}); }
}
