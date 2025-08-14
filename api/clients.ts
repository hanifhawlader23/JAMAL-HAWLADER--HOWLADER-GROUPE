import { sql } from '@vercel/postgres';
import { verifyAuth } from './lib/auth.ts';
import { Role } from '../../types.ts';

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
                const { name, address, email, phone, vatNumber, logoUrl } = payload;
                const { rows } = await sql`
                    INSERT INTO clients (name, address, email, phone, vat_number, logo_url)
                    VALUES (${name}, ${address}, ${email}, ${phone}, ${vatNumber}, ${logoUrl})
                    RETURNING *;
                `;
                return jsonResponse(rows[0]);
            }
            case 'update': {
                const { id, name, address, email, phone, vatNumber, logoUrl } = payload;
                const { rows } = await sql`
                    UPDATE clients
                    SET name = ${name}, address = ${address}, email = ${email}, phone = ${phone}, vat_number = ${vatNumber}, logo_url = ${logoUrl}
                    WHERE id = ${id}
                    RETURNING *;
                `;
                return jsonResponse(rows[0]);
            }
            case 'delete': {
                const { id } = payload;
                await sql`DELETE FROM clients WHERE id = ${id};`;
                return jsonResponse({ message: 'Client deleted successfully' });
            }
            default:
                return jsonResponse({ message: `Unknown action: ${action}` }, 400);
        }
    } catch (error: any) {
        return jsonResponse({ message: error.message }, 500);
    }
}