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
            case 'create': {
                const { entryCode, deliveryDate, whoDelivered, items } = payload;
                const { rows } = await sql`
                    INSERT INTO deliveries (entry_code, delivery_date, who_delivered, items)
                    VALUES (${entryCode}, ${deliveryDate}, ${whoDelivered}, ${JSON.stringify(items)})
                    RETURNING *;
                `;
                return NextResponse.json(rows[0]);
            }
            // Add update/delete for deliveries if needed later
            default:
                return NextResponse.json({ message: `Unknown action: ${action}` }, { status: 400 });
        }
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}