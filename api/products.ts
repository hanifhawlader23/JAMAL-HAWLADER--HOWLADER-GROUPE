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
        
        const clientId = payload.clientId === '' ? null : payload.clientId;

        switch (action) {
            case 'create': {
                const { code, modelName, price, category, reference, description } = payload;
                const { rows } = await sql`
                    INSERT INTO products (code, model_name, price, category, reference, description, client_id)
                    VALUES (${code}, ${modelName}, ${price}, ${category}, ${reference}, ${description}, ${clientId})
                    RETURNING *;
                `;
                return NextResponse.json(rows[0]);
            }
            case 'update': {
                const { id, code, modelName, price, category, reference, description } = payload;
                const { rows } = await sql`
                    UPDATE products
                    SET code = ${code}, model_name = ${modelName}, price = ${price}, category = ${category}, reference = ${reference}, description = ${description}, client_id = ${clientId}
                    WHERE id = ${id}
                    RETURNING *;
                `;
                return NextResponse.json(rows[0]);
            }
            case 'delete': {
                const { id } = payload;
                await sql`DELETE FROM products WHERE id = ${id};`;
                return NextResponse.json({ message: 'Product deleted successfully' });
            }
            default:
                return NextResponse.json({ message: `Unknown action: ${action}` }, { status: 400 });
        }
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}