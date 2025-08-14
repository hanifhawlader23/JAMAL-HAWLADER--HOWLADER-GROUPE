import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_lib/db.js';
export default async function handler(req: VercelRequest, res: VercelResponse){
  const {method, query}=req;
  if(method==='GET'){
    if(query.id){ const r:any[] = await sql`select id, email as username, role, coalesce(name,'') as fullName, is_active from users where id=${String(query.id)} limit 1;`; return res.status(200).json(r[0]??null); }
    const rows:any[] = await sql`select id, email as username, role, coalesce(name,'') as fullName, is_active from users order by created_at desc limit 200;`; return res.status(200).json(rows);
  }
  if(method==='POST'){
    const b=(req.body??{}) as any; const rows:any[] = await sql`insert into users(email,password_hash,name,role,is_active) values (lower(${String(b.username)}), crypt(${String(b.password??'123456')}, gen_salt('bf')), ${b.fullName??null}, ${b.role??'user'}, ${b.is_active??true}) returning id, email as username, role, coalesce(name,'') as fullName, is_active;`; return res.status(201).json(rows[0]);
  }
  if(method==='PUT'){
    const b=(req.body??{}) as any; if(!b.id) return res.status(400).json({message:'missing id'});
    const rows:any[] = await sql`update users set email=lower(${String(b.username)}), name=${b.fullName??null}, role=${b.role??'user'}, is_active=${b.is_active??true} where id=${String(b.id)} returning id, email as username, role, coalesce(name,'') as fullName, is_active;`; return res.status(200).json(rows[0]);
  }
  if(method==='DELETE'){
    const id=String((req.query.id ?? (req.body as any)?.id) ?? ''); if(!id) return res.status(400).json({message:'missing id'});
    await sql`delete from users where id=${id}`; return res.status(200).json({ok:true});
  }
  return res.status(405).end();
}
