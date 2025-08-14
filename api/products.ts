import { sql } from '@vercel/postgres';
import { verifyAuth } from './lib/auth';
import { Role } from '../../types';

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
        
        const clientId = payload.clientId === '' ? null : payload.clientId;

        switch (action) {
            case 'create': {
                const { code, modelName, price, category, reference, description } = payload;
                const { rows } = await sql`
                    INSERT INTO products (code, model_name, price, category, reference, description, client_id)
                    VALUES (${code}, ${modelName}, ${price}, ${category}, ${reference}, ${description}, ${clientId})
                    RETURNING *;
                `;
                return jsonResponse(rows[0]);
            }
            case 'update': {
                const { id, code, modelName, price, category, reference, description } = payload;
                const { rows } = await sql`
                    UPDATE products
                    SET code = ${code}, model_name = ${modelName}, price = ${price}, category = ${category}, reference = ${reference}, description = ${description}, client_id = ${clientId}
                    WHERE id = ${id}
                    RETURNING *;
                `;
                return jsonResponse(rows[0]);
            }
            case 'delete': {
                const { id } = payload;
                await sql`DELETE FROM products WHERE id = ${id};`;
                return jsonResponse({ message: 'Product deleted successfully' });
            }
            default:
                return jsonResponse({ message: `Unknown action: ${action}` }, 400);
        }
    } catch (error: any) {
        return jsonResponse({ message: error.message }, 500);
    }
}