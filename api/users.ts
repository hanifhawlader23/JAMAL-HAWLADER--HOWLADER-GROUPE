
import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Role } from '../../types';

export const runtime = 'edge';

// A simple auth check placeholder; replace with your actual auth logic
async function checkAuth(req: Request) { return true; }

export async function POST(req: Request) {
    if (!await checkAuth(req)) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { action, payload } = await req.json();

        switch (action) {
            case 'create': {
                const { fullName, username, password, role } = payload;
                if (!fullName || !username || !password || !role) {
                    return NextResponse.json({ message: 'Missing required fields for user creation' }, { status: 400 });
                }
                const hashedPassword = await bcrypt.hash(password, 10);
                const { rows } = await sql`
                    INSERT INTO users (full_name, username, password, role)
                    VALUES (${fullName}, ${username.toLowerCase()}, ${hashedPassword}, ${role})
                    RETURNING id, full_name, username, role;
                `;
                return NextResponse.json(rows[0]);
            }
            case 'update': {
                const { id, fullName, username, role, password } = payload;
                if (!id) {
                    return NextResponse.json({ message: 'User ID is required for update' }, { status: 400 });
                }
                
                let result;
                if (password) {
                    const hashedPassword = await bcrypt.hash(password, 10);
                    result = await sql`
                        UPDATE users 
                        SET full_name = ${fullName}, username = ${username.toLowerCase()}, role = ${role}, password = ${hashedPassword}
                        WHERE id = ${id} 
                        RETURNING id, full_name, username, role;
                    `;
                } else {
                     result = await sql`
                        UPDATE users 
                        SET full_name = ${fullName}, username = ${username.toLowerCase()}, role = ${role}
                        WHERE id = ${id} 
                        RETURNING id, full_name, username, role;
                    `;
                }
                
                return NextResponse.json(result.rows[0]);
            }
            case 'delete': {
                const { id } = payload;
                 if (!id) {
                    return NextResponse.json({ message: 'User ID is required for deletion' }, { status: 400 });
                }
                await sql`DELETE FROM users WHERE id = ${id};`;
                return NextResponse.json({ message: 'User deleted successfully' });
            }
            default:
                return NextResponse.json({ message: `Unknown action: ${action}` }, { status: 400 });
        }
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
