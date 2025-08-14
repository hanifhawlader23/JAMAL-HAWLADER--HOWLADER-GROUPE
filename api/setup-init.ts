import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_lib/db.js';
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  await sql`create extension if not exists pgcrypto;`;
  await sql`
    create table if not exists users(
      id uuid primary key default gen_random_uuid(),
      email text unique not null,
      password_hash text not null,
      name text,
      role text not null default 'user' check (role in ('user','admin')),
      is_active boolean not null default true,
      created_at timestamptz default now()
    );`;
  await sql`create unique index if not exists users_email_lower_idx on users (lower(email));`;
  res.status(200).json({ ok:true, step:'init' });
}
