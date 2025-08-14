import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_lib/db.js';
async function ensure(){ await sql`create table if not exists companies( id uuid primary key default gen_random_uuid(), name text not null, email text, phone text, address text, logo_url text, created_at timestamptz default now() );`; }
export default async function handler(req: VercelRequest, res: VercelResponse){ await ensure(); const {method}=req;
  if(method==='GET'){ const rows:any[] = await sql`select * from companies order by created_at desc limit 1;`; return res.status(200).json(rows[0]??null); }
  if(method==='POST' || method==='PUT'){ const b=(req.body??{}) as any; const rows:any[] = await sql`insert into companies(name,email,phone,address,logo_url) values (${b.name}, ${b.email??null}, ${b.phone??null}, ${b.address??null}, ${b.logo_url??null}) returning *;`; if(rows.length) return res.status(200).json(rows[0]); }
  return res.status(405).end(); }
