import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);
import bcrypt from 'bcryptjs';
import { Role } from '../../types.ts';
import { verifyAuth } from './lib/auth.ts';

export const runtime = 'edge';

const jsonResponse = (data: any, status: number = 200) => new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
});

export default async function POST(req: Request) {
    const authResult = await verifyAuth(req, [Role.ADMIN]);
    if (authResult.error) {
        return authResult.error;
    }

    try {
        const { action, payload } = await req.json();

        switch (action) {
            case 'create': {
                const { fullName, username, password, role } = payload;
                if (!fullName || !username || !password || !role) {
                    return jsonResponse({ message: 'Missing required fields for user creation' }, 400);
                }
                const hashedPassword = await bcrypt.hash(password, 10);
                const { rows } = await sql`
                    INSERT INTO users (full_name, username, password, role)
                    VALUES (${fullName}, ${username.toLowerCase()}, ${hashedPassword}, ${role})
                    RETURNING id, full_name, username, role;
                `;
                return jsonResponse(rows[0]);
            }
            case 'update': {
                const { id, fullName, username, role, password } = payload;
                if (!id) {
                    return jsonResponse({ message: 'User ID is required for update' }, 400);
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
                
                return jsonResponse(result.rows[0]);
            }
            case 'delete': {
                const { id } = payload;
                 if (!id) {
                    return jsonResponse({ message: 'User ID is required for deletion' }, 400);
                }
                await sql`DELETE FROM users WHERE id = ${id};`;
                return jsonResponse({ message: 'User deleted successfully' });
            }
            default:
                return jsonResponse({ message: `Unknown action: ${action}` }, 400);
        }
    } catch (error: any) {
        return jsonResponse({ message: error.message }, 500);
    }
}