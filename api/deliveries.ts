import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);
import { verifyAuth } from './lib/auth.ts';

export const runtime = 'edge';

const jsonResponse = (data: any, status: number = 200) => new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
});

export default async function POST(req: Request) {
    const authResult = await verifyAuth(req);
    if (authResult.error) {
        return authResult.error;
    }

    try {
        const { action, payload } = await req.json();

        switch (action) {
            case 'create': {
                const { entryCode, deliveryDate, whoDelivered, items } = payload;
                const { rows } = await sql`
                    INSERT INTO deliveries (entry_code, delivery_date, who_delivered, items)
                    VALUES (${entryCode}, ${deliveryDate}, ${whoDelivered}, ${JSON.stringify(items)})
                    RETURNING *;
                `;
                return jsonResponse(rows[0]);
            }
            // Add update/delete for deliveries if needed later
            default:
                return jsonResponse({ message: `Unknown action: ${action}` }, 400);
        }
    } catch (error: any) {
        return jsonResponse({ message: error.message }, 500);
    }
}