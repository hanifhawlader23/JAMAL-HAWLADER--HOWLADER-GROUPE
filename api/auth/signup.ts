
import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import { Role } from '../../types';

export default async function POST(req: Request) {
  try {
    const { fullName, username, password } = await req.json();

    if (!fullName || !username || !password) {
      return new Response(JSON.stringify({ message: 'All fields are required' }), { status: 400 });
    }

    const { rows: existingUsers } = await sql`SELECT * FROM users WHERE username = ${username.toLowerCase()}`;
    if (existingUsers.length > 0) {
      return new Response(JSON.stringify({ message: 'A user with this email already exists.' }), { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const { rows } = await sql`
      INSERT INTO users (full_name, username, password, role)
      VALUES (${fullName}, ${username.toLowerCase()}, ${hashedPassword}, ${Role.USER})
      RETURNING id, full_name, username, role;
    `;
    const newUser = rows[0];

    const token = jwt.sign(
      { userId: newUser.id, role: newUser.role },
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
    
    return new Response(JSON.stringify({ user: newUser }), {
      status: 201,
      headers: { 'Set-Cookie': cookie },
    });

  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  }
}