import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);
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
            case 'update': {
                const { name, address, phone, email, vatNumber, logoUrl } = payload;
                 const { rows } = await sql`
                    UPDATE company_details
                    SET name = ${name}, address = ${address}, phone = ${phone}, email = ${email}, vat_number = ${vatNumber}, logo_url = ${logoUrl}
                    WHERE id = 1
                    RETURNING *;
                `;
                // Handle case where company_details might not exist yet
                if (rows.length === 0) {
                    const { rows: newRows } = await sql`
                        INSERT INTO company_details (id, name, address, phone, email, vat_number, logo_url)
                        VALUES (1, ${name}, ${address}, ${phone}, ${email}, ${vatNumber}, ${logoUrl})
                        RETURNING *;
                    `;
                    return jsonResponse(newRows[0]);
                }
                return jsonResponse(rows[0]);
            }
            default:
                return jsonResponse({ message: `Unknown action: ${action}` }, 400);
        }
    } catch (error: any) {
        return jsonResponse({ message: error.message }, 500);
    }
}