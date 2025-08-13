import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

async function checkAuth(req: Request) { return true; }

export default async function POST(req: Request) {
    if (!await checkAuth(req)) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
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
                    return NextResponse.json(newRows[0]);
                }
                return NextResponse.json(rows[0]);
            }
            default:
                return NextResponse.json({ message: `Unknown action: ${action}` }, { status: 400 });
        }
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}