import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db.js';
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const body = (req.body ?? {}) as any;
    const userEmail = String(body.email ?? body.username ?? '').toLowerCase();
    const password  = String(body.password ?? '');
    const fullName  = body.fullName ? String(body.fullName) : null;
    if (!userEmail || !password) return res.status(400).json({ error: 'missing_fields' });
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
    const rows = await sql`
      insert into users (email, password_hash, name)
      values (lower(${userEmail}), crypt(${password}, gen_salt('bf')), ${fullName})
      on conflict (email) do nothing
      returning id;`;
    if (!rows.length) return res.status(409).json({ error: 'email_exists' });
    return res.status(201).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
