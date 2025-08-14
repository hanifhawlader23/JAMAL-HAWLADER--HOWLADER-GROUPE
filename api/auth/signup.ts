import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db.js';
export default async function handler(req: VercelRequest, res: VercelResponse){
  if(req.method!=='POST') return res.status(405).end();
  try{ const b=(req.body??{}) as any; const email=String(b.username??b.email??'').toLowerCase(); const password=String(b.password??''); const fullName=b.fullName?String(b.fullName):null;
    if(!email||!password) return res.status(400).json({message:'missing_fields'});
    await sql`create extension if not exists pgcrypto;`;
    await sql`create table if not exists users( id uuid primary key default gen_random_uuid(), email text unique not null, password_hash text not null, name text, role text not null default 'user' check (role in ('user','admin')), is_active boolean not null default true, created_at timestamptz default now() );`;
    await sql`alter table users add column if not exists name text;`;
    await sql`create unique index if not exists users_email_lower_idx on users (lower(email));`;
    const rows:any[] = await sql`insert into users(email,password_hash,name) values (lower(${email}), crypt(${password}, gen_salt('bf')), ${fullName}) on conflict (email) do nothing returning id,email,role,coalesce(name,'') as name;`;
    if(!rows.length) return res.status(409).json({message:'email_exists'});
    const u=rows[0]; return res.status(201).json({user:{id:String(u.id), username:String(u.email), role:String(u.role), fullName:String(u.name||'')}});
  }catch(e){ return res.status(500).json({message:String(e)}); }
}
