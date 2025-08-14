import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_lib/db.js';
async function ensure(){ await sql`create table if not exists deliveries( id uuid primary key default gen_random_uuid(), entry_id uuid references entries(id) on delete cascade, qty integer not null, delivered_at timestamptz default now() );`; }
export default async function handler(req: VercelRequest, res: VercelResponse){ await ensure(); const {method, query}=req;
  if(method==='GET'){ if(query.entry_id){ const rows:any[] = await sql`select * from deliveries where entry_id=${String(query.entry_id)} order by delivered_at desc;`; return res.status(200).json(rows);} const rows:any[] = await sql`select * from deliveries order by delivered_at desc limit 500;`; return res.status(200).json(rows); }
  if(method==='POST'){ const b=(req.body??{}) as any; const rows:any[] = await sql`insert into deliveries(entry_id, qty, delivered_at) values (${b.entry_id}, ${b.qty}, ${b.delivered_at??null}) returning *;`; return res.status(201).json(rows[0]); }
  if(method==='DELETE'){ const id=String((req.query.id ?? (req.body as any)?.id) ?? ''); if(!id) return res.status(400).json({message:'missing id'}); await sql`delete from deliveries where id=${id}`; return res.status(200).json({ok:true}); }
  return res.status(405).end(); }
