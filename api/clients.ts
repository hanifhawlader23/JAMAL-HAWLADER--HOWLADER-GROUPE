import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { verifyAuth } from './lib/auth.js';
import { Role } from '../../types';

export const runtime = 'edge';

export default async function POST(req: Request) {
    const authResult = await verifyAuth(req, [Role.ADMIN]);
    if (authResult.error) {
        return authResult.error;
    }

    try {
        const { action, payload } = await req.json();

        switch (action) {
            case 'create': {
                const { name, address, email, phone, vatNumber, logoUrl } = payload;
                const { rows } = await sql`
                    INSERT INTO clients (name, address, email, phone, vat_number, logo_url)
                    VALUES (${name}, ${address}, ${email}, ${phone}, ${vatNumber}, ${logoUrl})
                    RETURNING *;
                `;
                return NextResponse.json(rows[0]);
            }
            case 'update': {
                const { id, name, address, email, phone, vatNumber, logoUrl } = payload;
                const { rows } = await sql`
                    UPDATE clients
                    SET name = ${name}, address = ${address}, email = ${email}, phone = ${phone}, vat_number = ${vatNumber}, logo_url = ${logoUrl}
                    WHERE id = ${id}
                    RETURNING *;
                `;
                return NextResponse.json(rows[0]);
            }
            case 'delete': {
                const { id } = payload;
                await sql`DELETE FROM clients WHERE id = ${id};`;
                return NextResponse.json({ message: 'Client deleted successfully' });
            }
            default:
                return NextResponse.json({ message: `Unknown action: ${action}` }, { status: 400 });
        }
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}