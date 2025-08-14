

import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

export default async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return new Response(JSON.stringify({ message: 'Username and password are required' }), { status: 400 });
    }

    const { rows } = await sql`SELECT * FROM users WHERE username = ${username.toLowerCase()}`;
    const user = rows[0];

    if (!user) {
      return new Response(JSON.stringify({ message: 'Invalid email or password.' }), { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return new Response(JSON.stringify({ message: 'Invalid email or password.' }), { status: 401 });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    const cookie = serialize('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });

    const { password: _, ...userWithoutPassword } = user;

    return new Response(JSON.stringify({ user: userWithoutPassword }), {
      status: 200,
      headers: { 'Set-Cookie': cookie },
    });

  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  }
}
