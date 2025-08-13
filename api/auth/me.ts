
import { sql } from '@vercel/postgres';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

export default async function GET(req: Request) {
  const cookies = parse(req.headers.get('Cookie') || '');
  const token = cookies.token;

  if (!token) {
    return new Response(JSON.stringify({ message: 'Not authenticated' }), { status: 401 });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
    
    const { rows } = await sql`SELECT id, username, role, full_name FROM users WHERE id = ${decoded.userId}`;
    const user = rows[0];

    if (!user) {
      return new Response(JSON.stringify({ message: 'User not found' }), { status: 404 });
    }

    return new Response(JSON.stringify(user), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ message: 'Invalid token' }), { status: 401 });
  }
}